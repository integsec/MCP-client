import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { Transport } from "./base";
import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
  ProxyConfig,
  AuthConfig,
  CertificateConfig,
} from "../types";

interface SSEEvent {
  id?: string;
  event?: string;
  data: string;
}

export class SSETransport extends Transport {
  private agent?: http.Agent | https.Agent;
  private isHttps: boolean;
  private authHeaders: Record<string, string> = {};
  private customHeaders: Record<string, string> = {};
  private sseStream?: http.IncomingMessage;
  private lastEventId?: string;
  private reconnecting = false;
  private endpoint: string;

  constructor(
    private url: string,
    private proxyConfig?: ProxyConfig,
    private authConfig?: AuthConfig,
    private certificateConfig?: CertificateConfig,
    customHeaders?: Record<string, string>,
  ) {
    super();
    this.isHttps = url.startsWith("https://");
    this.customHeaders = customHeaders || {};

    // Extract endpoint path from URL
    const urlObj = new URL(this.url);
    this.endpoint = urlObj.pathname + urlObj.search;

    this.setupAuthHeaders();
    this.setupAgent();
  }

  private setupAuthHeaders(): void {
    if (!this.authConfig) {
      return;
    }

    switch (this.authConfig.type) {
      case "bearer":
        if (this.authConfig.token) {
          this.authHeaders["Authorization"] = `Bearer ${this.authConfig.token}`;
        }
        break;
      case "basic":
        if (this.authConfig.username && this.authConfig.password) {
          const credentials = Buffer.from(
            `${this.authConfig.username}:${this.authConfig.password}`,
          ).toString("base64");
          this.authHeaders["Authorization"] = `Basic ${credentials}`;
        }
        break;
      case "custom":
        if (this.authConfig.headers) {
          this.authHeaders = {
            ...this.authHeaders,
            ...this.authConfig.headers,
          };
        }
        break;
    }
  }

  private setupAgent(): void {
    const agentOptions: https.AgentOptions = {};

    if (this.certificateConfig) {
      if (this.certificateConfig.cert) {
        agentOptions.cert = fs.readFileSync(this.certificateConfig.cert);
      }
      if (this.certificateConfig.key) {
        agentOptions.key = fs.readFileSync(this.certificateConfig.key);
      }
      if (this.certificateConfig.ca) {
        agentOptions.ca = fs.readFileSync(this.certificateConfig.ca);
      }
      if (this.certificateConfig.passphrase) {
        agentOptions.passphrase = this.certificateConfig.passphrase;
      }
      if (this.certificateConfig.rejectUnauthorized !== undefined) {
        agentOptions.rejectUnauthorized =
          this.certificateConfig.rejectUnauthorized;
      }
    }

    if (!this.proxyConfig) {
      if (Object.keys(agentOptions).length > 0 && this.isHttps) {
        this.agent = new https.Agent(agentOptions);
      }
      return;
    }

    const proxyAuth = this.proxyConfig.auth
      ? `${this.proxyConfig.auth.username}:${this.proxyConfig.auth.password}@`
      : "";

    const proxyProtocol = this.proxyConfig.protocol || "http";

    if (proxyProtocol === "socks" || proxyProtocol === "socks5") {
      const proxyUrl = `socks5://${proxyAuth}${this.proxyConfig.host}:${this.proxyConfig.port}`;
      this.agent = new SocksProxyAgent(proxyUrl, agentOptions);
    } else {
      const proxyUrl = `${proxyProtocol}://${proxyAuth}${this.proxyConfig.host}:${this.proxyConfig.port}`;
      if (this.isHttps) {
        this.agent = new HttpsProxyAgent(proxyUrl, agentOptions);
      } else {
        this.agent = new HttpProxyAgent(
          proxyUrl,
          agentOptions as http.AgentOptions,
        );
      }
    }
  }

  async connect(): Promise<void> {
    // Open SSE stream with GET request
    await this.openSSEStream();
    this.emit("connected");
  }

  private async openSSEStream(): Promise<void> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(this.url);
      const httpModule = this.isHttps ? https : http;

      const headers: Record<string, string> = {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
        ...this.customHeaders,
        ...this.authHeaders,
      };

      // Include Last-Event-ID for session resumption
      if (this.lastEventId) {
        headers["Last-Event-ID"] = this.lastEventId;
      }

      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (this.isHttps ? 443 : 80),
        path: this.endpoint,
        method: "GET",
        headers,
        agent: this.agent,
      };

      const req = httpModule.request(options, (res) => {
        if (res.statusCode !== 200) {
          const error = new Error(
            `SSE connection failed: HTTP ${res.statusCode} ${res.statusMessage}`,
          );
          reject(error);
          return;
        }

        this.sseStream = res;

        let buffer = "";

        res.on("data", (chunk) => {
          buffer += chunk.toString();

          // Process complete SSE events (separated by double newline)
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // Keep incomplete event in buffer

          for (const eventText of lines) {
            if (eventText.trim()) {
              this.handleSSEEvent(eventText);
            }
          }
        });

        res.on("end", () => {
          this.emit("disconnected");
          // Auto-reconnect if not intentionally disconnected
          if (!this.reconnecting) {
            this.reconnecting = true;
            setTimeout(() => {
              this.reconnecting = false;
              this.openSSEStream().catch((error) => {
                this.emit("error", error);
              });
            }, 1000);
          }
        });

        res.on("error", (error) => {
          this.emit("error", error);
          reject(error);
        });

        resolve();
      });

      req.on("error", (error) => {
        this.emit("error", error);
        reject(error);
      });

      req.end();
    });
  }

  private handleSSEEvent(eventText: string): void {
    const event: SSEEvent = { data: "" };
    const lines = eventText.split("\n");

    for (const line of lines) {
      if (line.startsWith("id:")) {
        event.id = line.substring(3).trim();
      } else if (line.startsWith("event:")) {
        event.event = line.substring(6).trim();
      } else if (line.startsWith("data:")) {
        event.data += line.substring(5).trim();
      }
    }

    // Store last event ID for reconnection
    if (event.id) {
      this.lastEventId = event.id;
    }

    // Parse JSON data
    if (event.data) {
      try {
        const message = JSON.parse(event.data);
        this.emit("receive", message);

        // Handle different message types
        if ("result" in message || "error" in message) {
          this.handleResponse(message as JsonRpcResponse);
        } else if ("method" in message && !("id" in message)) {
          this.handleNotification(message as JsonRpcNotification);
        } else if ("method" in message && "id" in message) {
          // Server request
          this.emit("request", message);
        }
      } catch (error) {
        // Silently ignore non-JSON SSE data (comments, heartbeats, etc.)
        // Only log if debugging is enabled
      }
    }
  }

  async disconnect(): Promise<void> {
    this.reconnecting = true; // Prevent auto-reconnect
    if (this.sseStream) {
      this.sseStream.destroy();
      this.sseStream = undefined;
    }
    if (this.agent) {
      this.agent.destroy();
    }
  }

  async send(data: JsonRpcRequest | JsonRpcNotification): Promise<void> {
    const payload = JSON.stringify(data);
    this.emit("send", data);

    return new Promise((resolve, reject) => {
      const urlObj = new URL(this.url);
      const httpModule = this.isHttps ? https : http;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload).toString(),
        Accept: "application/json, text/event-stream",
        ...this.customHeaders,
        ...this.authHeaders,
      };

      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (this.isHttps ? 443 : 80),
        path: this.endpoint,
        method: "POST",
        headers,
        agent: this.agent,
      };

      const req = httpModule.request(options, (res) => {
        const contentType = res.headers["content-type"] || "";

        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          try {
            // Handle SSE response
            if (contentType.includes("text/event-stream")) {
              // SSE response - events will be handled by the stream
              // Just resolve the promise
              resolve();
              return;
            }

            // Handle JSON response
            if (contentType.includes("application/json")) {
              if (!responseData.trim()) {
                resolve();
                return;
              }

              const response = JSON.parse(responseData);
              this.emit("receive", response);

              if ("result" in response || "error" in response) {
                this.handleResponse(response as JsonRpcResponse);
              } else if ("method" in response && !("id" in response)) {
                this.handleNotification(response as JsonRpcNotification);
              }

              resolve();
              return;
            }

            // No response or empty response
            if (!responseData.trim()) {
              resolve();
              return;
            }

            // Handle text/plain - try to parse as JSON first, otherwise accept as-is
            if (contentType.includes("text/plain")) {
              try {
                const response = JSON.parse(responseData);
                this.emit("receive", response);

                if ("result" in response || "error" in response) {
                  this.handleResponse(response as JsonRpcResponse);
                } else if ("method" in response && !("id" in response)) {
                  this.handleNotification(response as JsonRpcNotification);
                }
              } catch {
                // Plain text response, not JSON - just accept it
              }
              resolve();
              return;
            }

            // Unexpected response type
            reject(new Error(`Unexpected content type: ${contentType}`));
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            reject(
              new Error(`Failed to process SSE response: ${errorMessage}`),
            );
          }
        });
      });

      req.on("error", (error) => {
        this.emit("error", error);
        reject(error);
      });

      req.write(payload);
      req.end();
    });
  }
}

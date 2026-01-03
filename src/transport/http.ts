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

export class HttpTransport extends Transport {
  private agent?: http.Agent | https.Agent;
  private isHttps: boolean;
  private authHeaders: Record<string, string> = {};
  private customHeaders: Record<string, string> = {};
  private cookies: Map<string, string> = new Map();

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
    // HTTP transport doesn't need explicit connection
    this.emit("connected");
  }

  async disconnect(): Promise<void> {
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

      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (this.isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...this.customHeaders,
          ...this.authHeaders,
          ...(this.cookies.size > 0
            ? {
                Cookie: Array.from(this.cookies.entries())
                  .map(([k, v]) => `${k}=${v}`)
                  .join("; "),
              }
            : {}),
        },
        agent: this.agent,
      };

      const req = httpModule.request(options, (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          try {
            // Extract cookies from response headers
            const setCookieHeaders = res.headers["set-cookie"];
            if (setCookieHeaders) {
              for (const cookieHeader of Array.isArray(setCookieHeaders)
                ? setCookieHeaders
                : [setCookieHeaders]) {
                // Parse cookie (simple version - just get name=value)
                const cookieMatch = cookieHeader.match(/^([^=]+)=([^;]+)/);
                if (cookieMatch) {
                  const cookieName = cookieMatch[1].trim();
                  const cookieValue = cookieMatch[2].trim();
                  this.cookies.set(cookieName, cookieValue);
                }
              }
            }

            // Check HTTP status code first
            if (res.statusCode && res.statusCode >= 400) {
              // HTTP error status - provide helpful error message
              const contentType = res.headers["content-type"] || "";
              const isJson = contentType.includes("application/json");

              let errorMessage = `HTTP ${res.statusCode} ${res.statusMessage || "Error"}`;

              if (responseData.trim()) {
                if (isJson) {
                  try {
                    const errorBody = JSON.parse(responseData);
                    if (errorBody.error || errorBody.message) {
                      errorMessage += `: ${errorBody.error || errorBody.message}`;
                    } else {
                      errorMessage += `: ${responseData.substring(0, 200)}`;
                    }
                  } catch {
                    errorMessage += `: ${responseData.substring(0, 200)}`;
                  }
                } else {
                  // Plain text error response
                  const textResponse = responseData.trim().substring(0, 200);
                  errorMessage += `: ${textResponse}`;

                  // Provide helpful hint for common errors
                  if (res.statusCode === 401) {
                    errorMessage +=
                      " (Authentication required - check your auth token/credentials)";
                  } else if (res.statusCode === 403) {
                    errorMessage += " (Forbidden - check your permissions)";
                  } else if (res.statusCode === 404) {
                    errorMessage += " (Not found - check the URL path)";
                  } else if (
                    res.statusCode === 400 &&
                    textResponse.toLowerCase().includes("sessionid")
                  ) {
                    errorMessage +=
                      "\n\nTip: The server requires a sessionid. This is typically provided by:";
                    errorMessage +=
                      "\n  1. A Set-Cookie header in a previous response (check cookies)";
                    errorMessage += "\n  2. A separate authentication endpoint";
                    errorMessage +=
                      '\n  3. As a custom header: --header "sessionid: VALUE"';
                    errorMessage +=
                      '\n  4. As a query parameter: --url "http://...?sessionid=VALUE"';

                    // Check if we have any cookies
                    if (this.cookies.size > 0) {
                      errorMessage += "\n\nCookies received from server:";
                      for (const [name, value] of this.cookies.entries()) {
                        errorMessage += `\n  ${name}=${value.substring(0, 20)}${value.length > 20 ? "..." : ""}`;
                      }
                    }
                  }
                }
              }

              const httpError = new Error(errorMessage);
              (httpError as any).statusCode = res.statusCode;
              this.emit("error", httpError);
              reject(httpError);
              return;
            }

            // If there's no response data, just resolve (for notifications)
            if (!responseData.trim()) {
              resolve();
              return;
            }

            // Try to parse as JSON
            const response = JSON.parse(responseData);
            this.emit("receive", response);

            if ("result" in response || "error" in response) {
              this.handleResponse(response as JsonRpcResponse);
            } else if ("method" in response && !("id" in response)) {
              this.handleNotification(response as JsonRpcNotification);
            }

            resolve();
          } catch (error) {
            // JSON parse error - provide better error message
            if (error instanceof SyntaxError && responseData.trim()) {
              const preview = responseData.trim().substring(0, 200);
              reject(
                new Error(
                  `Server returned non-JSON response (HTTP ${res.statusCode || "?"}): ${preview}${responseData.length > 200 ? "..." : ""}`,
                ),
              );
            } else {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              reject(
                new Error(`Failed to process HTTP response: ${errorMessage}`),
              );
            }
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

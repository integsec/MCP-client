import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Transport } from './base';
import { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification, ProxyConfig, AuthConfig, CertificateConfig } from '../types';

export class HttpTransport extends Transport {
  private agent?: http.Agent | https.Agent;
  private isHttps: boolean;
  private authHeaders: Record<string, string> = {};
  private customHeaders: Record<string, string> = {};

  constructor(
    private url: string,
    private proxyConfig?: ProxyConfig,
    private authConfig?: AuthConfig,
    private certificateConfig?: CertificateConfig,
    customHeaders?: Record<string, string>
  ) {
    super();
    this.isHttps = url.startsWith('https://');
    this.customHeaders = customHeaders || {};
    this.setupAuthHeaders();
    this.setupAgent();
  }

  private setupAuthHeaders(): void {
    if (!this.authConfig) {
      return;
    }

    switch (this.authConfig.type) {
      case 'bearer':
        if (this.authConfig.token) {
          this.authHeaders['Authorization'] = `Bearer ${this.authConfig.token}`;
        }
        break;
      case 'basic':
        if (this.authConfig.username && this.authConfig.password) {
          const credentials = Buffer.from(`${this.authConfig.username}:${this.authConfig.password}`).toString('base64');
          this.authHeaders['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'custom':
        if (this.authConfig.headers) {
          this.authHeaders = { ...this.authHeaders, ...this.authConfig.headers };
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
        agentOptions.rejectUnauthorized = this.certificateConfig.rejectUnauthorized;
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
      : '';

    const proxyProtocol = this.proxyConfig.protocol || 'http';

    if (proxyProtocol === 'socks' || proxyProtocol === 'socks5') {
      const proxyUrl = `socks5://${proxyAuth}${this.proxyConfig.host}:${this.proxyConfig.port}`;
      this.agent = new SocksProxyAgent(proxyUrl, agentOptions);
    } else {
      const proxyUrl = `${proxyProtocol}://${proxyAuth}${this.proxyConfig.host}:${this.proxyConfig.port}`;
      if (this.isHttps) {
        this.agent = new HttpsProxyAgent(proxyUrl, agentOptions);
      } else {
        this.agent = new HttpProxyAgent(proxyUrl, agentOptions as http.AgentOptions);
      }
    }
  }

  async connect(): Promise<void> {
    // HTTP transport doesn't need explicit connection
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    if (this.agent) {
      this.agent.destroy();
    }
  }

  async send(data: JsonRpcRequest | JsonRpcNotification): Promise<void> {
    const payload = JSON.stringify(data);
    this.emit('send', data);

    return new Promise((resolve, reject) => {
      const urlObj = new URL(this.url);
      const httpModule = this.isHttps ? https : http;

      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (this.isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...this.customHeaders,
          ...this.authHeaders,
        },
        agent: this.agent,
      };

      const req = httpModule.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            // If there's no response data, just resolve (for notifications)
            if (!responseData.trim()) {
              resolve();
              return;
            }

            const response = JSON.parse(responseData);
            this.emit('receive', response);

            if ('result' in response || 'error' in response) {
              this.handleResponse(response as JsonRpcResponse);
            } else if ('method' in response && !('id' in response)) {
              this.handleNotification(response as JsonRpcNotification);
            }

            resolve();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            reject(new Error(`Failed to process HTTP response: ${errorMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });

      req.write(payload);
      req.end();
    });
  }
}

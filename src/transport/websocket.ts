import WebSocket from 'ws';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Transport } from './base';
import { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification, ProxyConfig } from '../types';

export class WebSocketTransport extends Transport {
  private ws?: WebSocket;
  private agent?: any;

  constructor(
    private url: string,
    private proxyConfig?: ProxyConfig
  ) {
    super();
    this.setupAgent();
  }

  private setupAgent(): void {
    if (!this.proxyConfig) {
      return;
    }

    const proxyAuth = this.proxyConfig.auth
      ? `${this.proxyConfig.auth.username}:${this.proxyConfig.auth.password}@`
      : '';

    const proxyProtocol = this.proxyConfig.protocol || 'http';

    if (proxyProtocol === 'socks' || proxyProtocol === 'socks5') {
      const proxyUrl = `socks5://${proxyAuth}${this.proxyConfig.host}:${this.proxyConfig.port}`;
      this.agent = new SocksProxyAgent(proxyUrl);
    } else {
      const proxyUrl = `${proxyProtocol}://${proxyAuth}${this.proxyConfig.host}:${this.proxyConfig.port}`;
      const isSecure = this.url.startsWith('wss://');
      if (isSecure) {
        this.agent = new HttpsProxyAgent(proxyUrl);
      } else {
        this.agent = new HttpProxyAgent(proxyUrl);
      }
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: WebSocket.ClientOptions = {};

      if (this.agent) {
        options.agent = this.agent;
      }

      this.ws = new WebSocket(this.url, options);

      this.ws.on('open', () => {
        this.emit('connected');
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });

      this.ws.on('close', () => {
        this.emit('disconnected');
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  async send(data: JsonRpcRequest | JsonRpcNotification): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message = JSON.stringify(data);
    this.emit('send', data);

    return new Promise((resolve, reject) => {
      this.ws!.send(message, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      this.emit('receive', message);

      if ('result' in message || 'error' in message) {
        this.handleResponse(message as JsonRpcResponse);
      } else if ('method' in message && !('id' in message)) {
        this.handleNotification(message as JsonRpcNotification);
      } else if ('method' in message && 'id' in message) {
        // This is a request from the server
        this.emit('request', message);
      }
    } catch (error) {
      this.emit('error', new Error(`Failed to parse WebSocket message: ${data}`));
    }
  }
}

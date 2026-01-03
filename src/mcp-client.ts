import { EventEmitter } from 'events';
import { Transport } from './transport/base';
import { StdioTransport } from './transport/stdio';
import { HttpTransport } from './transport/http';
import { WebSocketTransport } from './transport/websocket';
import { SSETransport } from './transport/sse';
import {
  TransportConfig,
  MCPInitializeResult,
  MCPTool,
  MCPResource,
  MCPPrompt,
  TrafficLog,
  MCPClientState,
} from './types';

export class MCPClient extends EventEmitter {
  private transport?: Transport;
  private state: MCPClientState = {
    connected: false,
    tools: [],
    resources: [],
    prompts: [],
    trafficLog: [],
  };

  constructor(private config: TransportConfig) {
    super();
  }

  async connect(): Promise<void> {
    // Create appropriate transport
    switch (this.config.type) {
      case 'stdio':
        if (!this.config.command) {
          throw new Error('Command required for stdio transport');
        }
        this.transport = new StdioTransport(
          this.config.command,
          this.config.args || [],
          this.config.env || {}
        );
        break;

      case 'http':
      case 'https':
        if (!this.config.url) {
          throw new Error('URL required for HTTP transport');
        }
        this.transport = new HttpTransport(
          this.config.url,
          this.config.proxy,
          this.config.auth,
          this.config.certificate,
          this.config.headers
        );
        break;

      case 'ws':
      case 'wss':
        if (!this.config.url) {
          throw new Error('URL required for WebSocket transport');
        }
        this.transport = new WebSocketTransport(
          this.config.url,
          this.config.proxy,
          this.config.auth,
          this.config.certificate,
          this.config.headers
        );
        break;

      case 'sse':
        if (!this.config.url) {
          throw new Error('URL required for SSE transport');
        }
        this.transport = new SSETransport(
          this.config.url,
          this.config.proxy,
          this.config.auth,
          this.config.certificate,
          this.config.headers
        );
        break;

      default:
        throw new Error(`Unsupported transport type: ${this.config.type}`);
    }

    // Set up event handlers
    this.transport.on('send', (data) => {
      this.logTraffic('sent', data);
      this.emit('traffic', { direction: 'sent', data });
    });

    this.transport.on('receive', (data) => {
      this.logTraffic('received', data);
      this.emit('traffic', { direction: 'received', data });
    });

    this.transport.on('error', (error) => {
      this.emit('error', error);
    });

    this.transport.on('notification', (notification) => {
      this.emit('notification', notification);
    });

    // Connect transport
    await this.transport.connect();

    // Initialize MCP protocol
    const result = await this.initialize();
    this.state.connected = true;
    this.state.serverInfo = result.serverInfo;
    this.state.capabilities = result.capabilities;

    this.emit('connected', result);

    // Fetch initial data
    await this.refreshAll();
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.disconnect();
      this.state.connected = false;
      this.emit('disconnected');
    }
  }

  private async initialize(): Promise<MCPInitializeResult> {
    const result = await this.transport!.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: {
          listChanged: true,
        },
        sampling: {},
      },
      clientInfo: {
        name: 'mcp-pentester-cli',
        version: '1.0.0',
      },
    });

    // Send initialized notification
    await this.transport!.notify('notifications/initialized');

    return result;
  }

  async listTools(): Promise<MCPTool[]> {
    try {
      const result = await this.transport!.request('tools/list');
      this.state.tools = result.tools || [];
      return this.state.tools;
    } catch (error: any) {
      // If method not supported, return empty array silently
      if (error?.message?.includes('not a function') || error?.message?.includes('not found') || error?.code === -32601) {
        this.state.tools = [];
        return [];
      }
      throw error;
    }
  }

  async callTool(name: string, args: any = {}): Promise<any> {
    return await this.transport!.request('tools/call', {
      name,
      arguments: args,
    });
  }

  async listResources(): Promise<MCPResource[]> {
    try {
      const result = await this.transport!.request('resources/list');
      this.state.resources = result.resources || [];
      return this.state.resources;
    } catch (error: any) {
      // If method not supported, return empty array silently
      if (error?.message?.includes('not a function') || error?.message?.includes('not found') || error?.code === -32601) {
        this.state.resources = [];
        return [];
      }
      throw error;
    }
  }

  async readResource(uri: string): Promise<any> {
    return await this.transport!.request('resources/read', { uri });
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    try {
      const result = await this.transport!.request('prompts/list');
      this.state.prompts = result.prompts || [];
      return this.state.prompts;
    } catch (error: any) {
      // If method not supported, return empty array silently
      if (error?.message?.includes('not a function') || error?.message?.includes('not found') || error?.code === -32601) {
        this.state.prompts = [];
        return [];
      }
      throw error;
    }
  }

  async getPrompt(name: string, args: any = {}): Promise<any> {
    return await this.transport!.request('prompts/get', {
      name,
      arguments: args,
    });
  }

  async refreshAll(): Promise<void> {
    try {
      // Always try to fetch all lists - servers should return errors if not supported
      const promises: Promise<any>[] = [
        this.listTools().catch(() => []),
        this.listResources().catch(() => []),
        this.listPrompts().catch(() => []),
      ];

      await Promise.all(promises);
    } catch (error) {
      // Ignore errors during refresh
    }
  }

  getState(): MCPClientState {
    return { ...this.state };
  }

  getTrafficLog(): TrafficLog[] {
    return [...this.state.trafficLog];
  }

  clearTrafficLog(): void {
    this.state.trafficLog = [];
  }

  private logTraffic(direction: 'sent' | 'received', data: any): void {
    this.state.trafficLog.push({
      timestamp: new Date(),
      direction,
      transport: this.config.type,
      data,
      raw: JSON.stringify(data, null, 2),
    });

    // Keep only last 1000 entries
    if (this.state.trafficLog.length > 1000) {
      this.state.trafficLog = this.state.trafficLog.slice(-1000);
    }
  }
}

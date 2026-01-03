// JSON-RPC 2.0 types
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
  id?: string | number;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: JsonRpcError;
  id: string | number | null;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: any;
}

// MCP Protocol types
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {};
}

export interface MCPImplementation {
  name: string;
  version: string;
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: MCPImplementation;
}

// Transport types
export type TransportType = "stdio" | "http" | "https" | "ws" | "wss";

export type AuthType = "bearer" | "basic" | "custom";

export interface AuthConfig {
  type: AuthType;
  token?: string;
  username?: string;
  password?: string;
  headers?: Record<string, string>;
}

export interface CertificateConfig {
  cert?: string;
  key?: string;
  ca?: string;
  passphrase?: string;
  rejectUnauthorized?: boolean;
}

export interface TransportConfig {
  type: TransportType;
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  proxy?: ProxyConfig;
  auth?: AuthConfig;
  certificate?: CertificateConfig;
  headers?: Record<string, string>;
}

export interface ProxyConfig {
  host: string;
  port: number;
  protocol?: "http" | "https" | "socks" | "socks5";
  auth?: {
    username: string;
    password: string;
  };
}

// Traffic logging
export interface TrafficLog {
  timestamp: Date;
  direction: "sent" | "received";
  transport: TransportType;
  data: JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;
  raw?: string;
}

// Application state
export interface MCPClientState {
  connected: boolean;
  serverInfo?: MCPImplementation;
  capabilities?: MCPServerCapabilities;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  trafficLog: TrafficLog[];
}

# Architecture Documentation

## Overview

The MCP Pentester CLI is a modular TypeScript application designed for security testing of Model Context Protocol (MCP) servers. It provides multiple transport mechanisms, proxy support, and an interactive terminal interface.

## Project Structure

```
MCP-client/
├── src/
│   ├── index.ts              # CLI entry point and command parser
│   ├── types.ts              # TypeScript type definitions
│   ├── mcp-client.ts         # Main MCP client implementation
│   ├── transport/
│   │   ├── base.ts          # Abstract transport class
│   │   ├── stdio.ts         # Process communication transport
│   │   ├── http.ts          # HTTP/HTTPS transport
│   │   └── websocket.ts     # WebSocket transport
│   └── ui/
│       └── tui.ts           # Terminal user interface
├── examples/                 # Example configuration files
├── dist/                     # Compiled JavaScript output
└── package.json
```

## Core Components

### 1. Transport Layer (`src/transport/`)

The transport layer provides an abstraction for different communication protocols.

#### Base Transport (`base.ts`)

- Abstract class defining the transport interface
- Implements JSON-RPC 2.0 request/response handling
- Manages pending requests with timeout handling
- Provides event emitters for connection events

Key methods:
- `connect()`: Establish connection
- `disconnect()`: Close connection
- `request(method, params)`: Send JSON-RPC request
- `notify(method, params)`: Send JSON-RPC notification

#### Stdio Transport (`stdio.ts`)

- Spawns a child process and communicates via stdin/stdout
- Buffers incoming data and parses JSON line-by-line
- Handles process lifecycle events

Use case: Testing local MCP servers

#### HTTP Transport (`http.ts`)

- Uses Node.js http/https modules
- Supports HTTP and HTTPS proxies via http-proxy-agent
- Supports SOCKS proxies via socks-proxy-agent
- Each request creates a new HTTP connection

Use case: Testing HTTP-based MCP servers, proxying through Burp Suite

#### WebSocket Transport (`websocket.ts`)

- Uses the 'ws' library for WebSocket connections
- Maintains persistent connection
- Supports WebSocket proxies
- Handles reconnection scenarios

Use case: Testing WebSocket-based MCP servers, real-time communication

### 2. MCP Client (`mcp-client.ts`)

The main client that implements the MCP protocol.

Key features:
- Protocol initialization and capability negotiation
- Tool listing and execution
- Resource browsing and reading
- Prompt management
- Traffic logging
- Event emission for UI updates

MCP Protocol Methods Implemented:
- `initialize`: Handshake with server
- `tools/list`: Get available tools
- `tools/call`: Execute a tool
- `resources/list`: Get available resources
- `resources/read`: Read a resource
- `prompts/list`: Get available prompts
- `prompts/get`: Get a prompt template

### 3. Terminal UI (`ui/tui.ts`)

Interactive console interface built with the blessed library.

Layout:
```
┌─────────────┬──────────────────────────────┐
│  Sidebar    │      Main Content            │
│             │                              │
│ - Tools     │  (Selected view content)     │
│ - Resources │                              │
│ - Prompts   │                              │
│ - Traffic   │                              │
├─────────────┴──────────────────────────────┤
│  Status Bar                                │
├────────────────────────────────────────────┤
│  Traffic Log (real-time)                   │
└────────────────────────────────────────────┘
```

Features:
- Real-time traffic monitoring
- Interactive navigation
- Keyboard shortcuts
- Scrollable content areas
- Color-coded output

### 4. CLI Interface (`index.ts`)

Commander.js-based CLI with two main commands:

1. `connect`: Connect to an MCP server
   - Transport selection
   - URL/command configuration
   - Proxy settings
   - Config file support

2. `gen-config`: Generate example configuration files

## Data Flow

```
User Input (CLI)
    ↓
Command Parser (commander)
    ↓
MCP Client
    ↓
Transport Layer → [Proxy] → MCP Server
    ↑                            ↓
    └────────────────────────────┘
    ↓
Event Emission
    ↓
TUI Update
```

## Proxy Support

All transports support proxy configuration:

### HTTP/HTTPS Proxy
- Used for HTTP/WebSocket transports
- Supports basic authentication
- Compatible with Burp Suite, ZAP, etc.

### SOCKS5 Proxy
- Used for any transport type
- Compatible with Tor, SSH tunnels
- No authentication currently (can be added)

Proxy flow:
```
Client → Proxy (e.g., Burp) → Target Server
              ↓
         Intercept/Modify
```

## Type System

All types are defined in `types.ts`:

### JSON-RPC Types
- `JsonRpcRequest`
- `JsonRpcResponse`
- `JsonRpcError`
- `JsonRpcNotification`

### MCP Protocol Types
- `MCPTool`
- `MCPResource`
- `MCPPrompt`
- `MCPServerCapabilities`
- `MCPInitializeResult`

### Transport Types
- `TransportType`
- `TransportConfig`
- `ProxyConfig`

### Application Types
- `TrafficLog`
- `MCPClientState`

## Configuration

Configuration can be provided via:

1. **Command-line arguments**
   ```bash
   --transport http --url http://... --proxy-host 127.0.0.1
   ```

2. **JSON configuration file**
   ```json
   {
     "type": "http",
     "url": "http://...",
     "proxy": { ... }
   }
   ```

## Event System

The application uses Node.js EventEmitter for communication:

### Transport Events
- `send`: JSON-RPC message sent
- `receive`: JSON-RPC message received
- `error`: Error occurred
- `notification`: Server notification received
- `connected`: Connection established
- `disconnected`: Connection closed

### Client Events
- `connected`: Client initialized
- `disconnected`: Client disconnected
- `traffic`: Traffic log entry
- `error`: Error occurred
- `notification`: MCP notification

### UI Event Handling
The TUI subscribes to client events and updates the display in real-time.

## Security Considerations

### For Pentesting
- All traffic can be proxied for inspection
- Raw JSON-RPC messages are logged
- Support for SSL/TLS interception via proxy
- SOCKS5 for anonymity (Tor)

### Code Security
- Input validation on configuration
- Timeout handling for requests
- Error handling for network failures
- No credential storage (proxy auth in config only)

## Extension Points

The architecture supports easy extension:

1. **New Transports**: Extend `Transport` base class
2. **New UI Views**: Add to TUI layout and navigation
3. **Protocol Extensions**: Add methods to `MCPClient`
4. **Custom Proxies**: Implement custom Agent classes

## Dependencies

### Runtime
- `blessed`: Terminal UI framework
- `commander`: CLI argument parsing
- `ws`: WebSocket client
- `http-proxy-agent`: HTTP proxy support
- `https-proxy-agent`: HTTPS proxy support
- `socks-proxy-agent`: SOCKS proxy support

### Development
- `typescript`: Type checking and compilation
- `@types/*`: Type definitions
- `ts-node`: Development mode execution

## Build Process

```bash
npm install    # Install dependencies
npm run build  # Compile TypeScript to dist/
npm start      # Run compiled version
```

The TypeScript compiler (`tsc`) generates:
- JavaScript files in `dist/`
- Type definition files (`.d.ts`)
- Source maps for debugging

## Future Enhancements

Potential improvements:
- Interactive tool execution with parameter prompts
- Request/response history export
- Custom JSON-RPC method support
- Automated fuzzing capabilities
- Session recording and replay
- Multiple server connections
- Plugin system for custom protocols

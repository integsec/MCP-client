# MCP Pentester CLI

A free, open-source interactive console tool for penetration testers to interact with Model Context Protocol (MCP) servers via JSON-RPC 2.0. Supports multiple transport protocols (stdio, HTTP/HTTPS, WebSocket) with full proxy support for tools like Burp Suite.

![My screenshot](client-screenshot.png)

**Copyright © 2025 IntegSec. All Rights Reserved.**

## Features

- **Multiple Transport Protocols**
  - stdio (process communication)
  - HTTP/HTTPS
  - WebSocket (ws/wss)

- **Authentication Support**
  - Bearer token authentication
  - HTTP Basic authentication
  - Custom header authentication
  - Client certificate (mTLS) support

- **Proxy Support**
  - HTTP/HTTPS proxies (Burp Suite, etc.)
  - SOCKS5 proxies (Tor, etc.)
  - Proxy authentication support

- **Interactive TUI**
  - Graphical console interface using blessed
  - Real-time traffic logging
  - Navigate tools, resources, and prompts
  - Execute MCP operations interactively

- **Traffic Inspection**
  - View all JSON-RPC requests and responses
  - Traffic logging for analysis
  - Compatible with HTTP intercepting proxies

- **Pentesting Features**
  - Redirect all traffic through Burp Suite or similar tools
  - Inspect and modify MCP protocol messages
  - Test server implementations
  - Analyze security of MCP servers

## Installation

### Install from npm

```bash
npm install -g @integsec/mcp-pentester-cli
```

<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
run_terminal_cmd

After installation, verify it works:

```bash
mcp-pentester-cli --version
```

Then use the `mcp-pentester-cli` command:

```bash
mcp-pentester-cli --help
mcp-pentester-cli connect --transport stdio --command "npx" --args "-y" "@modelcontextprotocol/server-filesystem" "/tmp"
```

### Install from source

```bash
npm install
npm run build
```

Or install globally from source:

```bash
npm install -g .
```

After global installation, use the `mcp-pentester-cli` command as shown above.

## Connection Management

### Automatic Connection Saving

When you successfully connect to an MCP server, the connection configuration is automatically saved to a `.mcp-connection.json` file in the current directory. This allows you to easily reconnect to the same server later without typing all the connection details again.

**Saved connection files:**

- Format: `{server-name}-{timestamp}.mcp-connection.json`
- Location: Current working directory
- Compatible with the `--config` command-line option

### Switching Between Saved Connections

Press **F6** in the TUI to view a list of all saved connections in the current directory. You can:

- Navigate the list with ↑/↓
- Press **Enter** to switch to a selected connection
- Press **F4** or **ESC** to close the connection list

The connection list shows:

- Server name
- Connection timestamp
- Sorted by most recent first

**Example:** If you've connected to multiple servers, you can quickly switch between them without restarting the application.

## Quick Start

### Connect to an MCP server via stdio

```bash
mcp-pentester-cli connect --transport stdio --command "npx" --args "-y" "@modelcontextprotocol/server-filesystem" "/tmp"
```

### Connect via HTTP through Burp Suite

```bash
mcp-pentester-cli connect --transport http --url "http://localhost:3000/mcp" --proxy-host 127.0.0.1 --proxy-port 8080
```

### Connect via WebSocket through SOCKS5 (Tor)

```bash
mcp-pentester-cli connect --transport wss --url "wss://api.example.com/mcp" --proxy-host 127.0.0.1 --proxy-port 9050 --proxy-protocol socks5
```

### Using Configuration Files

Generate example configs:

```bash
mcp-pentester-cli gen-config -o my-config.json
```

Connect using a config file:

```bash
mcp-pentester-cli connect --config examples/http-burp-config.json
```

## Usage

### Command Line Options

```
mcp-pentester-cli connect [options]

Options:
  -t, --transport <type>          Transport type: stdio, http, https, ws, wss (default: "stdio")
  -u, --url <url>                 URL for HTTP/WebSocket transports
  -c, --command <command>         Command for stdio transport
  -a, --args <args...>            Arguments for stdio command

  Authentication:
  --auth-type <type>              Authentication type: bearer, basic, custom
  --auth-token <token>            Bearer token for authentication
  --auth-user <username>          Username for basic authentication
  --auth-pass <password>          Password for basic authentication
  --header <header...>            Custom headers (format: "Key: Value")

  TLS/Certificates:
  --cert <path>                   Path to client certificate file
  --key <path>                    Path to client certificate key file
  --ca <path>                     Path to CA certificate file
  --cert-passphrase <passphrase>  Passphrase for encrypted certificate key
  --insecure                      Disable TLS certificate verification (dangerous)

  Proxy:
  --proxy-host <host>             Proxy server host
  --proxy-port <port>             Proxy server port
  --proxy-protocol <protocol>     Proxy protocol: http, https, socks, socks5
  --proxy-user <username>         Proxy username
  --proxy-pass <password>         Proxy password

  -f, --config <file>             Load configuration from JSON file
  -h, --help                      Display help for command
```

### Configuration File Format

```json
{
  "type": "https",
  "url": "https://api.example.com/mcp",
  "auth": {
    "type": "bearer",
    "token": "your-bearer-token"
  },
  "headers": {
    "X-Custom-Header": "value"
  },
  "certificate": {
    "cert": "/path/to/cert.pem",
    "key": "/path/to/key.pem",
    "ca": "/path/to/ca.pem"
  },
  "proxy": {
    "host": "127.0.0.1",
    "port": 8080,
    "protocol": "http",
    "auth": {
      "username": "pentester",
      "password": "changeme"
    }
  }
}
```

**Available configuration options:**

- `type` - Transport type: `stdio`, `http`, `https`, `ws`, `wss`
- `url` - Server URL (for HTTP/WebSocket transports)
- `command` - Command to execute (for stdio transport)
- `args` - Command arguments array (for stdio transport)
- `env` - Environment variables object (for stdio transport)
- `auth` - Authentication configuration:
  - `type` - Auth type: `bearer`, `basic`, or `custom`
  - `token` - Bearer token (for bearer auth)
  - `username`/`password` - Credentials (for basic auth)
  - `headers` - Custom auth headers object (for custom auth)
- `headers` - Custom HTTP headers object
- `certificate` - TLS certificate configuration:
  - `cert` - Path to client certificate
  - `key` - Path to client private key
  - `ca` - Path to CA certificate
  - `passphrase` - Key passphrase (optional)
  - `rejectUnauthorized` - Verify server certificate (default: true)
- `proxy` - Proxy configuration:
  - `host` - Proxy server hostname
  - `port` - Proxy server port
  - `protocol` - Proxy protocol: `http`, `https`, `socks`, `socks5`
  - `auth` - Proxy authentication (username/password)

### TUI Keyboard Shortcuts

**Function Keys:**

- **F1** - Focus navigation sidebar
- **F2** - Focus main content panel
- **F3** - Focus traffic log panel
- **F4** - Close popup window
- **F5** - Refresh current view
- **F6** - Show saved connections (switch between previously saved connections)
- **F10** - Quit application

**Navigation:**

- **↑/↓** (Up/Down Arrows) - Navigate through lists
- **Enter** - Execute selected item (call tool, read resource, use prompt, view traffic details)

**Traffic Log:**

- Most recent entries appear at the top
- Shows detailed information: timestamps, tool names, parameters, URIs
- Press Enter on any entry to see full request/response pair side-by-side

### Navigation Menu

1. **Tools** - View and execute available MCP tools
2. **Resources** - Browse and read MCP resources
3. **Prompts** - View and use MCP prompts
4. **Traffic Log** - View detailed JSON-RPC traffic

## Example Configurations

### Bearer Token Authentication (e.g., Docker Gateway)

```json
{
  "type": "https",
  "url": "https://api.example.com/mcp",
  "auth": {
    "type": "bearer",
    "token": "juam4ckacyaedsxge6yt6pz1b0uq77a560x0t9f15bopsb3x7d"
  }
}
```

CLI equivalent:

```bash
mcp-pentester-cli connect --transport https --url "https://api.example.com/mcp" \
  --auth-type bearer --auth-token "juam4ckacyaedsxge6yt6pz1b0uq77a560x0t9f15bopsb3x7d"
```

### HTTP Basic Authentication

```json
{
  "type": "https",
  "url": "https://api.example.com/mcp",
  "auth": {
    "type": "basic",
    "username": "admin",
    "password": "secret"
  }
}
```

CLI equivalent:

```bash
mcp-pentester-cli connect --transport https --url "https://api.example.com/mcp" \
  --auth-type basic --auth-user admin --auth-pass secret
```

### Client Certificate Authentication (mTLS)

```json
{
  "type": "https",
  "url": "https://api.example.com/mcp",
  "certificate": {
    "cert": "/path/to/client-cert.pem",
    "key": "/path/to/client-key.pem",
    "ca": "/path/to/ca-cert.pem",
    "passphrase": "optional-key-passphrase",
    "rejectUnauthorized": true
  }
}
```

CLI equivalent:

```bash
mcp-pentester-cli connect --transport https --url "https://api.example.com/mcp" \
  --cert /path/to/client-cert.pem --key /path/to/client-key.pem \
  --ca /path/to/ca-cert.pem --cert-passphrase "optional-key-passphrase"
```

### Custom Headers

```json
{
  "type": "https",
  "url": "https://api.example.com/mcp",
  "headers": {
    "X-API-Key": "your-api-key-here",
    "X-Custom-Header": "custom-value"
  }
}
```

CLI equivalent:

```bash
mcp-pentester-cli connect --transport https --url "https://api.example.com/mcp" \
  --header "X-API-Key: your-api-key-here" --header "X-Custom-Header: custom-value"
```

### Bearer Auth + Proxy (Burp Suite)

```json
{
  "type": "https",
  "url": "https://api.example.com/mcp",
  "auth": {
    "type": "bearer",
    "token": "juam4ckacyaedsxge6yt6pz1b0uq77a560x0t9f15bopsb3x7d"
  },
  "proxy": {
    "host": "127.0.0.1",
    "port": 8080,
    "protocol": "http",
    "auth": {
      "username": "proxyuser",
      "password": "proxypass"
    }
  }
}
```

### Testing a Local MCP Server with Burp Suite

```json
{
  "type": "http",
  "url": "http://localhost:3000/mcp",
  "proxy": {
    "host": "127.0.0.1",
    "port": 8080,
    "protocol": "http"
  }
}
```

### Connecting to Remote MCP Server via Tor

```json
{
  "type": "wss",
  "url": "wss://api.example.onion/mcp",
  "proxy": {
    "host": "127.0.0.1",
    "port": 9050,
    "protocol": "socks5"
  }
}
```

### Local stdio Server

```json
{
  "type": "stdio",
  "command": "node",
  "args": ["./my-mcp-server.js"],
  "env": {
    "DEBUG": "true"
  }
}
```

## Pentesting Workflow

1. **Setup Burp Suite**
   - Configure Burp to listen on 127.0.0.1:8080
   - Disable SSL validation if testing with self-signed certs

2. **Launch MCP CLI with Proxy**

   ```bash
   mcp-pentester-cli connect --transport https --url "https://target.com/mcp" \
     --proxy-host 127.0.0.1 --proxy-port 8080
   ```

3. **Intercept Traffic**
   - All JSON-RPC requests will flow through Burp
   - Modify requests to test for vulnerabilities
   - Analyze responses for sensitive data

4. **Test MCP Operations**
   - Navigate to Tools in the TUI
   - Execute tools with crafted inputs
   - Monitor responses in Traffic Log

5. **Analyze Security**
   - Check for authentication bypass
   - Test input validation
   - Look for information disclosure
   - Verify proper error handling

## MCP Protocol Operations

The tool supports all standard MCP protocol operations:

- **initialize** - Establish connection with server
- **tools/list** - List available tools
- **tools/call** - Execute a tool with arguments
- **resources/list** - List available resources
- **resources/read** - Read resource content
- **prompts/list** - List available prompts
- **prompts/get** - Get a prompt with arguments

## Traffic Logging

All JSON-RPC traffic is logged in real-time:

- Timestamp for each message
- Direction (sent/received)
- Full JSON payload
- Method name for easy filtering

Traffic can be cleared at any time using the 'c' key in the traffic panel.

## Security Considerations

This tool is designed for authorized security testing only. Use responsibly:

- Only test systems you have permission to test
- Be aware that proxy configurations may expose credentials
- Traffic logs may contain sensitive information
- Follow responsible disclosure practices

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Project Structure

```
src/
├── index.ts              # CLI entry point
├── types.ts              # TypeScript type definitions
├── mcp-client.ts         # MCP protocol client
├── transport/
│   ├── base.ts          # Base transport abstraction
│   ├── stdio.ts         # stdio transport
│   ├── http.ts          # HTTP/HTTPS transport
│   └── websocket.ts     # WebSocket transport
└── ui/
    └── tui.ts           # Terminal UI
```

## Troubleshooting

### Connection Issues

- Verify the target server is running
- Check firewall settings
- Ensure proxy is configured correctly
- For stdio: verify command path and arguments

### Proxy Issues

- Test proxy connection with curl first
- Check proxy authentication credentials
- For SOCKS5: ensure you're using the correct protocol
- For Burp: verify invisible proxying is disabled

### TUI Display Issues

- Ensure terminal supports colors
- Try resizing the terminal window
- Check terminal emulator compatibility

## License

This software is free and open source. See the LICENSE file for full terms and conditions.

**Copyright © 2025 IntegSec. All Rights Reserved.** This software is provided free of charge, but all intellectual property rights are reserved by IntegSec.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Disclaimer

This tool is for educational and authorized security testing purposes only. The authors are not responsible for any misuse or damage caused by this tool.

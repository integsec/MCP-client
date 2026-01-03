# MCP Pentester CLI

**IntegSec Proprietary Security Tool**

An interactive console tool for penetration testers to interact with Model Context Protocol (MCP) servers via JSON-RPC 2.0. Supports multiple transport protocols (stdio, HTTP/HTTPS, WebSocket) with full proxy support for tools like Burp Suite.

![My screenshot](client-screenshot.png)

**Copyright © 2025 IntegSec. All Rights Reserved.**

## Features

- **Multiple Transport Protocols**
  - stdio (process communication)
  - HTTP/HTTPS
  - WebSocket (ws/wss)

- **Proxy Support**
  - HTTP/HTTPS proxies (Burp Suite, etc.)
  - SOCKS5 proxies (Tor, etc.)
  - Authentication support

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

```bash
npm install
npm run build
```

Or install globally:

```bash
npm install -g .
```

## Quick Start

### Connect to an MCP server via stdio

```bash
mcp-cli connect --transport stdio --command "npx" --args "-y" "@modelcontextprotocol/server-filesystem" "/tmp"
```

### Connect via HTTP through Burp Suite

```bash
mcp-cli connect --transport http --url "http://localhost:3000/mcp" --proxy-host 127.0.0.1 --proxy-port 8080
```

### Connect via WebSocket through SOCKS5 (Tor)

```bash
mcp-cli connect --transport wss --url "wss://api.example.com/mcp" --proxy-host 127.0.0.1 --proxy-port 9050 --proxy-protocol socks5
```

### Using Configuration Files

Generate example configs:

```bash
mcp-cli gen-config -o my-config.json
```

Connect using a config file:

```bash
mcp-cli connect --config examples/http-burp-config.json
```

## Usage

### Command Line Options

```
mcp-cli connect [options]

Options:
  -t, --transport <type>        Transport type: stdio, http, https, ws, wss (default: "stdio")
  -u, --url <url>               URL for HTTP/WebSocket transports
  -c, --command <command>       Command for stdio transport
  -a, --args <args...>          Arguments for stdio command
  --proxy-host <host>           Proxy server host
  --proxy-port <port>           Proxy server port
  --proxy-protocol <protocol>   Proxy protocol: http, https, socks, socks5
  --proxy-user <username>       Proxy username
  --proxy-pass <password>       Proxy password
  -f, --config <file>           Load configuration from JSON file
  -h, --help                    Display help for command
```

### Configuration File Format

```json
{
  "type": "https",
  "url": "https://api.example.com/mcp",
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

### TUI Keyboard Shortcuts

**Function Keys:**

- **F1** - Focus navigation sidebar
- **F2** - Focus main content panel
- **F3** - Focus traffic log panel
- **F4** - Close popup window
- **F5** - Refresh current view
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
   mcp-cli connect --transport https --url "https://target.com/mcp" \
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

This software is proprietary and confidential to IntegSec. See the LICENSE file for full terms and conditions.

**Commercial use requires a separate license agreement. Contact: licensing@integsec.com**

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Disclaimer

This tool is for educational and authorized security testing purposes only. The authors are not responsible for any misuse or damage caused by this tool.

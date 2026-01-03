# Quick Start Guide

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Test with a Local MCP Server

The easiest way to test is with the MCP filesystem server:

```bash
node dist/index.js connect \
  --transport stdio \
  --command npx \
  --args -y @modelcontextprotocol/server-filesystem /tmp
```

Or on Windows:

```cmd
node dist\index.js connect --transport stdio --command npx --args -y @modelcontextprotocol/server-filesystem C:\Temp
```

## Test with Burp Suite Proxy

### Step 1: Configure Burp Suite

1. Open Burp Suite
2. Go to Proxy > Options
3. Ensure proxy listener is running on 127.0.0.1:8080
4. If testing HTTPS, add the Burp CA certificate to your system

### Step 2: Create Config File

Create `burp-test.json`:

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

### Step 3: Launch with Proxy

```bash
node dist/index.js connect --config burp-test.json
```

All traffic will now flow through Burp Suite!

## Using the TUI

Once connected, you'll see an interactive interface:

```
┌─ Navigation ─────┐┌─ Content ──────────────────────────────────────────┐
│ Tools            ││                                                    │
│ Resources        ││ Available Tools:                                   │
│ Prompts          ││                                                    │
│ Traffic Log      ││ 1. read_file                                       │
└──────────────────┘│    Read file contents                              │
                    └────────────────────────────────────────────────────┘
┌─ Status ────────────────────────────────────────────────────────────────┐
│ Connected to filesystem v1.0.0                                          │
└─────────────────────────────────────────────────────────────────────────┘
┌─ Traffic Log ───────────────────────────────────────────────────────────┐
│ [19:20:30.123] >>> initialize                                           │
│ [19:20:30.456] <<< response                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Keyboard Controls

**Function Keys (IntegSec Standard):**
- **F1**: Focus navigation sidebar
- **F2**: Focus main content panel
- **F3**: Focus traffic log panel
- **F4**: Close popup/dialog
- **F5**: Refresh current view
- **F10**: Quit application

**Navigation:**
- **↑/↓**: Navigate through lists
- **Enter**: Execute selected item
  - In Tools: Execute the tool (will prompt for parameters)
  - In Resources: Read and display the resource
  - In Prompts: Use the prompt (will prompt for arguments)
  - In Traffic: View detailed request/response pair side-by-side

**Traffic Log Features:**
- **Most recent at top** - Latest traffic appears first
- **Detailed info** - Shows timestamps, tool names, parameters, URIs, errors
- **Request/Response pairing** - Press Enter to see full paired messages

### How to Use

1. **Navigate**: Press F1 for sidebar, use ↑/↓ to select a category
2. **Browse**: Press F2 for content area, use ↑/↓ to select an item
3. **Execute**: Press Enter to call a tool, read a resource, or use a prompt
4. **View Results**: Results appear in a popup - press F4 to close
5. **Monitor Traffic**: Press F3 to focus traffic - most recent at top with full details
6. **Analyze**: Select any traffic entry and press Enter to see request/response pair

## Example: Testing an HTTP MCP Server

If you have an HTTP-based MCP server running:

```bash
# Direct connection
node dist/index.js connect \
  --transport https \
  --url "https://api.example.com/mcp"

# Through Burp Suite
node dist/index.js connect \
  --transport https \
  --url "https://api.example.com/mcp" \
  --proxy-host 127.0.0.1 \
  --proxy-port 8080
```

## Example: Testing a WebSocket MCP Server

```bash
# Direct WebSocket connection
node dist/index.js connect \
  --transport wss \
  --url "wss://api.example.com/mcp"

# Through proxy with authentication
node dist/index.js connect \
  --transport wss \
  --url "wss://api.example.com/mcp" \
  --proxy-host 127.0.0.1 \
  --proxy-port 8080 \
  --proxy-user pentester \
  --proxy-pass mypassword
```

## Example: Using with Tor

```bash
# Start Tor (SOCKS5 proxy on 127.0.0.1:9050)

# Connect through Tor
node dist/index.js connect \
  --transport wss \
  --url "wss://api.example.onion/mcp" \
  --proxy-host 127.0.0.1 \
  --proxy-port 9050 \
  --proxy-protocol socks5
```

## Generating Example Configs

```bash
# Generate example configuration files
node dist/index.js gen-config -o examples.json

# Edit the file and extract the transport you want
# Then use it:
node dist/index.js connect --config my-config.json
```

## Troubleshooting

### "Command not found" error

Make sure you run from the project directory or install globally:

```bash
npm install -g .
mcp-pentester-cli connect --help
```

### Proxy not intercepting traffic

1. Verify Burp is listening on the correct port
2. Check firewall settings
3. For HTTPS/WSS, ensure SSL interception is configured
4. Try with HTTP first to verify proxy works

### Connection timeout

- Check that the target server is running
- Verify network connectivity
- Check proxy configuration
- Look at the traffic log for error messages

### Terminal display issues

- Ensure your terminal supports colors and Unicode
- Try resizing the terminal window
- Use a modern terminal emulator (Windows Terminal, iTerm2, etc.)

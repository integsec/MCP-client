# MCP Pentester CLI - Release Notes v1.0.0

**MCP Pentester CLI - Free and Open Source**
**Copyright © 2025 IntegSec. All Rights Reserved.**

## What's New

### Professional IntegSec Branding
- **Splash Screen**: Shows IntegSec logo and copyright on startup
  - Auto-closes after 2 seconds
  - Press any key to close immediately
- **Permanent Logo**: IntegSec branding visible in top-right corner
- **Free and Open Source**: Available under a permissive license with IP protection

### Enhanced Visual Experience

#### Active Panel Highlighting
- **Bold yellow border** shows which panel is currently active
- Always know where your keystrokes will go
- Press F1/F2/F3 to switch between panels instantly

#### Beautiful Popup Windows
- **Syntax-highlighted JSON** in all result displays
- **Larger windows** (90% width, 85% height) for better readability
- **Enhanced scrollbars** with visual indicators
- **Color-coded content**:
  - Property names: Cyan
  - String values: Green
  - Numbers: Yellow
  - Booleans/null: Magenta

### Intelligent Traffic Monitoring

#### Request/Response Pairing
Traffic log now shows requests and responses together:
```
[12:34:56.789] >>> tools/call tool=read_file args=path
[12:34:56.890] <<< {contents,encoding}
```

**Benefits:**
- No more scrolling to find matching messages
- See cause and effect immediately
- Most recent activity at the top

#### Rich Details
- **Tool calls**: Shows tool name and parameter names
- **Resource reads**: Shows full URI
- **Errors**: Highlighted in red with full message
- **Results**: Smart preview (object keys, array length, string excerpt)

### Professional Formatting

#### Smart JSON Display
- Auto-detects JSON strings and formats them
- Syntax highlighting for better readability
- Proper indentation
- Handles nested structures

#### Context-Aware Previews
- **Objects**: `{key1,key2,key3}`
- **Arrays**: `Array[5]`
- **Strings**: Truncated with ellipsis if too long
- **Primitives**: Direct display

## Key Features

### Function Key Navigation
- **F1** - Focus navigation sidebar
- **F2** - Focus main content panel
- **F3** - Focus traffic log panel
- **F4** - Close popup windows
- **F5** - Refresh current view
- **F10** - Quit application

### Transport Support
- **stdio** - Local process communication
- **HTTP/HTTPS** - Web-based MCP servers
- **WebSocket (ws/wss)** - Real-time connections

### Proxy Integration
- **HTTP/HTTPS proxies** - Burp Suite, ZAP, etc.
- **SOCKS5 proxies** - Tor, SSH tunnels
- **Authentication support** - Username/password

### Traffic Analysis
- Real-time monitoring
- Request/response pairing
- Full JSON inspection
- Syntax highlighting

## Installation

```bash
npm install
npm run build
```

## Quick Start

### Test Locally
```bash
node dist/index.js connect --transport stdio \
  --command npx --args -y @modelcontextprotocol/server-filesystem /tmp
```

### Through Burp Suite
```bash
node dist/index.js connect --transport http \
  --url http://localhost:3000/mcp \
  --proxy-host 127.0.0.1 --proxy-port 8080
```

### Using Config File
```bash
node dist/index.js gen-config -o my-config.json
node dist/index.js connect --config my-config.json
```

## What's Fixed

### Startup Issue
- Splash screen now auto-closes after 2 seconds
- No more hanging on startup
- Can still close immediately with any keypress

### Traffic Display
- Request/response pairing eliminates scrolling
- Smart previews prevent information overload
- Color coding makes scanning faster

### Navigation
- Active panel always obvious with bold yellow border
- Function keys provide instant panel switching
- Consistent behavior across all views

## Documentation

- **README.md** - Complete usage guide
- **QUICKSTART.md** - Get started quickly
- **FEATURES.md** - Detailed feature documentation
- **QUICK-REFERENCE.md** - Desk reference card for pentesters
- **USAGE.md** - Comprehensive usage examples
- **PENTESTING.md** - Security testing guide
- **ARCHITECTURE.md** - Technical implementation details

## System Requirements

- **Node.js** 20.x or higher
- **Terminal** with color support
- **Operating Systems**: Linux, macOS, Windows (WSL recommended)

## Licensing

This software is free and open source, with all intellectual property rights reserved by IntegSec.

**Free Use:**
- Internal security testing
- Educational purposes
- Academic research

**Requires License:**
- Commercial consulting
- Service offerings
- Product integration
- Resale or redistribution

**Contact:** licensing@integsec.com

## Support

- **Technical Support**: support@integsec.com
- **Security Issues**: security@integsec.com
- **Sales/Licensing**: licensing@integsec.com

## Known Limitations

- Traffic log limited to 100 most recent entries
- stdio transport requires Node.js and npx
- Proxy support varies by transport type

## Future Roadmap

Planned for future releases:
- Traffic export (JSON, HAR formats)
- Traffic filtering and search
- Request replay functionality
- Automated fuzzing templates
- Multi-server session management
- Custom plugin system

## Legal

This software is protected by copyright laws and international treaties.
Unauthorized reproduction, reverse engineering, or distribution is prohibited.

See LICENSE file for complete terms and conditions.

---

**IntegSec** - Professional Security Testing Tools

*Build Date: January 2, 2025*
*Version: 1.0.0*
*License: Free and Open Source (IP Protected)*

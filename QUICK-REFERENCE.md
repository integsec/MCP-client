# MCP Pentester CLI - Quick Reference Card

**MCP Pentester CLI - Copyright © 2025 IntegSec. All Rights Reserved.**

## Function Keys (IntegSec Standard)

```
F1  = Navigation Sidebar
F2  = Main Content Panel
F3  = Traffic Log Panel
F4  = Close Popup/Dialog
F5  = Refresh Current View
F10 = Quit Application
```

## Navigation

```
↑/↓   = Navigate lists
Enter = Execute selected item
```

## Traffic Log Features

### Real-time Display
- **Most recent at TOP**
- Timestamps in HH:MM:SS.mmm format
- Color coded: Yellow (>>>) sent, Green (<<<) received
- Shows: tool names, parameters, URIs, errors

### Entry Details
```
[12:34:56.789] >>> tools/call tool=read_file args=path
[12:34:56.890] <<< response id=1
[12:34:57.123] >>> resources/read uri=file:///etc/passwd
[12:34:57.234] <<< response ERROR: Access denied
```

### Request/Response Pairing
1. Select any traffic entry
2. Press Enter
3. See full request and response side-by-side
4. Press F4 to close

## Quick Start Commands

### Local Testing (stdio)
```bash
node dist/index.js connect --transport stdio \
  --command npx --args -y @modelcontextprotocol/server-filesystem /tmp
```

### Burp Suite Proxy (HTTP)
```bash
node dist/index.js connect --transport http \
  --url http://localhost:3000/mcp \
  --proxy-host 127.0.0.1 --proxy-port 8080
```

### Tor Proxy (WebSocket)
```bash
node dist/index.js connect --transport wss \
  --url wss://target.onion/mcp \
  --proxy-host 127.0.0.1 --proxy-port 9050 \
  --proxy-protocol socks5
```

### Config File
```bash
node dist/index.js connect --config my-config.json
```

## Pentesting Workflow

1. **Connect** - Establish connection to target MCP server
2. **F1** - Go to Navigation, select "Tools"
3. **F2** - Focus content, browse available tools
4. **Enter** - Execute a tool, enter parameters
5. **F3** - Check traffic log for request/response
6. **F2** - Select traffic entry
7. **Enter** - View full request/response pair
8. **Copy to Burp** - Use JSON for manual testing
9. **Repeat** - Test resources, prompts, edge cases

## Traffic Analysis Checklist

- [ ] Enumerate all tools, resources, prompts (F5 to refresh)
- [ ] Execute each tool with normal parameters
- [ ] Review request format in traffic log
- [ ] Test with edge cases (empty, null, special chars)
- [ ] Check error messages for information disclosure
- [ ] Test authentication/authorization bypass
- [ ] Look for injection vulnerabilities
- [ ] Test resource access controls
- [ ] Verify input validation
- [ ] Check for timing attacks

## Common Tasks

### Execute a Tool
```
F1 → Select "Tools" → F2 → ↓ to tool → Enter → Enter params → F4 to close result
```

### Read a Resource
```
F1 → Select "Resources" → F2 → ↓ to resource → Enter → F4 to close
```

### View Traffic Detail
```
F3 → ↓ to entry → Enter → Review request/response → F4 to close
```

### Refresh Data
```
F5 (refreshes current view)
```

## Burp Suite Integration

1. Configure Burp to listen on 127.0.0.1:8080
2. Start MCP CLI with --proxy-host and --proxy-port
3. Execute tools normally in the TUI
4. View/modify traffic in Burp Suite:
   - Proxy → HTTP history
   - Send to Repeater for modification
   - Send to Intruder for fuzzing
   - Send to Scanner for automated testing

## Tips & Tricks

### Efficient Navigation
- Use F1/F2/F3 to jump between panels instantly
- F4 closes ANY popup immediately
- F10 for quick exit

### Traffic Monitoring
- Latest traffic always at top - no scrolling needed
- Look for ERROR messages (red text)
- Match request IDs to correlate messages
- Press Enter on any entry for full details

### Pentesting Focus
- Tool calls show: tool name + argument names
- Resource reads show: full URI
- Errors show: full error message
- All timestamps for timing analysis

### Parameter Entry
- Simple strings: just type
- JSON objects: {"key": "value"}
- Arrays: ["item1", "item2"]
- Booleans: true / false
- Numbers: 42 / 3.14

## Support & Licensing

**Commercial Use:** licensing@integsec.com
**Technical Support:** support@integsec.com
**Security Issues:** security@integsec.com

**This software requires a commercial license for business use.**

---

Print this page for desk reference during penetration testing engagements.

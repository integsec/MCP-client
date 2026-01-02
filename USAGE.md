# Detailed Usage Guide

## Interactive Interface

The MCP Pentester CLI provides a full-featured terminal UI for interacting with MCP servers.

### Interface Layout

```
┌─────────────┬──────────────────────────────────────┐
│ Navigation  │  Main Content Panel                  │
│             │                                      │
│ > Tools     │  1. read_file - Read file contents   │ <- Selected item
│   Resources │  2. write_file - Write to file       │
│   Prompts   │  3. list_dir - List directory        │
│   Traffic   │                                      │
│             │  Use ↑/↓ to select, Enter to execute │
├─────────────┴──────────────────────────────────────┤
│ Status: Connected to server | ←/Tab=Sidebar →=Content Enter=Execute F5=Refresh q=Quit │
├──────────────────────────────────────────────────────┤
│ Traffic Log (Real-time)                              │
│ >>> [12:34:56] tools/list                           │
│ <<< [12:34:57] response                              │
└──────────────────────────────────────────────────────┘
```

## Navigation

### Switching Between Panels

1. **Sidebar** (Navigation menu)
   - Press `Tab` or `←` (left arrow) to focus
   - Use `↑/↓` to select Tools, Resources, Prompts, or Traffic
   - Press `Enter` to switch to that view

2. **Main Content Panel**
   - Press `→` (right arrow) to focus
   - Use `↑/↓` to navigate through the list
   - Press `Enter` to execute the selected item

3. **Traffic Log Panel**
   - Always visible at the bottom
   - Shows real-time traffic
   - Press `c` while focused to clear

## Working with Tools

### Viewing Available Tools

1. Navigate to "Tools" in the sidebar
2. The main panel shows all available tools with descriptions
3. Tools are numbered for easy reference

### Executing a Tool

1. Focus the main content panel (press `→`)
2. Use `↑/↓` to select the tool you want to execute
3. Press `Enter`
4. You'll be prompted for each parameter:
   - Required parameters are marked
   - Optional parameters can be left empty (just press Enter)
   - You can enter JSON for complex parameters
5. The result will be displayed in a popup window
6. Press `Enter`, `Esc`, or `q` to close the result

### Example: Calling a File Read Tool

```
Step 1: Select "read_file" tool
Step 2: Press Enter
Step 3: Prompted for "path (required):"
        Enter: /tmp/test.txt
Step 4: Tool executes
Step 5: Result displayed:
        ┌─ Tool Result: read_file ────────┐
        │ {                               │
        │   "content": "file contents",   │
        │   "encoding": "utf-8"           │
        │ }                               │
        │                                 │
        │ Press Enter/Esc to close        │
        └─────────────────────────────────┘
```

## Working with Resources

### Browsing Resources

1. Navigate to "Resources" in the sidebar
2. View list of available resources with URIs
3. Each resource shows:
   - Name
   - URI
   - Description (if available)

### Reading a Resource

1. Focus the main content panel
2. Select a resource with `↑/↓`
3. Press `Enter`
4. The resource contents will be fetched and displayed
5. Results shown in a scrollable popup

### Example: Reading a Resource

```
Resource: documentation
URI: file:///docs/api.md

Result displayed with full content
```

## Working with Prompts

### Viewing Available Prompts

1. Navigate to "Prompts" in the sidebar
2. View all prompt templates
3. See required/optional arguments for each

### Using a Prompt

1. Select a prompt from the list
2. Press `Enter`
3. Provide values for each argument:
   - Required arguments must have values
   - Optional arguments can be skipped
4. The prompt result is displayed

## Viewing Traffic

### Real-time Traffic Log

- Bottom panel shows recent traffic in real-time
- Color coded:
  - **Yellow `>>>`** = Sent to server
  - **Green `<<<`** = Received from server
  - **Red** = Errors

### Detailed Traffic View

1. Navigate to "Traffic Log" in the sidebar
2. See last 50 traffic entries
3. Select any entry and press `Enter` to view full JSON

### Example Traffic Detail

```
┌─ Traffic Detail ─────────────────────┐
│ Direction: sent                      │
│ Timestamp: 2025-01-02T12:34:56.789Z  │
│                                      │
│ {                                    │
│   "jsonrpc": "2.0",                  │
│   "method": "tools/call",            │
│   "params": {                        │
│     "name": "read_file",             │
│     "arguments": {                   │
│       "path": "/tmp/test.txt"        │
│     }                                │
│   },                                 │
│   "id": 1                            │
│ }                                    │
└──────────────────────────────────────┘
```

### Clearing Traffic Log

- Press `c` when focused on the traffic panel
- This clears both the bottom panel and the detailed view
- Traffic continues to be logged after clearing

## Keyboard Reference

### Global Keys (work anywhere)

| Key | Action |
|-----|--------|
| `q` | Quit application |
| `Esc` | Close popup or quit |
| `Ctrl+C` | Force quit |
| `F5` | Refresh current view |

### Navigation Keys

| Key | Action |
|-----|--------|
| `Tab` | Focus sidebar |
| `←` (Left) | Focus sidebar |
| `→` (Right) | Focus main content |
| `↑` (Up) | Move selection up |
| `↓` (Down) | Move selection down |

### Action Keys

| Key | Context | Action |
|-----|---------|--------|
| `Enter` | Sidebar | Switch to selected view |
| `Enter` | Tools list | Execute selected tool |
| `Enter` | Resources list | Read selected resource |
| `Enter` | Prompts list | Use selected prompt |
| `Enter` | Traffic list | View traffic detail |
| `Enter` | Popup | Close popup |
| `c` | Traffic panel | Clear traffic log |

## Tips and Tricks

### Efficient Navigation

1. Use `Tab` to quickly jump to sidebar
2. Use arrow keys for precise selection
3. Use `→` when you know what you want to execute

### Parameter Entry

- For simple strings: just type the value
- For JSON objects: `{"key": "value"}`
- For arrays: `["item1", "item2"]`
- For numbers: `42` or `3.14`
- For booleans: `true` or `false`

### Viewing Long Results

- Result popups are scrollable
- Use `↑/↓` or `j/k` (vi mode) to scroll
- Use `Page Up/Page Down` for fast scrolling

### Traffic Analysis

1. Execute operations normally
2. Switch to "Traffic Log" view
3. Select interesting requests/responses
4. Copy the JSON for use in Burp Suite or other tools

### Working with Burp Suite

1. Configure proxy in connection
2. Execute tools normally in the TUI
3. Switch to Burp Suite to:
   - View intercepted traffic
   - Send to Repeater for modification
   - Send to Intruder for fuzzing
   - Analyze with Scanner

### Testing Multiple Servers

- Quit the current session (press `q`)
- Start a new connection with different config
- Each session is independent

## Common Workflows

### Pentesting Workflow

1. **Reconnaissance**
   ```
   - Navigate to Tools
   - Press F5 to refresh
   - Review all available tools
   - Navigate to Resources
   - Review all resources
   ```

2. **Testing Tools**
   ```
   - Select a tool
   - Try normal parameters first
   - Note the response format
   - Try edge cases (empty, null, special chars)
   - Try injection payloads
   ```

3. **Analyzing Traffic**
   ```
   - Execute operations
   - Review traffic in real-time
   - Select traffic entries for details
   - Copy JSON for manual testing
   ```

4. **Resource Enumeration**
   ```
   - List all resources
   - Try to read each one
   - Look for sensitive information
   - Test URI variations
   ```

### Development Workflow

1. **Server Testing**
   ```
   - Connect to development server
   - Execute all tools to verify
   - Check error handling
   - Verify resource access
   ```

2. **Debugging**
   ```
   - View real-time traffic
   - Check request/response format
   - Verify JSON-RPC compliance
   - Test edge cases
   ```

## Troubleshooting

### "No tools available"

- Server may not support tools
- Press F5 to refresh
- Check traffic log for errors

### "Connection timeout"

- Verify server is running
- Check network connectivity
- Review proxy settings
- Check firewall rules

### Parameters not working

- Check the parameter format
- Try wrapping in quotes for strings
- Use JSON format for objects
- Review the tool's schema

### Can't see full results

- Results popup is scrollable
- Use arrow keys to scroll
- Resize terminal for more space
- Results are also in traffic log

### Colors not displaying

- Use a modern terminal (Windows Terminal, iTerm2, etc.)
- Check terminal color support
- Try different terminal emulator

## Advanced Usage

### Scripting Tool Calls

While the TUI is interactive, you can prepare parameter values in advance:

1. Note the tool name and required parameters
2. Prepare JSON parameter objects
3. Paste them when prompted
4. Automate testing sequences

### Custom JSON-RPC

View the traffic log to see exact JSON-RPC format, then:

1. Copy the request structure
2. Modify in an external tool
3. Send via Burp Suite or similar
4. Observe results in the server

### Proxy Chaining

Configure multiple proxies:

1. Use Burp Suite as primary proxy
2. Configure Burp to use upstream proxy (Tor, etc.)
3. All traffic flows through both
4. Maximum flexibility for testing

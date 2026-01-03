# MCP Pentester CLI - Feature Documentation

**IntegSec Proprietary Tool - Copyright © 2025 IntegSec**

## Visual Enhancements

### Active Panel Highlighting

The currently active panel is always clearly visible:

- **Bold yellow border** on the active panel
- **Normal cyan border** on inactive panels
- **Green border** for traffic log when inactive

This makes it immediately obvious which panel you're controlling:

- Press F1: Sidebar gets bold yellow border
- Press F2: Main content gets bold yellow border
- Press F3: Traffic log gets bold yellow border

### Enhanced Popup Windows

Result popups now feature:

**Improved Formatting:**

- Automatic syntax highlighting for JSON
- Property names in cyan
- String values in green
- Numbers in yellow
- Booleans and null in magenta
- Smart indentation for readability

**Better Visuals:**

- Bold colored borders
- Enhanced scrollbar (█ for thumb, ░ for track)
- Larger display area (90% width, 85% height)
- Clear "Press F4 or ESC to close" instruction

**Smart Content Display:**

- Auto-detects JSON strings and formats them
- Handles arrays with element count
- Shows object previews with key names
- Truncates long strings intelligently

## Traffic Log Enhancements

### Request/Response Pairing

Traffic now displays as **paired request/response**:

```
[12:34:56.789] >>> tools/call tool=read_file args=path
[12:34:56.890] <<< Array[5]
```

**Features:**

- Requests and responses shown together
- Automatic matching by JSON-RPC ID
- Most recent pairs at the top
- Preview of response content

### Detailed Request Information

For requests, the log shows:

- **tools/call**: tool name + argument names
- **resources/read**: full URI
- **prompts/get**: prompt name
- **notifications**: method name only

### Detailed Response Information

For responses, the log shows:

- **Success**: Preview of result (first few keys, array length, string preview)
- **Error**: Full error message in red
- **Result types**: Array[n], {key1,key2}, or value preview

### Examples

**Tool Call:**

```
[12:34:56.789] >>> tools/call tool=read_file args=path
[12:34:56.890] <<< {contents,encoding}
```

**Resource Read:**

```
[12:34:57.123] >>> resources/read uri=file:///docs/api.md
[12:34:57.234] <<< This is the API documentation...
```

**Error:**

```
[12:34:58.345] >>> tools/call tool=delete_file args=path
[12:34:58.456] <<< ERROR: Permission denied
```

## Intelligent Result Formatting

### Auto-Detection

The formatter automatically:

1. Detects if content is JSON (parses and reformats)
2. Identifies data types (string, array, object, number, boolean)
3. Applies appropriate formatting and colors
4. Handles nested structures intelligently

### Examples

**JSON Response:**

```json
{
  "name": "test.txt", // cyan property, green value
  "size": 1024, // cyan property, yellow value
  "exists": true, // cyan property, magenta value
  "contents": null // cyan property, magenta value
}
```

**Array Response:**

```
Array[5]  // In traffic log

// In detail popup:
[
  {
    "id": 1,
    "name": "item1"
  },
  ...
]
```

**String Response:**

```
// Short string - shown in full
Hello World

// Long string - truncated in traffic log
This is a very long string that will be...

// Full content in popup
This is a very long string that will be shown
completely in the detail popup window
```

## Workflow Integration

### For Pentesting

1. **Execute an operation** (tool call, resource read, etc.)
2. **Watch traffic log** - See request and response together
3. **Review result** - See formatted, color-coded output
4. **View details** - Press F3, select entry, press Enter
5. **Analyze** - See full request/response with syntax highlighting

### For Development

1. **Test API calls** - Clear, formatted output
2. **Debug issues** - Full request/response details
3. **Verify data** - Syntax highlighted JSON
4. **Copy for testing** - Well-formatted JSON ready to copy

## Keyboard Integration

All features accessible via function keys:

- **F1** - Navigate to operation (tools/resources/prompts)
- **F2** - View and select items
- **Enter** - Execute (see formatted result)
- **F3** - View traffic (request/response pairs)
- **Enter** - View detail (syntax highlighted, full JSON)
- **F4** - Close popup
- **F5** - Refresh data

## Color Scheme

**Traffic Log:**

- Yellow (>>>) - Outgoing requests
- Green (<<<) - Incoming responses
- Red (<<<) - Errors
- Gray - Timestamps

**Popups:**

- Cyan - JSON property names
- Green - String values
- Yellow - Numeric values
- Magenta - Booleans and null
- Red - Error messages

**Borders:**

- Yellow (bold) - Active panel
- Cyan - Inactive panels
- Green - Traffic log (inactive)

## Performance

**Optimizations:**

- Traffic log limited to 100 most recent entries
- Smart preview generation (no full JSON parse for simple display)
- Request/response matching by ID (O(1) lookup)
- Efficient string truncation for previews

## Accessibility

**Clear Visual Feedback:**

- Active panel always obvious (bold yellow border)
- Color coding consistent throughout
- Clear instructions on popups
- Function key indicators in status bar

**Keyboard Only:**

- All features accessible via function keys
- No mouse required
- Vi-style navigation supported
- Fast panel switching (F1/F2/F3)

---

**For more information:**

- Quick Reference: See QUICK-REFERENCE.md
- Usage Guide: See USAGE.md
- Getting Started: See QUICKSTART.md

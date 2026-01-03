# Bug Fixes - Build 2

## Issues Fixed

### 1. HTTP/HTTPS Transport - Empty Notification Response

**Problem**: When connecting via HTTP transport with proxy, the application failed with:

```
Failed to parse response: {"jsonrpc":"2.0","result":{...},"id":1}
```

**Root Cause**: After the initial `initialize` request succeeds, the MCP client sends a `notifications/initialized` notification. HTTP servers may respond with an empty body for notifications (since they don't require a JSON-RPC response), but our code was trying to parse empty responses as JSON.

**Fix**: Added check for empty response data before attempting JSON parsing (src/transport/http.ts:87-90):

```typescript
// If there's no response data, just resolve (for notifications)
if (!responseData.trim()) {
  resolve();
  return;
}
```

**Impact**: HTTP/HTTPS transport now works correctly with proxies (Burp Suite, ZAP, etc.)

### 2. stdio Transport - Windows npx Command Not Found

**Problem**: On Windows, running:

```bash
node dist/index.js connect --transport stdio --command npx --args -y @modelcontextprotocol/server-filesystem /tmp
```

Failed with:

```
Failed to connect: Error: spawn npx ENOENT
```

**Root Cause**: On Windows, `npx` is not a binary but a CMD script (`npx.cmd`). Node's `spawn()` function doesn't automatically find `.cmd` files unless using shell mode.

**Fix**: Added shell mode for Windows (src/transport/stdio.ts:22):

```typescript
this.process = spawn(this.command, this.args, {
  env: { ...process.env, ...this.env },
  stdio: ["pipe", "pipe", "pipe"],
  shell: process.platform === "win32", // Enable shell on Windows
});
```

**Impact**: stdio transport now works on Windows with `npx` and other CMD-based commands.

### 3. Better Error Messages

**Problem**: Error messages were generic and didn't help diagnose issues.

**Fix**: Improved error message in HTTP transport to show actual error instead of generic "Failed to parse response" (src/transport/http.ts:103-104):

```typescript
const errorMessage = error instanceof Error ? error.message : String(error);
reject(new Error(`Failed to process HTTP response: ${errorMessage}`));
```

**Impact**: Errors now provide actionable debugging information.

### 4. Blessed Library Tag Parsing Error

**Problem**: Application crashed with:

```
TypeError: Cannot read properties of null (reading 'slice')
    at Program._attr (C:\Work\MCP-client\node_modules\blessed\lib\program.js:2543:35)
```

**Root Cause**: Traffic log lines use blessed color tags like `{yellow-fg}` and `{green-fg}`. When displaying dynamic content (like result previews or error messages) that contains curly braces `{}`, blessed tries to parse them as tags and fails.

**Fix**: Added `escapeBlessedTags()` helper function to escape all curly braces in dynamic content (src/ui/tui.ts:506-509):

```typescript
private escapeBlessedTags(text: string): string {
  // Escape curly braces so blessed doesn't try to parse them as tags
  return text.replace(/{/g, '\\{').replace(/}/g, '\\}');
}
```

Applied escaping to:

- Request method and details (line 327)
- Error messages (line 342)
- Result previews (line 511-525)

**Impact**: Traffic log no longer crashes when displaying JSON objects, error messages, or other content with curly braces.

## Testing

### HTTP Transport Test

```bash
# Start a vulnerable MCP server on localhost:3000
# Start Burp Suite proxy on 127.0.0.1:8080
node dist/index.js connect --transport http \
  --url http://localhost:3000/mcp \
  --proxy-host 127.0.0.1 --proxy-port 8080
```

**Expected**: Should connect successfully and show IntegSec TUI with tools, resources, and prompts. All traffic visible in Burp Suite.

### stdio Transport Test (Windows)

```bash
node dist/index.js connect --transport stdio \
  --command npx --args -y @modelcontextprotocol/server-filesystem /tmp
```

**Expected**: Should connect successfully and show filesystem tools.

### stdio Transport Test (Linux/Mac)

```bash
node dist/index.js connect --transport stdio \
  --command npx --args -y @modelcontextprotocol/server-filesystem /tmp
```

**Expected**: Should connect successfully (already worked on Unix systems).

## Files Changed

- `src/transport/http.ts` - Added empty response handling and better error messages
- `src/transport/stdio.ts` - Added Windows shell mode support
- `src/ui/tui.ts` - Added blessed tag escaping for dynamic content in traffic log

## Compatibility

- **Windows**: Fixed - both HTTP and stdio transports now work
- **Linux**: Unchanged - already working
- **macOS**: Unchanged - already working

---

**Build Date**: January 2, 2026
**Version**: 1.0.0 (Build 2)

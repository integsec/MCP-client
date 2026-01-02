#!/bin/bash

# Quick test script for local MCP server
# This will connect to the MCP filesystem server

echo "Testing MCP Pentester CLI with local filesystem server..."
echo ""
echo "This will launch the TUI connected to an MCP filesystem server."
echo "You'll be able to browse and test the server's tools and resources."
echo ""
echo "Controls:"
echo "  Tab/← : Focus sidebar"
echo "  →     : Focus content"
echo "  ↑/↓   : Navigate items"
echo "  Enter : Execute selected item"
echo "  q     : Quit"
echo ""
echo "Press Enter to continue..."
read

node dist/index.js connect \
  --transport stdio \
  --command npx \
  --args -y @modelcontextprotocol/server-filesystem /tmp

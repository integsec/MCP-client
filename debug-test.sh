#!/bin/bash

echo "=== MCP Pentester CLI Debug Test ==="
echo ""

echo "1. Checking if dist/index.js exists:"
ls -la dist/index.js
echo ""

echo "2. Testing basic help command:"
node dist/index.js --help
echo ""

echo "3. Testing with NODE_DEBUG to see what's happening:"
NODE_DEBUG=* timeout 10 node dist/index.js connect --transport stdio --command echo --args "hello" 2>&1 | head -100
echo ""

echo "4. Exit code: $?"

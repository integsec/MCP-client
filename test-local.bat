@echo off

echo Testing MCP Pentester CLI with local filesystem server...
echo.
echo This will launch the TUI connected to an MCP filesystem server.
echo You'll be able to browse and test the server's tools and resources.
echo.
echo Controls:
echo   Tab/Left  : Focus sidebar
echo   Right     : Focus content
echo   Up/Down   : Navigate items
echo   Enter     : Execute selected item
echo   q         : Quit
echo.
pause

node dist\index.js connect --transport stdio --command npx --args -y @modelcontextprotocol/server-filesystem C:\Temp

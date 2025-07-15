# Windows Troubleshooting Guide for MCP Inspector

This guide helps Windows users resolve common issues when connecting to the MCP Inspector.

## Issues Fixed

The original issue was that the MCP Inspector wasn't starting properly on Windows due to:

1. **Cross-platform executable handling**: Windows needed to use `npx @modelcontextprotocol/inspector` instead of directly calling `mcp-inspector`
2. **Duplicate environment variable**: Removed the duplicate `MCP_PROXY_TOKEN` setting
3. **Better error handling**: Added proper error catching and Windows-specific troubleshooting tips
4. **Improved logging**: Shows session token and platform information for debugging

## Prerequisites

Before running the MCP Inspector, ensure you have:

1. **Node.js installed** (version 14 or higher)
2. **npm in PATH** (should come with Node.js)
3. **Internet connection** (for downloading packages)

## Installation

1. **Global installation (recommended)**:
   ```cmd
   npm install -g @modelcontextprotocol/inspector
   ```

2. **Or use npx** (no installation needed):
   The dev.js script will automatically use `npx @modelcontextprotocol/inspector` on Windows.

## Common Issues and Solutions

### Issue 1: "mcp-inspector command not found"
**Solution**: The updated dev.js automatically handles this by using `npx` on Windows.

### Issue 2: Session token mismatch
**Solution**: The session token is now properly logged in the console. Copy the token from the terminal output.

### Issue 3: Windows Defender blocking
**Solution**: 
1. Add Node.js to Windows Defender exceptions
2. Run Command Prompt as Administrator
3. Temporarily disable real-time protection during setup

### Issue 4: Permission errors
**Solution**: Run the command prompt as Administrator:
1. Press `Win + R`, type `cmd`
2. Press `Ctrl + Shift + Enter` to run as admin
3. Navigate to your project directory
4. Run the dev script

### Issue 5: Port conflicts
**Solution**: The script automatically finds available ports. If you still have issues:
1. Check which processes are using ports 9000-10000
2. Close any unnecessary applications
3. Restart your computer if needed

## Debugging Steps

1. **Check the console output**: Look for platform detection and command information
2. **Verify session token**: The token is now displayed in the console
3. **Check for error messages**: Enhanced error handling provides specific Windows tips
4. **Try manual installation**: `npm install -g @modelcontextprotocol/inspector`

## Enhanced Features

The updated dev.js includes:
- ✅ Automatic Windows detection
- ✅ Platform-specific command handling
- ✅ Better error messages
- ✅ Session token logging
- ✅ Timeout handling (30 seconds)
- ✅ Windows-specific troubleshooting tips

## Still Having Issues?

If you're still experiencing problems:

1. Check Node.js version: `node --version`
2. Check npm version: `npm --version`
3. Try clearing npm cache: `npm cache clean --force`
4. Reinstall Node.js from [nodejs.org](https://nodejs.org/)
5. Check Windows version compatibility

## Support

For additional support, please:
1. Check the console output for specific error messages
2. Include your Windows version and Node.js version when reporting issues
3. Share the full terminal output including any error messages
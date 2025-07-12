# TazaPay Integration

A Visual Studio Code extension for seamlessly integrating with TazaPay's services. Authenticate with your secret key, discover available tools, and get instant help from TazaPay's AI assistant directly in GitHub Copilot Chat using `@tazapay`.

## 🚀 New: GitHub Copilot Integration

Type `@tazapay` in GitHub Copilot Chat to instantly access TazaPay's AI assistant! No authentication required for documentation queries.

## Features

- **🤖 AI Assistant**: Access TazaPay's AI assistant directly in GitHub Copilot Chat using `@tazapay`
- **🔐 Secure Authentication**: Connect to TazaPay MCP services using your secret key
- **🔍 Tool Discovery**: Automatically discover and list all available TazaPay MCP tools
- **⚡ Direct Execution**: Execute MCP tools directly from VS Code with JSON parameter input
- **📚 Smart Documentation**: Ask questions about TazaPay's API documentation using RAG
- **💻 Code Generation**: Generate integration code templates for any discovered tool
- **🗂️ Sidebar Integration**: Browse available tools in a dedicated TazaPay MCP sidebar

## Requirements

- Visual Studio Code 1.102.0 or higher
- GitHub Copilot Chat extension (for `@tazapay` assistant)
- TazaPay MCP service access (for advanced features)
- Valid TazaPay secret key for authentication (for MCP tools)

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "TazaPay Integration"
4. Click Install
5. **Welcome view opens automatically** with quick setup options

### Manual Installation
1. Download the latest `.vsix` file from releases
2. In VS Code: `Extensions → ... → Install from VSIX`
3. Select the downloaded file
4. **Welcome view opens automatically** with quick setup options

## Usage

### 1. Welcome View (New!)

After installation, the **TazaPay** view opens automatically in your sidebar with:

- **🤖 AI Assistant Button** - Click to open GitHub Copilot Chat with `@tazapay` ready
- **🔐 Secret Key Input** - Enter your TazaPay secret key to unlock advanced tools
- **📋 Feature Overview** - See all available capabilities at a glance

### 2. Using @tazapay in GitHub Copilot Chat

The easiest way to get help with TazaPay! No authentication required.

1. **Open GitHub Copilot Chat** (click the chat icon in the sidebar)
2. **Type `@tazapay`** followed by your question
3. **Get instant answers** about TazaPay's APIs, integration guides, and more

**Example questions:**
- `@tazapay How do I create a payment?`
- `@tazapay What webhook events are available?`
- `@tazapay Show me a JavaScript integration example`
- `@tazapay How does escrow work?`

### 3. Authentication (for MCP Tools)

**Option A: Via Welcome View (Recommended)**
1. Enter your secret key in the welcome view textbox
2. Click "Authenticate & Enable Tools"
3. Tools will be available in the TazaPay MCP Tools sidebar

**Option B: Via Command Palette**
1. Open VS Code Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run command: `TazaPay: Authenticate with Secret Key`
3. Enter your TazaPay secret key when prompted
4. The extension will connect to TazaPay's MCP service

### 4. Configure Server URL (Optional)

Update your VS Code settings if using a custom endpoint:

```json
{
  "tazapay.serverUrl": "https://your-custom-endpoint.com/api"
}
```

### 5. Available Commands

- `TazaPay: Authenticate with Secret Key` - Connect to TazaPay service
- `TazaPay: List Available Tools` - View all available tools
- `TazaPay: Ask Documentation Question` - Query TazaPay documentation using RAG
- `TazaPay: Generate Integration Code` - Generate code templates

### 6. Using Tools

1. After authentication, view tools in the TazaPay Tools sidebar
2. Click on any tool to execute it
3. Enter parameters in JSON format when prompted
4. View results in a new editor tab

## Extension Settings

This extension contributes the following settings:

- `tazapay.serverUrl`: TazaPay Server URL (default: `https://api.tazapay.com`)
- `tazapay.secretKey`: Your TazaPay Secret Key (stored securely)

## API Integration

The extension expects your service to provide these endpoints:

- `POST /auth` - Authentication with secret key
- `GET /tools` - List available tools
- `POST /rag/query` - Documentation questions
- `POST /tools/{tool-name}` - Execute specific tools

### Authentication Response Format

```json
{
  "success": true,
  "message": "Authentication successful"
}
```

### Tools Response Format

```json
{
  "tools": [
    {
      "name": "tool-name",
      "description": "Tool description",
      "parameters": {
        "param1": "string",
        "param2": "number"
      },
      "endpoint": "/api/tool-name"
    }
  ]
}
```

## Development

### Build

```bash
npm install
npm run compile
```

### Watch Mode

```bash
npm run watch
```

## Known Issues

- Tool parameter validation is basic - ensure JSON format is correct
- Error handling could be improved for network failures
- RAG responses are displayed as plain text

## Release Notes

### 1.0.0

- Initial release
- Authentication with secret keys
- Tool discovery and execution
- Documentation assistant with RAG
- Code generation templates
- Tree view for tools

## License

MIT License

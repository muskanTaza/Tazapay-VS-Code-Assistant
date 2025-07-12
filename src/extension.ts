/**
 * TazaPay MCP Integration Extension
 * 
 * This extension integrates TazaPay's Model Context Protocol (MCP) services with VS Code,
 * providing a chat participant for GitHub Copilot and various MCP tools for payment processing.
 * 
 * Features:
 * - @tazapay chat participant in GitHub Copilot
 * - MCP tool discovery and execution
 * - RAG-powered documentation queries
 * - Authentication and secret key management
 * - Welcome view with setup instructions
 */

import * as vscode from 'vscode';
import { MCPClient, MCPTool } from './mcpClient';
import { MCPTreeProvider } from './mcpTreeProvider';
import { TazaPayRAGClient } from './ragClient';
import { WelcomeViewProvider } from './welcomeView';

// Global extension state variables
let mcpClient: MCPClient | null = null;  // MCP client for API communication
let mcpTreeProvider: MCPTreeProvider;    // Tree view provider for MCP tools
let ragClient: TazaPayRAGClient;         // RAG client for documentation queries

/**
 * Extension activation function - called when the extension is activated
 * Sets up all providers, commands, and chat participants
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('TazaPay MCP Integration extension is now active!');

	// Initialize the MCP tree provider for displaying tools in the sidebar
	mcpTreeProvider = new MCPTreeProvider();
	vscode.window.registerTreeDataProvider('tazapayMcpTools', mcpTreeProvider);
	
	// Initialize the RAG client for documentation queries
	ragClient = new TazaPayRAGClient();

	// Register the welcome view provider for the extension's main interface
	const welcomeProvider = new WelcomeViewProvider(context.extensionUri, context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('tazapayMcpWelcome', welcomeProvider)
	);

	// Automatically show the welcome view after extension loads
	// Small delay ensures the view container is ready
	setTimeout(() => {
		vscode.commands.executeCommand('tazapayMcpWelcome.focus');
	}, 1000);

	/**
	 * Register the @tazapay chat participant for GitHub Copilot Chat
	 * This enables users to type "@tazapay <question>" in Copilot Chat to get TazaPay assistance
	 */
	const chatParticipant = vscode.chat.createChatParticipant('tazapay.assistant', async (request, context, stream, token) => {
		try {
			const userMessage = request.prompt.trim();
			
			// Show typing indicator while processing the request
			stream.progress('Processing your TazaPay question...');
			
			let response: string;
			
			// Handle help requests or empty messages with a welcome message
			if (!userMessage || userMessage.toLowerCase() === 'help') {
				response = `



### 💡 Try asking:
- "How do I create a payment?"
- "What webhook events are available?"
- "Show me a payment integration example"
- "How does TazaPay escrow work?"

*Note: For detailed technical support, visit [TazaPay Documentation](https://docs.tazapay.com)*`;
			} else {
				try {
					// Try to use the RAG client for intelligent responses
					response = await ragClient.queryRAG(userMessage);
				} catch (ragError) {
					console.log('RAG client error, using fallback response:', ragError);
					// Use fallback responses for common questions when RAG fails
					response = getFallbackResponse(userMessage);
				}
			}
			
			// Stream the response as markdown to the chat
			stream.markdown(response);
			
			// Add contextual follow-up buttons based on the user's question
			if (userMessage.toLowerCase().includes('payment') || userMessage.toLowerCase().includes('api')) {
				stream.button({
					command: 'tazapay-mcp.generateCode',
					title: '📝 Generate Code Example',
					arguments: []
				});
			}
			
			if (userMessage.toLowerCase().includes('webhook')) {
				stream.button({
					command: 'tazapay-mcp.listTools',
					title: '🔗 View Webhook Tools',
					arguments: []
				});
			}
			
		} catch (error) {
			console.error('Chat participant error:', error);
			stream.markdown(`❌ **Error:** I encountered an issue processing your request. 

**Troubleshooting:**
- Make sure you have an internet connection
- Try rephrasing your question
- Visit [TazaPay Support](https://support.tazapay.com) for direct help

**Example questions that work:**
- @tazapay help
- @tazapay How do I create a payment?
- @tazapay What are webhook events?`);
		}
	});

	/**
	 * Helper function to provide fallback responses when RAG client fails
	 * Returns appropriate responses for common TazaPay questions
	 * @param userMessage - The user's question/input
	 * @returns Markdown formatted response string
	 */
	function getFallbackResponse(userMessage: string): string {
		const lowerMsg = userMessage.toLowerCase();
		
		// Payment creation questions
		if (lowerMsg.includes('payment') && lowerMsg.includes('create')) {
			return `# 💳 Creating Payments with TazaPay

## Quick Start
\`\`\`javascript
const payment = await tazapay.createPayment({
  amount: 1000,
  currency: 'USD',
  description: 'Payment for services',
  buyer_email: 'buyer@example.com',
  seller_email: 'seller@example.com'
});
\`\`\`

## Next Steps
1. Set up webhook endpoints
2. Handle payment confirmations
3. Implement escrow release logic

*For complete documentation, visit [TazaPay API Docs](https://docs.tazapay.com)*`;
		}
		
		// Webhook-related questions
		if (lowerMsg.includes('webhook')) {
			return `# 🔔 TazaPay Webhook Events

## Common Events
- \`payment.created\` - New payment initiated
- \`payment.completed\` - Payment successfully processed
- \`escrow.released\` - Funds released from escrow
- \`dispute.created\` - Dispute opened by buyer/seller

## Example Handler
\`\`\`javascript
app.post('/webhook', (req, res) => {
  const event = req.body;
  
  switch(event.type) {
    case 'payment.completed':
      // Handle successful payment
      break;
    case 'escrow.released':
      // Handle escrow release
      break;
  }
  
  res.status(200).send('OK');
});
\`\`\`

*Set up webhooks in your [TazaPay Dashboard](https://dashboard.tazapay.com)*`;
		}
		
		// Escrow-related questions
		if (lowerMsg.includes('escrow')) {
			return `# 🔒 TazaPay Escrow Services

## How It Works
1. **Buyer** pays into secure escrow
2. **Seller** delivers goods/services
3. **Buyer** confirms satisfaction
4. **Funds** automatically released to seller

## Benefits
- ✅ **Secure** transactions
- ✅ **Dispute** protection
- ✅ **Global** compliance
- ✅ **Multi-currency** support

*Learn more at [TazaPay Escrow Guide](https://docs.tazapay.com/escrow)*`;
		}
		
		// Default response for unrecognized questions
		return `# 🤔 TazaPay Information

I can help with TazaPay's payment and escrow services. Try asking about:

- **Payments** - API integration, processing
- **Webhooks** - Event handling, notifications  
- **Escrow** - Secure transaction management
- **Integration** - Code examples, best practices

**Example:** "@tazapay How do I create a payment?"

*For detailed documentation, visit [docs.tazapay.com](https://docs.tazapay.com)*`;
	}

	// Set the custom TazaPay icon for the chat participant
	chatParticipant.iconPath = vscode.Uri.file(context.asAbsolutePath('chat-icon.svg'));
	
	// Provide suggested follow-up questions after each chat interaction
	chatParticipant.followupProvider = {
		provideFollowups(result, context, token) {
			return [
				{
					prompt: 'How do I create a payment?',
					label: '💳 Payment Creation',
					command: 'followup'
				},
				{
					prompt: 'What are the webhook events?',
					label: '🔔 Webhook Events',
					command: 'followup'
				},
				{
					prompt: 'Show me integration examples',
					label: '💻 Code Examples',
					command: 'followup'
				}
			];
		}
	};

	context.subscriptions.push(chatParticipant);

	// Welcome view command
	const showWelcomeCommand = vscode.commands.registerCommand('tazapay-mcp.showWelcome', () => {
		vscode.commands.executeCommand('tazapayMcpWelcome.focus');
	});

	// Open Copilot Chat command (similar to Stripe's "Ask a question")
	const openCopilotChatCommand = vscode.commands.registerCommand('tazapay-mcp.openCopilotChat', async () => {
		try {
			// Try to open Copilot Chat with @tazapay pre-filled
			await vscode.commands.executeCommand('workbench.action.chat.open', {
				query: '@tazapay '
			});
		} catch {
			try {
				// Fallback: try opening chat first, then add @tazapay
				await vscode.commands.executeCommand('workbench.action.chat.open');
				// Small delay to let chat open, then try to add @tazapay
				setTimeout(async () => {
					try {
						await vscode.commands.executeCommand('workbench.action.chat.open', {
							query: '@tazapay '
						});
					} catch {
						// If that fails, just show a helpful message
						vscode.window.showInformationMessage('Copilot Chat opened! Type "@tazapay" to get TazaPay assistance.');
					}
				}, 500);
			} catch {
				const message = `
🤖 **TazaPay AI Assistant**

**To use @tazapay in Copilot Chat:**
1. Open Copilot Chat (Ctrl+Alt+I or Cmd+Alt+I)
2. Type: **@tazapay** followed by your question
3. Get help with payments, APIs, and integration guides

**Example questions:**
• @tazapay How do I create a payment?
• @tazapay What are the webhook events?
• @tazapay Show me integration examples
				`.trim();

				vscode.window.showInformationMessage(
					'Please open Copilot Chat manually and type "@tazapay" for assistance.',
					'Learn More'
				).then(selection => {
					if (selection === 'Learn More') {
						vscode.window.showInformationMessage(message, { modal: true });
					}
				});
			}
		}
	});

	// Authentication command
	const authenticateCommand = vscode.commands.registerCommand('tazapay-mcp.authenticate', async () => {
		const config = vscode.workspace.getConfiguration('tazapay-mcp');
		const serverUrl = config.get<string>('serverUrl');
		let secretKey = config.get<string>('secretKey');

		if (!secretKey) {
			const input = await vscode.window.showInputBox({
				prompt: 'Enter your MCP Secret Key',
				password: true,
				ignoreFocusOut: true
			});

			if (!input) {
				return;
			}

			secretKey = input;
			await config.update('secretKey', input, vscode.ConfigurationTarget.Global);
		}

		const finalServerUrl = serverUrl || 'https://api.tazapay.com';

		if (!secretKey) {
			vscode.window.showErrorMessage('Secret key is required');
			return;
		}

		mcpClient = new MCPClient(finalServerUrl, secretKey);
		
		try {
			const authenticated = await mcpClient.authenticate();
			if (authenticated) {
				vscode.window.showInformationMessage('Successfully authenticated with MCP service');
				// Fetch and display tools
				const tools = await mcpClient.getTools();
				mcpTreeProvider.updateTools(tools);
			} else {
				vscode.window.showErrorMessage('Authentication failed. Please check your secret key.');
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Authentication error: ${error}`);
		}
	});

	// List tools command
	const listToolsCommand = vscode.commands.registerCommand('tazapay-mcp.listTools', async () => {
		if (!mcpClient || !mcpClient.isConnected()) {
			vscode.window.showWarningMessage('Please authenticate first');
			return;
		}

		try {
			const tools = await mcpClient.getTools();
			const toolsText = tools.map(tool => `${tool.name}: ${tool.description}`).join('\n');
			
			const doc = await vscode.workspace.openTextDocument({
				content: `Available MCP Tools:\n\n${toolsText}`,
				language: 'markdown'
			});
			
			await vscode.window.showTextDocument(doc);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to fetch tools: ${error}`);
		}
	});

	// Execute tool command
	const executeToolCommand = vscode.commands.registerCommand('tazapay-mcp.executeTool', async (tool: MCPTool) => {
		if (!mcpClient || !mcpClient.isConnected()) {
			vscode.window.showWarningMessage('Please authenticate first');
			return;
		}

		try {
			// Get parameters from user
			const parametersStr = await vscode.window.showInputBox({
				prompt: `Enter parameters for ${tool.name} (JSON format)`,
				placeHolder: '{"param1": "value1", "param2": "value2"}',
				value: '{}',
				ignoreFocusOut: true
			});

			if (parametersStr === undefined) {
				return;
			}

			let parameters = {};
			try {
				parameters = JSON.parse(parametersStr);
			} catch (parseError) {
				vscode.window.showErrorMessage('Invalid JSON format for parameters');
				return;
			}

			const result = await mcpClient.executeTool(tool.name, parameters);
			
			// Show result in a new document
			const doc = await vscode.workspace.openTextDocument({
				content: `Tool: ${tool.name}\nParameters: ${JSON.stringify(parameters, null, 2)}\n\nResult:\n${JSON.stringify(result, null, 2)}`,
				language: 'json'
			});
			
			await vscode.window.showTextDocument(doc);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to execute tool: ${error}`);
		}
	});

	// Ask documentation question command
	const askQuestionCommand = vscode.commands.registerCommand('tazapay-mcp.askQuestion', async () => {
		if (!mcpClient || !mcpClient.isConnected()) {
			vscode.window.showWarningMessage('Please authenticate first');
			return;
		}

		const question = await vscode.window.showInputBox({
			prompt: 'Ask a question about the MCP service documentation',
			placeHolder: 'How do I use the payment API?',
			ignoreFocusOut: true
		});

		if (!question) {
			return;
		}

		try {
			const answer = await mcpClient.askDocumentationQuestion(question);
			
			const doc = await vscode.workspace.openTextDocument({
				content: `Question: ${question}\n\nAnswer:\n${answer}`,
				language: 'markdown'
			});
			
			await vscode.window.showTextDocument(doc);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to get answer: ${error}`);
		}
	});

	// Generate integration code command
	const generateCodeCommand = vscode.commands.registerCommand('tazapay-mcp.generateCode', async () => {
		if (!mcpClient || !mcpClient.isConnected()) {
			vscode.window.showWarningMessage('Please authenticate first');
			return;
		}

		const tools = mcpClient.getAvailableTools();
		if (tools.length === 0) {
			vscode.window.showWarningMessage('No tools available');
			return;
		}

		const toolNames = tools.map(tool => tool.name);
		const selectedTool = await vscode.window.showQuickPick(toolNames, {
			placeHolder: 'Select a tool to generate integration code for'
		});

		if (!selectedTool) {
			return;
		}

		const tool = tools.find(t => t.name === selectedTool);
		if (!tool) {
			return;
		}

		const codeTemplate = generateIntegrationCode(tool);
		
		const doc = await vscode.workspace.openTextDocument({
			content: codeTemplate,
			language: 'javascript'
		});
		
		await vscode.window.showTextDocument(doc);
	});

	context.subscriptions.push(
		showWelcomeCommand,
		openCopilotChatCommand,
		authenticateCommand,
		listToolsCommand,
		executeToolCommand,
		askQuestionCommand,
		generateCodeCommand
	);
}

function generateIntegrationCode(tool: MCPTool): string {
	return `// Integration code for ${tool.name}
// ${tool.description}

const axios = require('axios');

class MCPIntegration {
    constructor(serverUrl, secretKey) {
        this.serverUrl = serverUrl;
        this.secretKey = secretKey;
    }

    async ${tool.name}(parameters) {
        try {
            const response = await axios.post(
                \`\${this.serverUrl}${tool.endpoint}\`,
                parameters,
                {
                    headers: {
                        'Authorization': \`Bearer \${this.secretKey}\`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error calling ${tool.name}:', error);
            throw error;
        }
    }
}

// Usage example:
const mcp = new MCPIntegration('YOUR_SERVER_URL', 'YOUR_SECRET_KEY');

// Call the tool
mcp.${tool.name}({
    // Add your parameters here based on the tool's requirements
    // Parameters: ${JSON.stringify(tool.parameters, null, 4)}
}).then(result => {
    console.log('Result:', result);
}).catch(error => {
    console.error('Error:', error);
});
`;
}

export function deactivate() {
	mcpClient = null;
}

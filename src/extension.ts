/**
 * TazaPay Integration Extension
 * 
 * This extension integrates TazaPay's services with VS Code,
 * providing a chat participant for GitHub Copilot and various tools for payment processing.
 * 
 * Features:
 * - @tazapay chat participant in GitHub Copilot
 * - MCP tool discovery and execution
 * - RAG-powered documentation queries
 * - Authentication and secret key management
 * - Welcome view with setup instructions
 */

import * as vscode from 'vscode';
import { TazaPayClient, TazaPayTool } from './client';
import { TazaPayTreeProvider } from './treeProvider';
import { TazaPayRAGClient } from './ragClient';
import { WelcomeViewProvider } from './welcomeView';
import { TazaPayMCPClient } from './mcpClient';
import { TAZAPAY_CONFIG } from './constants';

// Global extension state variables
let tazaPayClient: TazaPayClient | null = null;  // TazaPay client for API communication
let tazaPayTreeProvider: TazaPayTreeProvider;    // Tree view provider for TazaPay tools
let ragClient: TazaPayRAGClient;         // RAG client for documentation queries
let mcpClient: TazaPayMCPClient;         // MCP client for TazaPay tools

/**
 * Extension activation function - called when the extension is activated
 * Sets up all providers, commands, and chat participants
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('TazaPay Integration extension is now active!');

	// Initialize the TazaPay tree provider for displaying tools in the sidebar
	tazaPayTreeProvider = new TazaPayTreeProvider();
	vscode.window.registerTreeDataProvider('tazapayMcpTools', tazaPayTreeProvider);
	
	// Initialize the RAG client for documentation queries
	ragClient = new TazaPayRAGClient();
	
	// Initialize the MCP client for TazaPay tools
	mcpClient = new TazaPayMCPClient();

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
			
			// Detect if we're in agent mode by checking the request context
			const isAgentMode = detectAgentMode(request, context);
			console.log(`TazaPay chat participant called. Agent mode: ${isAgentMode}, Message: "${userMessage}"`);
			console.log('Request object:', JSON.stringify(request, null, 2));
			console.log('Context object:', JSON.stringify(context, null, 2));
			
			// Show typing indicator while processing the request
			stream.progress(isAgentMode ? 
				'Using TazaPay tools to process your request...' : 
				'Searching TazaPay documentation...'
			);
			
			let response: string;
			
			// Handle help requests or empty messages with a welcome message
			if (!userMessage || userMessage.toLowerCase() === 'help') {
				response = `
${isAgentMode ? `
I can execute TazaPay operations for you!
- "Can you check my Tazapay balance"
- "Create a payment for $100 USD"  
- "Check payment status ABC123"
- "List my recent transactions"

### Available Tools:
${(await getMCPToolsList()) || 'Loading tools...'}
` : `
I'll search TazaPay documentation for you!
- "Can you check my Tazapay balance" (will search docs about balance checking)
- "How do I create a payment?"
- "What webhook events are available?"
- "Show me a payment integration example"
`}

*For detailed technical support, visit [TazaPay Documentation](https://docs.tazapay.com)*`;
			} else {
				try {
					// Use MCP tools only in agent mode, otherwise use RAG
					if (isAgentMode) {
						// Agent mode: Try to use MCP tools first
						const mcpResponse = await tryMCPTools(userMessage);
						if (mcpResponse) {
							response = mcpResponse;
						} else {
							// If no relevant MCP tools found, inform user and suggest RAG mode
							response = `🔧 **No relevant TazaPay tools found for your request.**

I couldn't find any specific TazaPay tools to handle: "${userMessage}"

**Available tools:**
${(await getMCPToolsList()) || 'Loading tools...'}

💡 **Tip:** For general questions about TazaPay, try asking without agent mode for documentation-based answers.`;
						}
					} else {
						// Regular mode: Use RAG for documentation queries
						console.log('Using RAG client for documentation query...');
						response = await ragClient.queryRAG(userMessage);
						console.log('RAG response received:', response.substring(0, 100) + '...');
					}
				} catch (error) {
					console.log('MCP/RAG client error, using fallback response:', error);
					// Use fallback responses for common questions when both MCP and RAG fail
					response = getFallbackResponse(userMessage);
				}
			}
			
			// // Add mode indicator for debugging
			// if (isAgentMode) {
			// 	response += '\n\n---\n*🔧 Agent mode - using MCP tools*';
			// } else {
			// 	response += '\n\n---\n*📚 Regular mode - using RAG documentation search*';
			// }

			// Stream the response as markdown to the chat
			stream.markdown(response);
			
			// Add contextual follow-up buttons based on the user's question
			// if (userMessage.toLowerCase().includes('payment') || userMessage.toLowerCase().includes('api')) {
			// 	stream.button({
			// 		command: 'tazapay.generateCode',
			// 		title: '📝 Generate Code Example',
			// 		arguments: []
			// 	});
			// }
			
			
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
	 * Detect if Copilot is in agent mode
	 * @param request - Chat request object
	 * @param context - Chat context object
	 * @returns boolean - True if in agent mode
	 */
	function detectAgentMode(request: any, context: any): boolean {
		try {
			// Method 1: Check if the request has agent-specific command
			if (request.command && request.command !== '') {
				console.log('Agent mode detected via request.command:', request.command);
				return true;
			}

			// Method 2: Check VS Code configuration override
			const config = vscode.workspace.getConfiguration('tazapay');
			const forceAgentMode = config.get<boolean>('forceAgentMode', false);
			console.log('forceAgentMode setting:', forceAgentMode);
			if (forceAgentMode) {
				console.log('Agent mode forced via configuration');
				return true;
			}

			// Default to regular mode (use RAG)
			console.log('Regular mode detected - using RAG for documentation queries');
			return false;

		} catch (error) {
			console.error('Error detecting agent mode:', error);
			// Default to regular mode on error
			return false;
		}
	}

	/**
	 * Get a formatted list of available MCP tools
	 * @returns Promise<string> - Formatted tools list
	 */
	async function getMCPToolsList(): Promise<string> {
		try {
			const isConfigured = await mcpClient.isConfigured();
			if (!isConfigured) {
				return 'MCP server not configured. Please set up your API credentials first.';
			}

			if (!mcpClient.getConnectionStatus()) {
				await mcpClient.connect();
			}

			const tools = mcpClient.getTools();
			if (tools.length === 0) {
				return 'No tools available. The MCP server may still be starting up.';
			}

			return tools.map(tool => `• **${tool.name}**: ${tool.description}`).join('\n');
		} catch (error) {
			console.error('Error getting MCP tools list:', error);
			return 'Error loading tools list.';
		}
	}

	/**
	 * Try to use MCP tools to handle the user's request
	 * @param userMessage - The user's question/input
	 * @returns Promise<string | null> - MCP tool response or null if no relevant tools found
	 */
	async function tryMCPTools(userMessage: string): Promise<string | null> {
		try {
			// Check if MCP client is configured
			const isConfigured = await mcpClient.isConfigured();
			if (!isConfigured) {
				console.log('MCP client not configured, skipping...');
				return null;
			}

			// Connect to MCP server if not already connected
			if (!mcpClient.getConnectionStatus()) {
				const connected = await mcpClient.connect();
				if (!connected) {
					console.log('Failed to connect to MCP server');
					return null;
				}
			}

			// Find relevant tools for the user's query
			const relevantTools = mcpClient.findRelevantTools(userMessage);
			
			if (relevantTools.length === 0) {
				console.log('No relevant MCP tools found for query');
				return null;
			}

			// For now, use the first relevant tool
			// In a more sophisticated implementation, we could:
			// 1. Ask the user which tool to use if multiple are found
			// 2. Use AI to determine the best tool and parameters
			// 3. Chain multiple tools together
			
			const tool = relevantTools[0];
			console.log(`Using MCP tool: ${tool.name}`);

			// Try to extract parameters from the user message
			// This is a simple implementation - in practice, you'd want more sophisticated parameter extraction
			const parameters = extractParametersFromMessage(userMessage, tool);

			// Execute the tool
			const result = await mcpClient.executeTool(tool.name, parameters);

			if (result.isError) {
				return `❌ **Error using ${tool.name}:** ${result.content[0]?.text || 'Unknown error'}`;
			}

			// Format the response
			const toolResponse = result.content.map(item => item.text || JSON.stringify(item)).join('\n');
			
			return `🔧 **Using TazaPay Tool: ${tool.name}**

${tool.description}

**Result:**
${toolResponse}

*This result was generated using TazaPay's MCP tools. For more complex operations, visit [TazaPay Dashboard](https://dashboard.tazapay.com)*`;

		} catch (error) {
			console.error('Error in tryMCPTools:', error);
			return null;
		}
	}

	/**
	 * Extract parameters from user message for a given tool
	 * This is a simple implementation - could be enhanced with NLP
	 */
	function extractParametersFromMessage(message: string, tool: any): any {
		const lowerMessage = message.toLowerCase();
		const parameters: any = {};

		// Simple keyword extraction
		if (tool.name.includes('payment')) {
			// Look for amount
			const amountMatch = message.match(/\$?(\d+(?:\.\d{2})?)/);
			if (amountMatch) {
				parameters.amount = parseFloat(amountMatch[1]);
			}

			// Look for currency
			const currencyMatch = message.match(/\b(USD|EUR|GBP|SGD|AUD|CAD)\b/i);
			if (currencyMatch) {
				parameters.currency = currencyMatch[1].toUpperCase();
			} else {
				parameters.currency = 'USD'; // Default
			}

			// Look for description
			if (lowerMessage.includes('for ')) {
				const descMatch = message.match(/for (.+?)(?:\.|$)/i);
				if (descMatch) {
					parameters.description = descMatch[1].trim();
				}
			}
		}

		if (tool.name.includes('status') || tool.name.includes('payment')) {
			// Look for payment ID
			const idMatch = message.match(/\b([a-zA-Z0-9_-]{10,})\b/);
			if (idMatch) {
				parameters.payment_id = idMatch[1];
			}
		}

		if (tool.name.includes('list')) {
			// Look for limit
			const limitMatch = message.match(/(\d+)\s+(?:transactions|payments|items)/i);
			if (limitMatch) {
				parameters.limit = parseInt(limitMatch[1]);
			} else {
				parameters.limit = 10; // Default
			}
		}


		return parameters;
	}

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
	const showWelcomeCommand = vscode.commands.registerCommand('tazapay.showWelcome', () => {
		vscode.commands.executeCommand('tazapayMcpWelcome.focus');
	});

	// Open Copilot Chat command (similar to Stripe's "Ask a question")
	const openCopilotChatCommand = vscode.commands.registerCommand('tazapay.openCopilotChat', async () => {
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

	// Authentication command - simplified to just show MCP status
	const authenticateCommand = vscode.commands.registerCommand('tazapay.authenticate', async () => {
		try {
			const isConfigured = await mcpClient.isConfigured();
			
			if (isConfigured) {
				// Try to connect to MCP server
				const connected = await mcpClient.connect();
				if (connected) {
					const tools = mcpClient.getTools();
					vscode.window.showInformationMessage(
						`TazaPay MCP server connected! ${tools.length} tools available.`
					);
					
					// Update tree provider with MCP tools
					tazaPayTreeProvider.updateTools(tools.map(tool => ({
						name: tool.name,
						description: tool.description,
						endpoint: '', // MCP tools don't use endpoints
						parameters: tool.inputSchema
					})));
				} else {
					vscode.window.showWarningMessage('Failed to connect to TazaPay MCP server. Please check your configuration.');
				}
			} else {
				vscode.window.showInformationMessage(
					'TazaPay MCP server not configured. Please use the welcome view to set up your API credentials.',
					'Open Welcome'
				).then(selection => {
					if (selection === 'Open Welcome') {
						vscode.commands.executeCommand('tazapayMcpWelcome.focus');
					}
				});
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Authentication error: ${error}`);
		}
	});

	// List tools command
	const listToolsCommand = vscode.commands.registerCommand('tazapay.listTools', async () => {
		try {
			const isConfigured = await mcpClient.isConfigured();
			if (!isConfigured) {
				vscode.window.showWarningMessage('TazaPay MCP server not configured. Please set up your credentials first.');
				return;
			}

			// Ensure connection
			if (!mcpClient.getConnectionStatus()) {
				await mcpClient.connect();
			}

			const tools = mcpClient.getTools();
			if (tools.length === 0) {
				vscode.window.showInformationMessage('No MCP tools available. The server may still be starting up.');
				return;
			}

			const toolsText = tools.map(tool => 
				`## ${tool.name}\n${tool.description}\n\n**Input Schema:**\n\`\`\`json\n${JSON.stringify(tool.inputSchema, null, 2)}\n\`\`\``
			).join('\n\n---\n\n');
			
			const doc = await vscode.workspace.openTextDocument({
				content: `# Available TazaPay MCP Tools\n\n${toolsText}\n\n*These tools can be used via @tazapay in Copilot Chat*`,
				language: 'markdown'
			});
			
			await vscode.window.showTextDocument(doc);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to fetch tools: ${error}`);
		}
	});

	// Execute tool command
	const executeToolCommand = vscode.commands.registerCommand('tazapay.executeTool', async (tool: TazaPayTool) => {
		if (!tazaPayClient || !tazaPayClient.isConnected()) {
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

			const result = await tazaPayClient.executeTool(tool.name, parameters);
			
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
	const askQuestionCommand = vscode.commands.registerCommand('tazapay.askQuestion', async () => {
		if (!tazaPayClient || !tazaPayClient.isConnected()) {
			vscode.window.showWarningMessage('Please authenticate first');
			return;
		}

		const question = await vscode.window.showInputBox({
			prompt: 'Ask a question about the TazaPay service documentation',
			placeHolder: 'How do I use the payment API?',
			ignoreFocusOut: true
		});

		if (!question) {
			return;
		}

		try {
			const answer = await tazaPayClient.askDocumentationQuestion(question);
			
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
	const generateCodeCommand = vscode.commands.registerCommand('tazapay.generateCode', async () => {
		if (!tazaPayClient || !tazaPayClient.isConnected()) {
			vscode.window.showWarningMessage('Please authenticate first');
			return;
		}

		const tools = tazaPayClient.getAvailableTools();
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

	// Test RAG service command
	const testRAGCommand = vscode.commands.registerCommand('tazapay.testRAG', async () => {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Testing TazaPay RAG Service...",
			cancellable: false
		}, async (progress) => {
			try {
				progress.report({ increment: 30, message: "Connecting to RAG service..." });
				
				const testResult = await ragClient.testConnection();
				
				progress.report({ increment: 70, message: "Processing response..." });
				
				if (testResult.working) {
					vscode.window.showInformationMessage(
						'✅ TazaPay RAG Service is working correctly!',
						'Test Query'
					).then(async (selection) => {
						if (selection === 'Test Query') {
							const testQuery = await vscode.window.showInputBox({
								prompt: 'Enter a test question for the RAG service',
								placeHolder: 'How do I create a payment?',
								ignoreFocusOut: true
							});
							
							if (testQuery) {
								try {
									const response = await ragClient.queryRAG(testQuery);
									const doc = await vscode.workspace.openTextDocument({
										content: `# RAG Service Test Result\n\n**Query:** ${testQuery}\n\n**Response:**\n${response}`,
										language: 'markdown'
									});
									await vscode.window.showTextDocument(doc);
								} catch (error) {
									vscode.window.showErrorMessage(`Test query failed: ${error}`);
								}
							}
						}
					});
				} else {
					vscode.window.showErrorMessage(
						'❌ TazaPay RAG Service is not responding correctly',
						'Show Details'
					).then(selection => {
						if (selection === 'Show Details') {
							vscode.window.showInformationMessage(testResult.message, { modal: true });
						}
					});
				}
			} catch (error) {
				vscode.window.showErrorMessage(`RAG service test failed: ${error}`);
			}
		});
	});

	context.subscriptions.push(
		showWelcomeCommand,
		openCopilotChatCommand,
		authenticateCommand,
		listToolsCommand,
		executeToolCommand,
		askQuestionCommand,
		generateCodeCommand,
		testRAGCommand
	);
}

function generateIntegrationCode(tool: TazaPayTool): string {
	return `// Integration code for ${tool.name}
// ${tool.description}

const axios = require('axios');

class TazaPayIntegration {
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
const tazapay = new TazaPayIntegration('YOUR_SERVER_URL', 'YOUR_SECRET_KEY');

// Call the tool
tazapay.${tool.name}({
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
	tazaPayClient = null;
}

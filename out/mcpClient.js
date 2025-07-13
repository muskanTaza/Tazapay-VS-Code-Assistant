"use strict";
/**
 * MCP (Model Context Protocol) Client for TazaPay
 *
 * This client connects to the TazaPay MCP server and provides access to TazaPay tools
 * via the MCP protocol. It handles tool discovery, execution, and communication with
 * the MCP server running in Docker.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TazaPayMCPClient = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const constants_1 = require("./constants");
class TazaPayMCPClient {
    constructor() {
        this.mcpProcess = null;
        this.tools = [];
        this.isConnected = false;
    }
    /**
     * Check if MCP server configuration exists and credentials are available
     */
    async isConfigured() {
        try {
            const config = vscode.workspace.getConfiguration();
            const mcpConfig = config.get('mcp');
            if (!mcpConfig?.servers?.[constants_1.TAZAPAY_CONFIG.MCP_SERVER_NAME]) {
                return false;
            }
            const tazapayConfig = vscode.workspace.getConfiguration('tazapay');
            const apiKey = tazapayConfig.get('apiKey');
            const secretKey = tazapayConfig.get('secretKey');
            return !!(apiKey && secretKey);
        }
        catch (error) {
            console.error('Error checking MCP configuration:', error);
            return false;
        }
    }
    /**
     * Start the MCP server and establish connection
     */
    async connect() {
        try {
            if (this.isConnected) {
                return true;
            }
            const isConfigured = await this.isConfigured();
            if (!isConfigured) {
                console.log('MCP server not configured');
                return false;
            }
            // Get credentials from VS Code settings
            const tazapayConfig = vscode.workspace.getConfiguration('tazapay');
            const apiKey = tazapayConfig.get('apiKey');
            const secretKey = tazapayConfig.get('secretKey');
            if (!apiKey || !secretKey) {
                console.log('API key or secret key not found');
                return false;
            }
            // Start the MCP server via Docker
            console.log('Starting TazaPay MCP server...');
            this.mcpProcess = (0, child_process_1.spawn)('docker', [
                'run', '--rm', '-i',
                '-e', `${constants_1.TAZAPAY_CONFIG.ENV_VARS.API_KEY}=${apiKey}`,
                '-e', `${constants_1.TAZAPAY_CONFIG.ENV_VARS.API_SECRET}=${secretKey}`,
                constants_1.TAZAPAY_CONFIG.MCP_DOCKER_IMAGE
            ]);
            // Set up process handlers
            this.mcpProcess.stdout?.on('data', (data) => {
                this.handleMCPOutput(data.toString());
            });
            this.mcpProcess.stderr?.on('data', (data) => {
                console.error('MCP server error:', data.toString());
            });
            this.mcpProcess.on('close', (code) => {
                console.log(`MCP server process exited with code ${code}`);
                this.isConnected = false;
                this.mcpProcess = null;
            });
            // Wait a moment for the server to start
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Try to discover tools
            await this.discoverTools();
            this.isConnected = true;
            console.log('MCP server connected successfully');
            return true;
        }
        catch (error) {
            console.error('Failed to connect to MCP server:', error);
            return false;
        }
    }
    /**
     * Disconnect from the MCP server
     */
    async disconnect() {
        if (this.mcpProcess) {
            this.mcpProcess.kill();
            this.mcpProcess = null;
        }
        this.isConnected = false;
        this.tools = [];
    }
    /**
     * Discover available tools from the MCP server
     */
    async discoverTools() {
        try {
            // Send MCP protocol message to list tools
            const message = {
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/list'
            };
            if (this.mcpProcess?.stdin) {
                this.mcpProcess.stdin.write(JSON.stringify(message) + '\n');
            }
            // Note: In a real implementation, you'd wait for the response
            // For now, we'll simulate some common TazaPay tools
            this.tools = [
                {
                    name: 'create_payment',
                    description: 'Create a new payment transaction',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            amount: { type: 'number' },
                            currency: { type: 'string' },
                            description: { type: 'string' },
                            buyer_email: { type: 'string' },
                            seller_email: { type: 'string' }
                        },
                        required: ['amount', 'currency', 'buyer_email', 'seller_email']
                    }
                },
                {
                    name: 'get_payment_status',
                    description: 'Get the status of a payment',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            payment_id: { type: 'string' }
                        },
                        required: ['payment_id']
                    }
                },
                {
                    name: 'get_account_balance',
                    description: 'Get account balance and available funds',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            currency: { type: 'string', description: 'Currency code (optional)' }
                        }
                    }
                },
                {
                    name: 'list_transactions',
                    description: 'List recent transactions',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            limit: { type: 'number', default: 10 },
                            status: { type: 'string', description: 'Filter by status' }
                        }
                    }
                }
            ];
        }
        catch (error) {
            console.error('Failed to discover tools:', error);
        }
    }
    /**
     * Handle output from the MCP server
     */
    handleMCPOutput(data) {
        try {
            // Parse MCP protocol messages
            const lines = data.trim().split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    const message = JSON.parse(line);
                    this.handleMCPMessage(message);
                }
            }
        }
        catch (error) {
            console.error('Failed to parse MCP output:', error);
        }
    }
    /**
     * Handle incoming MCP protocol messages
     */
    handleMCPMessage(message) {
        if (message.method === 'tools/list' && message.result) {
            this.tools = message.result.tools || [];
            console.log(`Discovered ${this.tools.length} MCP tools`);
        }
    }
    /**
     * Get the list of available tools
     */
    getTools() {
        return this.tools;
    }
    /**
     * Execute a tool with the given parameters
     */
    async executeTool(toolName, parameters) {
        try {
            if (!this.isConnected) {
                throw new Error('MCP server not connected');
            }
            const tool = this.tools.find(t => t.name === toolName);
            if (!tool) {
                throw new Error(`Tool ${toolName} not found`);
            }
            // Send MCP protocol message to call the tool
            const message = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: parameters
                }
            };
            console.log(`Executing MCP tool: ${toolName} with parameters:`, parameters);
            // Send command to MCP server
            if (this.mcpProcess?.stdin) {
                this.mcpProcess.stdin.write(JSON.stringify(message) + '\n');
                // Wait for response from MCP server
                return new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        // If no response in 10 seconds, return timeout message
                        resolve({
                            content: [
                                {
                                    type: 'text',
                                    text: `⏱️ **Timeout executing ${toolName}**\n\nThe MCP server didn't respond within 10 seconds. This might be because:\n- The server is still starting up\n- The tool is processing a complex request\n- There's a connectivity issue\n\nPlease try again in a moment.`
                                }
                            ],
                            isError: true
                        });
                    }, 10000);
                    // Listen for MCP response
                    const responseHandler = (data) => {
                        try {
                            const lines = data.toString().split('\n');
                            for (const line of lines) {
                                if (line.trim()) {
                                    const response = JSON.parse(line);
                                    if (response.id === message.id) {
                                        clearTimeout(timeout);
                                        this.mcpProcess?.stdout?.removeListener('data', responseHandler);
                                        if (response.result) {
                                            resolve({
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: `**${toolName} completed**\n\n\`\`\`json\n${JSON.stringify(response.result, null, 2)}\n\`\`\``
                                                    }
                                                ]
                                            });
                                        }
                                        else if (response.error) {
                                            resolve({
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: `❌ **Error executing ${toolName}**\n\n${response.error.message || JSON.stringify(response.error)}`
                                                    }
                                                ],
                                                isError: true
                                            });
                                        }
                                        return;
                                    }
                                }
                            }
                        }
                        catch (e) {
                            // Continue waiting for valid JSON
                        }
                    };
                    this.mcpProcess?.stdout?.on('data', responseHandler);
                });
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `❌ **MCP Server Not Available**\n\nCannot execute ${toolName} because the MCP server is not running.\n\nPlease ensure:\n- Docker is installed and running\n- Your credentials are configured\n- The MCP server image is available`
                        }
                    ],
                    isError: true
                };
            }
        }
        catch (error) {
            console.error(`Failed to execute tool ${toolName}:`, error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error executing ${toolName}: ${error}`
                    }
                ],
                isError: true
            };
        }
    }
    /**
     * Check if the client is connected to the MCP server
     */
    getConnectionStatus() {
        return this.isConnected;
    }
    /**
     * Try to find relevant tools for a given user query
     */
    findRelevantTools(query) {
        const lowerQuery = query.toLowerCase();
        // First try exact tool name matches
        const exactMatches = this.tools.filter(tool => lowerQuery.includes(tool.name.toLowerCase()) ||
            tool.name.toLowerCase().includes(lowerQuery.replace(/[^a-z0-9]/g, '')));
        if (exactMatches.length > 0) {
            return exactMatches;
        }
        // Then try description matches
        const descriptionMatches = this.tools.filter(tool => tool.description.toLowerCase().includes(lowerQuery) ||
            lowerQuery.includes(tool.description.toLowerCase()));
        if (descriptionMatches.length > 0) {
            return descriptionMatches;
        }
        // Finally try semantic matching
        return this.tools.filter(tool => this.isQueryRelevantToTool(lowerQuery, tool));
    }
    /**
     * Determine if a query is relevant to a specific tool
     */
    isQueryRelevantToTool(query, tool) {
        // Much more specific matching - require explicit intent
        // For create_payment tool
        if (tool.name === 'create_payment') {
            const createPaymentKeywords = [
                'create payment', 'make payment', 'new payment', 'send payment',
                'pay for', 'payment for', 'transfer money', 'send money'
            ];
            return createPaymentKeywords.some(keyword => query.includes(keyword));
        }
        // For get_payment_status tool
        if (tool.name === 'get_payment_status') {
            const statusKeywords = [
                'payment status', 'check payment', 'status of payment',
                'payment state', 'track payment', 'payment progress'
            ];
            return statusKeywords.some(keyword => query.includes(keyword));
        }
        // For list_transactions tool
        if (tool.name === 'list_transactions') {
            const listKeywords = [
                'list transactions', 'show transactions', 'my transactions',
                'transaction history', 'recent transactions', 'all transactions'
            ];
            return listKeywords.some(keyword => query.includes(keyword));
        }
        // For balance-related queries, we need a get_balance tool
        if (query.includes('balance') || query.includes('account balance')) {
            // Only match if we have a balance-related tool
            return tool.name.includes('balance') || tool.description.toLowerCase().includes('balance');
        }
        return false;
    }
}
exports.TazaPayMCPClient = TazaPayMCPClient;
//# sourceMappingURL=mcpClient.js.map
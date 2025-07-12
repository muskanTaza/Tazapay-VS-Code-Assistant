"use strict";
/**
 * TazaPay MCP Client
 *
 * This module provides a client interface for communicating with TazaPay's Model Context Protocol (MCP) services.
 * It handles authentication, tool discovery, and API execution for TazaPay payment and escrow operations.
 *
 * Features:
 * - Authentication with TazaPay MCP servers
 * - Dynamic tool discovery and listing
 * - Tool execution with parameter validation
 * - RAG-powered documentation queries
 * - Error handling and connection management
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPClient = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
/**
 * Main client class for TazaPay MCP integration
 * Manages authentication, tool discovery, and API communication
 */
class MCPClient {
    /**
     * Initialize MCP client with server URL and authentication credentials
     * @param serverUrl - Base URL for the TazaPay MCP API server
     * @param secretKey - Secret key for authentication (from TazaPay dashboard)
     */
    constructor(serverUrl, secretKey) {
        this.isAuthenticated = false; // Current authentication status
        this.tools = []; // Cached list of available tools from server
        this.serverUrl = serverUrl;
        this.secretKey = secretKey;
    }
    /**
     * Authenticate with the TazaPay MCP server using the provided secret key
     * Sets authentication status and updates VS Code context for UI state management
     * @returns Promise<boolean> - true if authentication successful, false otherwise
     */
    async authenticate() {
        try {
            // Send authentication request to MCP server
            const response = await axios_1.default.post(`${this.serverUrl}/auth`, {
                secretKey: this.secretKey
            });
            if (response.data.success) {
                this.isAuthenticated = true;
                // Update VS Code context to enable authenticated UI elements
                vscode.commands.executeCommand('setContext', 'tazapay-mcp.authenticated', true);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Authentication failed:', error);
            return false;
        }
    }
    /**
     * Fetch available tools from the TazaPay MCP server
     * Tools represent available API operations like create-payment, list-transactions, etc.
     * @returns Promise<MCPTool[]> - Array of available tools with their metadata
     * @throws Error if not authenticated or server request fails
     */
    async getTools() {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated');
        }
        try {
            // Request available tools from the server
            const response = await axios_1.default.get(`${this.serverUrl}/tools`, {
                headers: {
                    'Authorization': `Bearer ${this.secretKey}`
                }
            });
            // Cache tools locally for faster access
            this.tools = response.data.tools || [];
            return this.tools;
        }
        catch (error) {
            console.error('Failed to fetch tools:', error);
            throw error;
        }
    }
    /**
     * Execute a specific MCP tool with provided parameters
     * This is the main method for performing TazaPay API operations through the MCP interface
     * @param toolName - Name of the tool to execute (e.g., "create-payment")
     * @param parameters - Parameters required by the tool (validated against tool schema)
     * @returns Promise<MCPResponse> - Response from the tool execution
     * @throws Error if not authenticated, tool not found, or execution fails
     */
    async executeTool(toolName, parameters) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated');
        }
        // Find the tool in our cached list
        const tool = this.tools.find(t => t.name === toolName);
        if (!tool) {
            throw new Error(`Tool ${toolName} not found`);
        }
        try {
            // Execute the tool by calling its specific endpoint
            const response = await axios_1.default.post(`${this.serverUrl}${tool.endpoint}`, parameters, {
                headers: {
                    'Authorization': `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        }
        catch (error) {
            console.error(`Failed to execute tool ${toolName}:`, error);
            throw error;
        }
    }
    /**
     * Query the TazaPay documentation using RAG (Retrieval-Augmented Generation)
     * This provides intelligent answers to questions about TazaPay APIs, integration guides, etc.
     * @param question - Natural language question about TazaPay services
     * @returns Promise<string> - AI-generated answer based on TazaPay documentation
     * @throws Error if not authenticated or query fails
     */
    async askDocumentationQuestion(question) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated');
        }
        try {
            // Send question to RAG endpoint for intelligent documentation search
            const response = await axios_1.default.post(`${this.serverUrl}/rag/query`, {
                question: question
            }, {
                headers: {
                    'Authorization': `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data.answer || 'No answer found';
        }
        catch (error) {
            console.error('Failed to ask documentation question:', error);
            throw error;
        }
    }
    /**
     * Get the cached list of available tools
     * Returns tools that were fetched during the last successful getTools() call
     * @returns MCPTool[] - Array of cached tools (empty if not yet fetched)
     */
    getAvailableTools() {
        return this.tools;
    }
    /**
     * Check if the client is currently authenticated and connected to the server
     * @returns boolean - true if authenticated, false otherwise
     */
    isConnected() {
        return this.isAuthenticated;
    }
}
exports.MCPClient = MCPClient;
//# sourceMappingURL=mcpClient.js.map
"use strict";
/**
 * TazaPay RAG (Retrieval-Augmented Generation) Client
 *
 * This client provides intelligent question-answering capabilities for TazaPay documentation
 * and integration guides. It connects to TazaPay's public RAG endpoint to provide contextual
 * answers based on the official documentation, API guides, and best practices.
 *
 * Features:
 * - Natural language queries about TazaPay services
 * - Context-aware responses from official documentation
 * - Fallback error handling for network issues
 * - Rate limiting and timeout management
 * - Integration examples and troubleshooting guidance
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
exports.TazaPayRAGClient = void 0;
const axios_1 = __importDefault(require("axios"));
const vscode = __importStar(require("vscode"));
/**
 * Client for querying TazaPay's documentation using RAG technology
 * Provides intelligent responses to developer questions about TazaPay integration
 */
class TazaPayRAGClient {
    /**
     * Initialize the RAG client with configuration from VS Code settings
     * Uses configured server URL or defaults to TazaPay's production API
     */
    constructor() {
        const config = vscode.workspace.getConfiguration('tazapay-mcp');
        this.baseUrl = config.get('serverUrl') || 'https://api.tazapay.com';
    }
    /**
     * Query TazaPay's RAG system with a natural language question
     * Provides intelligent responses based on TazaPay's documentation and best practices
     * @param question - Natural language question about TazaPay services
     * @returns Promise<string> - AI-generated response with relevant information
     */
    async queryRAG(question) {
        try {
            // Send question to TazaPay's public RAG endpoint
            const response = await axios_1.default.post(`${this.baseUrl}/public/rag/query`, {
                question: question,
                source: 'vscode-copilot' // Identify requests from VS Code extension
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'TazaPay-VSCode-Extension/1.0.0'
                },
                timeout: 30000 // 30 second timeout for RAG queries
            });
            return response.data.answer || 'I apologize, but I couldn\'t find a relevant answer to your question. Please try rephrasing your question or contact TazaPay support for more specific help.';
        }
        catch (error) {
            console.error('RAG query failed:', error);
            // Provide specific error messages based on failure type
            if (axios_1.default.isAxiosError(error)) {
                if (error.code === 'ECONNABORTED') {
                    return 'The request timed out. Please try again or contact TazaPay support.';
                }
                if (error.response?.status === 404) {
                    return 'The RAG service is currently unavailable. Please try again later or contact TazaPay support.';
                }
                if (error.response?.status === 429) {
                    return 'Too many requests. Please wait a moment and try again.';
                }
            }
            return 'I encountered an error while processing your question. Please try again or contact TazaPay support for assistance.';
        }
    }
    /**
     * Get a quick help message with common topics and example questions
     * Used as a fallback when users ask for help or when queries fail
     * @returns Promise<string> - Formatted help message with examples
     */
    async getQuickHelp() {
        return `Hi! I'm TazaPay's AI assistant. I can help you with:

🔹 **Payment APIs** - Integration guides, endpoints, and examples
🔹 **Escrow Services** - How to use TazaPay's escrow features
🔹 **Authentication** - API keys, webhooks, and security
🔹 **Troubleshooting** - Common issues and solutions
🔹 **SDKs & Libraries** - Available tools and documentation

Try asking me things like:
- "How do I create a payment with TazaPay?"
- "What are the webhook events available?"
- "How does TazaPay's escrow work?"
- "Show me a JavaScript integration example"

What would you like to know about TazaPay?`;
    }
}
exports.TazaPayRAGClient = TazaPayRAGClient;
//# sourceMappingURL=ragClient.js.map
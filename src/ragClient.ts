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

import axios from 'axios';
import * as vscode from 'vscode';
import { TAZAPAY_CONFIG } from './constants';

/**
 * Client for querying TazaPay's documentation using RAG technology
 * Provides intelligent responses to developer questions about TazaPay integration
 */
export class TazaPayRAGClient {
  private baseUrl: string;  // Base URL for TazaPay API endpoints

  /**
   * Initialize the RAG client with configuration from VS Code settings
   * Uses configured server URL or defaults to TazaPay's production API
   */
  constructor() {
    const config = vscode.workspace.getConfiguration('tazapay-mcp');
    this.baseUrl = config.get<string>('serverUrl') || TAZAPAY_CONFIG.DEFAULT_SERVER_URL;
  }

  /**
   * Query TazaPay's RAG system with a natural language question
   * Provides intelligent responses based on TazaPay's documentation and best practices
   * @param question - Natural language question about TazaPay services
   * @returns Promise<string> - AI-generated response with relevant information
   */
  async queryRAG(question: string): Promise<string> {
    try {
      // Send question to TazaPay's public RAG endpoint
      const response = await axios.post(`${this.baseUrl}/public/rag/query`, {
        question: question,
        source: 'vscode-copilot'  // Identify requests from VS Code extension
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TazaPay-VSCode-Extension/1.0.0'
        },
        timeout: 30000  // 30 second timeout for RAG queries
      });

      return response.data.answer || 'I apologize, but I couldn\'t find a relevant answer to your question. Please try rephrasing your question or contact TazaPay support for more specific help.';
    } catch (error) {
      console.error('RAG query failed:', error);
      
      // Provide specific error messages based on failure type
      if (axios.isAxiosError(error)) {
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
  async getQuickHelp(): Promise<string> {
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
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
    const config = vscode.workspace.getConfiguration('tazapay');
    this.baseUrl = config.get<string>('serverUrl') || TAZAPAY_CONFIG.DEFAULT_SERVER_URL;
    console.log('RAG Client initialized with baseUrl:', this.baseUrl);
  }

  /**
   * Query TazaPay's RAG system with a natural language question
   * Provides intelligent responses based on TazaPay's documentation and best practices
   * @param question - Natural language question about TazaPay services
   * @returns Promise<string> - AI-generated response with relevant information
   */
  async queryRAG(question: string): Promise<string> {
    try {
      console.log('RAG Client making request to:', `${this.baseUrl}/process`);
      console.log('RAG Client query:', question);
      
      // Send question to TazaPay's public RAG endpoint
      const response = await axios.post(`${this.baseUrl}/process`, {
        user_input: question,
        source: 'vscode-copilot'  // Identify requests from VS Code extension
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TazaPay-VSCode-Extension/1.0.0'
        },
        timeout: 30000  // 30 second timeout for RAG queries
      });

      console.log('RAG Client response status:', response.status);
      console.log('RAG Client response data:', response.data);

      // Handle different response formats
      if (response.data) {
        // Try different possible response structures
        if (response.data.result?.answer) {
          return response.data.result.answer;
        }
        if (response.data.answer) {
          return response.data.answer;
        }
        if (response.data.response) {
          return response.data.response;
        }
        if (typeof response.data === 'string') {
          return response.data;
        }
        if (response.data.message) {
          return response.data.message;
        }
      }

      return 'I received a response from the TazaPay service, but couldn\'t parse the answer format. Please try rephrasing your question or contact TazaPay support for more specific help.';
    } catch (error) {
      console.error('RAG query failed:', error);
      
      // Provide specific error messages based on failure type
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          method: error.config?.method
        });
        
        if (error.code === 'ECONNABORTED') {
          return `⏱️ **Request Timed Out**
          
The TazaPay RAG service didn't respond within 30 seconds. This might be due to:
- Heavy server load
- Network connectivity issues

Please try again in a moment.`;
        }
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          return `🌐 **Connection Failed**
          
Could not connect to TazaPay RAG service at: \`${this.baseUrl}/process\`

This might be because:
- The server is not running
- The URL is incorrect
- Network connectivity issues

Please check the server URL in your settings.`;
        }
        
        if (error.response?.status === 404) {
          return `🔍 **Service Not Found**
          
The RAG endpoint was not found at: \`${this.baseUrl}/process\`

Please verify:
- The server URL is correct
- The RAG service is deployed and running
- The endpoint path is correct`;
        }
        
        if (error.response?.status === 429) {
          return '🚦 **Rate Limit Exceeded**\n\nToo many requests sent to the TazaPay service. Please wait a moment and try again.';
        }
        
        if (error.response?.status && error.response.status >= 500) {
          return `🔧 **Server Error**
          
The TazaPay RAG service encountered an internal error (${error.response.status}).

Please try again later or contact TazaPay support if the issue persists.`;
        }
      }
      
      return `❌ **Error Processing Request**
      
I encountered an unexpected error while processing your question:
\`${error}\`

Please try again or contact TazaPay support for assistance.`;
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

  /**
   * Test the RAG service connectivity and response
   * @returns Promise<boolean> - True if the service is working
   */
  async testConnection(): Promise<{ working: boolean; message: string }> {
    try {
      console.log('Testing RAG service connection...');
      const testResponse = await this.queryRAG('Hello, test connection');
      
      if (testResponse.includes('Connection Failed') || testResponse.includes('Service Not Found') || testResponse.includes('Error Processing Request')) {
        return {
          working: false,
          message: testResponse
        };
      }
      
      return {
        working: true,
        message: 'RAG service is responding correctly'
      };
    } catch (error) {
      return {
        working: false,
        message: `RAG service test failed: ${error}`
      };
    }
  }
}
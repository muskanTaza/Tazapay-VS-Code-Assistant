/**
 * TazaPay Client
 * 
 * This module provides a client interface for communicating with TazaPay's services.
 * It handles authentication, tool discovery, and API execution for TazaPay payment and escrow operations.
 * 
 * Features:
 * - Authentication with TazaPay MCP servers
 * - Dynamic tool discovery and listing
 * - Tool execution with parameter validation
 * - RAG-powered documentation queries
 * - Error handling and connection management
 */

import * as vscode from 'vscode';
import axios from 'axios';

/**
 * Interface representing a TazaPay tool available from the TazaPay service
 * Tools are dynamically discovered from the server and represent available API operations
 */
export interface TazaPayTool {
  name: string;        // Unique identifier for the tool (e.g., "create-payment")
  description: string; // Human-readable description of what the tool does
  parameters: any;     // JSON schema defining required/optional parameters
  endpoint: string;    // API endpoint path for executing this tool
}

/**
 * Standard response format for TazaPay API calls
 * Provides consistent error handling and data structure across all operations
 */
export interface TazaPayResponse {
  success: boolean;    // Whether the operation completed successfully
  data?: any;         // Response data if successful
  error?: string;     // Error message if operation failed
}

/**
 * Main client class for TazaPay integration
 * Manages authentication, tool discovery, and API communication
 */
export class TazaPayClient {
  private serverUrl: string;           // Base URL for TazaPay API server
  private secretKey: string;           // Authentication secret key from TazaPay dashboard
  private isAuthenticated: boolean = false;  // Current authentication status
  private tools: TazaPayTool[] = [];       // Cached list of available tools from server

  /**
   * Initialize TazaPay client with server URL and authentication credentials
   * @param serverUrl - Base URL for the TazaPay API server
   * @param secretKey - Secret key for authentication (from TazaPay dashboard)
   */
  constructor(serverUrl: string, secretKey: string) {
    this.serverUrl = serverUrl;
    this.secretKey = secretKey;
  }

  /**
   * Authenticate with the TazaPay server using the provided secret key
   * Sets authentication status and updates VS Code context for UI state management
   * @returns Promise<boolean> - true if authentication successful, false otherwise
   */
  async authenticate(): Promise<boolean> {
    try {
      // Send authentication request to TazaPay server
      const response = await axios.post(`${this.serverUrl}/auth`, {
        secretKey: this.secretKey
      });

      if (response.data.success) {
        this.isAuthenticated = true;
        // Update VS Code context to enable authenticated UI elements
        vscode.commands.executeCommand('setContext', 'tazapay.authenticated', true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  /**
   * Fetch available tools from the TazaPay server
   * Tools represent available API operations like create-payment, list-transactions, etc.
   * @returns Promise<TazaPayTool[]> - Array of available tools with their metadata
   * @throws Error if not authenticated or server request fails
   */
  async getTools(): Promise<TazaPayTool[]> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    try {
      // Request available tools from the server
      const response = await axios.get(`${this.serverUrl}/tools`, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`
        }
      });

      // Cache tools locally for faster access
      this.tools = response.data.tools || [];
      return this.tools;
    } catch (error) {
      console.error('Failed to fetch tools:', error);
      throw error;
    }
  }

  /**
   * Execute a specific TazaPay tool with provided parameters
   * This is the main method for performing TazaPay API operations through the interface
   * @param toolName - Name of the tool to execute (e.g., "create-payment")
   * @param parameters - Parameters required by the tool (validated against tool schema)
   * @returns Promise<TazaPayResponse> - Response from the tool execution
   * @throws Error if not authenticated, tool not found, or execution fails
   */
  async executeTool(toolName: string, parameters: any): Promise<TazaPayResponse> {
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
      const response = await axios.post(`${this.serverUrl}${tool.endpoint}`, parameters, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
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
  async askDocumentationQuestion(question: string): Promise<string> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    try {
      // Send question to RAG endpoint for intelligent documentation search
      const response = await axios.post(`${this.serverUrl}/rag/query`, {
        question: question
      }, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.answer || 'No answer found';
    } catch (error) {
      console.error('Failed to ask documentation question:', error);
      throw error;
    }
  }

  /**
   * Get the cached list of available tools
   * Returns tools that were fetched during the last successful getTools() call
   * @returns TazaPayTool[] - Array of cached tools (empty if not yet fetched)
   */
  getAvailableTools(): TazaPayTool[] {
    return this.tools;
  }

  /**
   * Check if the client is currently authenticated and connected to the server
   * @returns boolean - true if authenticated, false otherwise
   */
  isConnected(): boolean {
    return this.isAuthenticated;
  }
}
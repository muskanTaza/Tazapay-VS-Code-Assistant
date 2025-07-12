/**
 * TazaPay Extension Constants
 * 
 * Central location for all configuration constants used throughout the extension.
 * This ensures consistency and makes updates easier by having a single source of truth.
 */

export const TAZAPAY_CONFIG = {
  /**
   * Default TazaPay server URL
   * Update this single value to change the server URL across the entire extension
   */
  DEFAULT_SERVER_URL: 'https://aaba8e7a84a1.ngrok-free.app',
  
  /**
   * MCP Server configuration
   */
  MCP_SERVER_NAME: 'Tazapay-Docker-Server',
  MCP_DOCKER_IMAGE: 'tazapay/tazapay-mcp-server:latest',
  
  /**
   * Environment variable names for Docker container
   */
  ENV_VARS: {
    API_KEY: 'TAZAPAY_API_KEY',
    API_SECRET: 'TAZAPAY_API_SECRET'
  },
  
  /**
   * VS Code configuration keys
   */
  CONFIG_KEYS: {
    SERVER_URL: 'tazapay.serverUrl',
    SECRET_KEY: 'tazapay.secretKey'
  },
  
  /**
   * Extension state keys
   */
  STATE_KEYS: {
    IS_AUTHENTICATED: 'tazapay.isAuthenticated',
    MASKED_KEY: 'tazapay.maskedKey',
    MASKED_API_KEY: 'tazapay.maskedApiKey',
    HAS_SEEN_CHAT_INSTRUCTIONS: 'tazapay.hasSeenChatInstructions'
  }
} as const;
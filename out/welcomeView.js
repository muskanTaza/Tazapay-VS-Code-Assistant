"use strict";
/**
 * Welcome View Provider for TazaPay MCP Integration
 *
 * This class manages the main welcome/setup view that appears in the sidebar.
 * It provides:
 * - Quick access to Copilot Chat with @tazapay
 * - Authentication interface for TazaPay secret keys
 * - Persistent authentication state management
 * - Feature showcase and onboarding
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
exports.WelcomeViewProvider = void 0;
const vscode = __importStar(require("vscode"));
class WelcomeViewProvider {
    constructor(_extensionUri, // Extension's URI for resource loading
    _context // Extension context for state management
    ) {
        this._extensionUri = _extensionUri;
        this._context = _context;
    }
    /**
     * Called by VS Code when the webview needs to be created
     * Sets up the webview options, HTML content, and message handlers
     */
    resolveWebviewView(webviewView, context, _token) {
        // Store reference for later messaging
        this._webviewView = webviewView;
        // Configure webview security and capabilities
        webviewView.webview.options = {
            enableScripts: true, // Allow JavaScript execution
            localResourceRoots: [
                this._extensionUri
            ]
        };
        // Generate and set the HTML content for the webview
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Set up message handler for communication between webview and extension
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'openCopilotChat':
                    // Handle request to open Copilot Chat with @tazapay
                    this._showChatInstructions();
                    break;
                case 'authenticate':
                    // Handle authentication request with secret key
                    const secretKey = message.secretKey;
                    if (secretKey) {
                        this._authenticateWithSecretKey(secretKey);
                    }
                    break;
                case 'deleteKey':
                    // Handle request to delete saved secret key
                    this._deleteSecretKey();
                    break;
                case 'getAuthState':
                    // Handle request for current authentication state
                    this._sendCurrentAuthState();
                    break;
                case 'showCommands':
                    // Handle request to show VS Code command palette
                    vscode.commands.executeCommand('workbench.action.showCommands');
                    break;
            }
        }, undefined, this._context.subscriptions);
    }
    /**
     * Show instructions for using the TazaPay chat participant
     * Implements smart behavior - shows detailed instructions first time, opens chat directly after
     */
    _showChatInstructions() {
        // Check if user has seen instructions before (for better UX)
        const hasSeenInstructions = this._context.globalState.get('tazapay.hasSeenChatInstructions', false);
        if (!hasSeenInstructions) {
            // First time - show instructions
            this._context.globalState.update('tazapay.hasSeenChatInstructions', true);
            const message = `
🤖 **TazaPay AI Assistant Setup**

**To use @tazapay in Copilot Chat:**
1. Open Copilot Chat (Ctrl+Alt+I or Cmd+Alt+I)
2. Type: **@tazapay** followed by your question
3. Get help with payments, APIs, and integration guides

**Example questions:**
• @tazapay How do I create a payment?
• @tazapay What are the webhook events?
• @tazapay Show me integration examples
      `.trim();
            vscode.window.showInformationMessage('TazaPay AI Assistant Ready!', 'Open Copilot Chat', 'Learn More').then(async (selection) => {
                if (selection === 'Open Copilot Chat') {
                    this._tryOpenCopilotChat();
                }
                else if (selection === 'Learn More') {
                    vscode.window.showInformationMessage(message, { modal: true });
                }
            });
        }
        else {
            // Subsequent times - directly try to open Copilot Chat
            this._tryOpenCopilotChat();
        }
    }
    async _tryOpenCopilotChat() {
        try {
            // Try to open Copilot Chat with @tazapay pre-filled
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                query: '@tazapay '
            });
        }
        catch {
            try {
                // Fallback: try opening chat first, then add @tazapay
                await vscode.commands.executeCommand('workbench.action.chat.open');
                // Small delay to let chat open, then try to add @tazapay
                setTimeout(async () => {
                    try {
                        await vscode.commands.executeCommand('workbench.action.chat.open', {
                            query: '@tazapay '
                        });
                    }
                    catch {
                        // If that fails, just show a helpful message
                        vscode.window.showInformationMessage('Copilot Chat opened! Type "@tazapay" to get TazaPay assistance.');
                    }
                }, 500);
            }
            catch {
                try {
                    await vscode.commands.executeCommand('workbench.panel.chat.focus');
                    vscode.window.showInformationMessage('Chat panel opened! Type "@tazapay" to get TazaPay assistance.');
                }
                catch {
                    try {
                        await vscode.commands.executeCommand('workbench.view.chat.focus');
                        vscode.window.showInformationMessage('Chat view opened! Type "@tazapay" to get TazaPay assistance.');
                    }
                    catch {
                        vscode.window.showInformationMessage('Please open Copilot Chat manually (Ctrl+Alt+I or Cmd+Alt+I) and type "@tazapay" for assistance.', 'Reset Instructions').then(selection => {
                            if (selection === 'Reset Instructions') {
                                this._context.globalState.update('tazapay.hasSeenChatInstructions', false);
                            }
                        });
                    }
                }
            }
        }
    }
    async _authenticateWithSecretKey(secretKey) {
        try {
            const config = vscode.workspace.getConfiguration('tazapay-mcp');
            await config.update('secretKey', secretKey, vscode.ConfigurationTarget.Global);
            // Trigger authentication - this will show its own success/error messages
            await vscode.commands.executeCommand('tazapay-mcp.authenticate');
            // Save authentication state
            await this._context.globalState.update('tazapay.isAuthenticated', true);
            await this._context.globalState.update('tazapay.maskedKey', this._maskSecretKey(secretKey));
            // Send success message back to webview to reset button state (no duplicate message)
            this._sendMessageToWebview('authenticationResult', {
                success: true,
                maskedKey: this._maskSecretKey(secretKey)
            });
        }
        catch (error) {
            // Send error message back to webview to reset button state (extension command will show error)
            this._sendMessageToWebview('authenticationResult', { success: false, error: String(error) });
        }
    }
    async _deleteSecretKey() {
        // Show confirmation dialog
        const confirmation = await vscode.window.showWarningMessage('Are you sure you want to delete the saved TazaPay secret key?', { modal: true }, 'Delete', 'Cancel');
        if (confirmation !== 'Delete') {
            return; // User cancelled
        }
        try {
            const config = vscode.workspace.getConfiguration('tazapay-mcp');
            await config.update('secretKey', undefined, vscode.ConfigurationTarget.Global);
            // Clear authentication state
            await this._context.globalState.update('tazapay.isAuthenticated', false);
            await this._context.globalState.update('tazapay.maskedKey', undefined);
            // Send deletion confirmation to webview
            this._sendMessageToWebview('keyDeleted', {});
            vscode.window.showInformationMessage('Secret key deleted successfully.');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to delete secret key: ${error}`);
        }
    }
    async _sendCurrentAuthState() {
        const isAuthenticated = this._context.globalState.get('tazapay.isAuthenticated', false);
        const maskedKey = this._context.globalState.get('tazapay.maskedKey', '');
        this._sendMessageToWebview('loadAuthState', {
            authenticated: isAuthenticated,
            maskedKey: maskedKey
        });
    }
    _maskSecretKey(secretKey) {
        if (secretKey.length <= 8) {
            return '••••••••';
        }
        const start = secretKey.substring(0, 4);
        const end = secretKey.substring(secretKey.length - 4);
        return `${start}••••••••${end}`;
    }
    _sendMessageToWebview(command, data) {
        if (this._webviewView) {
            this._webviewView.webview.postMessage({ command, ...data });
        }
    }
    _getHtmlForWebview(webview) {
        const nonce = getNonce();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>TazaPay MCP Welcome</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
            line-height: 1.6;
        }     
        .section h3 {
            margin-top: 0;
            color: var(--vscode-textLink-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .icon {
            font-size: 1.2em;
        }
        .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 400;
            width: 100%;
            margin-bottom: 10px;
            transition: background-color 0.2s;
        }
        .button:hover:not(:disabled) {
            background-color: var(--vscode-button-hoverBackground);
        }
        .button:disabled {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: not-allowed;
            opacity: 0.6;
        }
        .button.primary {
            background-color: var(--vscode-button-background);            
        }
        .button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .input-group {
            margin-bottom: 15px;
        }
        .input-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        .input-group input {
            width: 100%;
            padding: 10px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-size: 13px;
            box-sizing: border-box;
        }
        .input-group input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        .input-group input:disabled {
            background-color: var(--vscode-input-background);
            opacity: 0.7;
            cursor: not-allowed;
        }
        .key-input-container {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .key-input-container input {
            flex: 1;
        }
        .button.small {
            padding: 6px 10px;
            font-size: 12px;
            min-width: auto;
            width: auto;
            margin-bottom: 0;
        }
        .help-text {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
        .features {
            display: grid;
            gap: 15px;
            margin-top: 20px;
        }
        .feature {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
        }
        .feature-icon {
            font-size: 1.5em;
        }
        .feature-text {
            flex: 1;
        }
        .feature-title {
            font-weight: 500;
            margin-bottom: 2px;
        }
        .feature-desc {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .divider {
            height: 1px;
            background-color: var(--vscode-panel-border);
            margin: 20px 0;
        }
    </style>
</head>
<body>

    <div class="section">
        <div class="input-group">
            <label>Welcome!</label>
            <button class="button primary" id="openCopilotChatBtn">
                💬 Ask a question
            </button>
            <div class="help-text">
                Chat with the TazaPay assistant using GitHub Copilot.
            </div>
        </div>
    </div>

    <div class="divider"></div>

    <div class="section">        
        <p>Unlock powerful MCP tools by authenticating</p>
        
        <div class="input-group">         
            <div class="key-input-container">
                <input 
                    type="password" 
                    id="secretKey" 
                    placeholder="Enter your TazaPay secret key..."
                    autocomplete="off"
                >
                <button class="button secondary small" id="deleteKeyBtn" style="display: none;">
                    🗑️ Delete
                </button>
            </div>
            <div class="help-text" id="keyStatus"></div>
        </div>
        
        <button class="button" id="authenticateBtn" disabled>
            Authenticate & Enable Tools
        </button>
    </div>

    <div class="features">
        <div class="feature">
            <div class="feature-icon">🔍</div>
            <div class="feature-text">
                <div class="feature-title">Tool Discovery</div>
                <div class="feature-desc">Automatically discover available TazaPay APIs</div>
            </div>
        </div>
        <div class="feature">
            <div class="feature-icon">⚡</div>
            <div class="feature-text">
                <div class="feature-title">Direct Execution</div>
                <div class="feature-desc">Execute API calls directly from VS Code</div>
            </div>
        </div>
        <div class="feature">
            <div class="feature-icon">💻</div>
            <div class="feature-text">
                <div class="feature-title">Code Generation</div>
                <div class="feature-desc">Generate integration code templates</div>
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        function openCopilotChat() {
            vscode.postMessage({
                command: 'openCopilotChat'
            });
        }

        let isAuthenticated = false;

        function authenticate() {
            const secretKeyInput = document.getElementById('secretKey');
            const authenticateBtn = document.getElementById('authenticateBtn');
            const secretKey = secretKeyInput.value.trim();
            
            if (!secretKey) {
                return; // Button should be disabled anyway
            }
            
            // Disable button and show loading state
            authenticateBtn.disabled = true;
            authenticateBtn.textContent = 'Authenticating...';
            
            vscode.postMessage({
                command: 'authenticate',
                secretKey: secretKey
            });
        }

        function deleteKey() {
            vscode.postMessage({
                command: 'deleteKey'
            });
        }

        function updateUIState(authenticated = false, maskedKey = '') {
            const secretKeyInput = document.getElementById('secretKey');
            const authenticateBtn = document.getElementById('authenticateBtn');
            const deleteKeyBtn = document.getElementById('deleteKeyBtn');
            const keyStatus = document.getElementById('keyStatus');
            
            isAuthenticated = authenticated;
            
            if (authenticated) {
                // Authenticated state
                secretKeyInput.value = maskedKey;
                secretKeyInput.disabled = true;
                authenticateBtn.style.display = 'none';
                deleteKeyBtn.style.display = 'inline-block';
                keyStatus.textContent = '✅ Secret key saved and authenticated';
                keyStatus.style.color = 'var(--vscode-testing-iconPassed)';
            } else {
                // Unauthenticated state
                secretKeyInput.value = '';
                secretKeyInput.disabled = false;
                secretKeyInput.placeholder = 'Enter your TazaPay secret key...';
                authenticateBtn.style.display = 'inline-block';
                authenticateBtn.textContent = 'Authenticate & Enable Tools';
                authenticateBtn.disabled = true; // Start disabled until user types
                deleteKeyBtn.style.display = 'none';
                keyStatus.textContent = '';
                keyStatus.style.color = '';
                // Force button state update
                setTimeout(updateButtonState, 0);
            }
        }

        function updateButtonState() {
            if (isAuthenticated) return; // Don't update if authenticated
            
            const secretKeyInput = document.getElementById('secretKey');
            const authenticateBtn = document.getElementById('authenticateBtn');
            const hasValue = secretKeyInput.value.trim().length > 0;
            
            authenticateBtn.disabled = !hasValue;
            if (!authenticateBtn.disabled) {
                authenticateBtn.textContent = 'Authenticate & Enable Tools';
            }
        }

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.command === 'authenticationResult') {
                const authenticateBtn = document.getElementById('authenticateBtn');
                if (message.success) {
                    authenticateBtn.textContent = '✅ Authenticated!';
                    setTimeout(() => {
                        updateUIState(true, message.maskedKey || '••••••••••••••••');
                    }, 1000);
                } else {
                    authenticateBtn.textContent = '❌ Failed - Try Again';
                    setTimeout(() => {
                        authenticateBtn.textContent = 'Authenticate & Enable Tools';
                        updateButtonState();
                    }, 2000);
                }
            } else if (message.command === 'loadAuthState') {
                // Load saved authentication state on startup
                updateUIState(message.authenticated, message.maskedKey || '••••••••••••••••');
            } else if (message.command === 'keyDeleted') {
                // Reset to unauthenticated state after deletion
                updateUIState(false);
            }
        });

        // Add event listeners when DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            // Add click listener for Copilot Chat button
            document.getElementById('openCopilotChatBtn').addEventListener('click', openCopilotChat);
            
            // Add click listener for authenticate button
            document.getElementById('authenticateBtn').addEventListener('click', authenticate);
            
            // Add click listener for delete key button
            document.getElementById('deleteKeyBtn').addEventListener('click', deleteKey);
            
            // Add input event listener for real-time validation
            document.getElementById('secretKey').addEventListener('input', updateButtonState);
            
            // Handle Enter key in secret key input
            document.getElementById('secretKey').addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !document.getElementById('authenticateBtn').disabled && !isAuthenticated) {
                    authenticate();
                }
            });
            
            // Request current authentication state on load
            vscode.postMessage({ command: 'getAuthState' });
            
            // Initial button state check
            updateButtonState();
        });
    </script>
</body>
</html>`;
    }
}
exports.WelcomeViewProvider = WelcomeViewProvider;
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=welcomeView.js.map
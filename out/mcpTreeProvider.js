"use strict";
/**
 * MCP Tree Provider for VS Code Explorer Panel
 *
 * This module provides a tree view in the VS Code explorer for displaying and managing
 * TazaPay MCP tools. Users can see available tools, their descriptions, and execute them
 * directly from the sidebar interface.
 *
 * Features:
 * - Tree view display of available MCP tools
 * - Click-to-execute functionality for tools
 * - Real-time updates when tools are refreshed
 * - Tooltip descriptions for each tool
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
exports.MCPTreeProvider = exports.MCPTreeItem = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Individual tree item representing an MCP tool in the explorer
 * Each item displays the tool name, description, and provides execution capability
 */
class MCPTreeItem extends vscode.TreeItem {
    /**
     * Create a new tree item for displaying an MCP tool
     * @param label - Display name for the tree item
     * @param description - Description shown in tooltip
     * @param tool - Optional MCPTool object for executable items
     * @param collapsibleState - Whether item can be expanded/collapsed
     */
    constructor(label, description, tool, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.tool = tool;
        this.collapsibleState = collapsibleState;
        this.tooltip = description;
        // Set up click command for tool execution (only for tools, not categories)
        this.command = tool ? {
            command: 'tazapay-mcp.executeTool',
            title: 'Execute Tool',
            arguments: [tool]
        } : undefined;
    }
}
exports.MCPTreeItem = MCPTreeItem;
/**
 * Tree data provider for the MCP tools view in VS Code explorer
 * Manages the display and interaction with TazaPay MCP tools in the sidebar
 */
class MCPTreeProvider {
    constructor() {
        // Event emitter for notifying VS Code when tree data changes
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.tools = []; // Cached list of available tools
    }
    /**
     * Trigger a refresh of the tree view
     * This will cause VS Code to re-query the tree data and update the display
     */
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    /**
     * Update the list of available tools and refresh the tree view
     * Called when authentication completes and tools are fetched from server
     * @param tools - Array of MCP tools to display
     */
    updateTools(tools) {
        this.tools = tools;
        this.refresh();
    }
    /**
     * Get the tree item representation for display in VS Code
     * Required by TreeDataProvider interface
     * @param element - Tree item to get display info for
     * @returns The tree item for VS Code to display
     */
    getTreeItem(element) {
        return element;
    }
    /**
     * Get children for a tree item (for hierarchical display)
     * Currently shows a flat list of tools, but could be extended for categories
     * @param element - Parent element (undefined for root level)
     * @returns Promise resolving to array of child items
     */
    getChildren(element) {
        if (!element) {
            // Root level - show all tools as non-collapsible items
            return Promise.resolve(this.tools.map(tool => new MCPTreeItem(tool.name, tool.description, tool, vscode.TreeItemCollapsibleState.None)));
        }
        // No children for individual tool items (flat structure)
        return Promise.resolve([]);
    }
}
exports.MCPTreeProvider = MCPTreeProvider;
//# sourceMappingURL=mcpTreeProvider.js.map
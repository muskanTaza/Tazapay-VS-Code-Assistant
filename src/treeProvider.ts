/**
 * TazaPay Tree Provider for VS Code Explorer Panel
 * 
 * This module provides a tree view in the VS Code explorer for displaying and managing
 * TazaPay tools. Users can see available tools, their descriptions, and execute them
 * directly from the sidebar interface.
 * 
 * Features:
 * - Tree view display of available TazaPay tools
 * - Click-to-execute functionality for tools
 * - Real-time updates when tools are refreshed
 * - Tooltip descriptions for each tool
 */

import * as vscode from 'vscode';
import { TazaPayTool } from './client';

/**
 * Individual tree item representing a TazaPay tool in the explorer
 * Each item displays the tool name, description, and provides execution capability
 */
export class TazaPayTreeItem extends vscode.TreeItem {
  /**
   * Create a new tree item for displaying a TazaPay tool
   * @param label - Display name for the tree item
   * @param description - Description shown in tooltip
   * @param tool - Optional TazaPayTool object for executable items
   * @param collapsibleState - Whether item can be expanded/collapsed
   */
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly tool?: TazaPayTool,
    public readonly collapsibleState?: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = description;
    // Set up click command for tool execution (only for tools, not categories)
    this.command = tool ? {
      command: 'tazapay.executeTool',
      title: 'Execute Tool',
      arguments: [tool]
    } : undefined;
  }
}

/**
 * Tree data provider for the TazaPay tools view in VS Code explorer
 * Manages the display and interaction with TazaPay tools in the sidebar
 */
export class TazaPayTreeProvider implements vscode.TreeDataProvider<TazaPayTreeItem> {
  // Event emitter for notifying VS Code when tree data changes
  private _onDidChangeTreeData: vscode.EventEmitter<TazaPayTreeItem | undefined | null | void> = new vscode.EventEmitter<TazaPayTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TazaPayTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private tools: TazaPayTool[] = [];  // Cached list of available tools

  constructor() {}

  /**
   * Trigger a refresh of the tree view
   * This will cause VS Code to re-query the tree data and update the display
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Update the list of available tools and refresh the tree view
   * Called when authentication completes and tools are fetched from server
   * @param tools - Array of TazaPay tools to display
   */
  updateTools(tools: TazaPayTool[]): void {
    this.tools = tools;
    this.refresh();
  }

  /**
   * Get the tree item representation for display in VS Code
   * Required by TreeDataProvider interface
   * @param element - Tree item to get display info for
   * @returns The tree item for VS Code to display
   */
  getTreeItem(element: TazaPayTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children for a tree item (for hierarchical display)
   * Currently shows a flat list of tools, but could be extended for categories
   * @param element - Parent element (undefined for root level)
   * @returns Promise resolving to array of child items
   */
  getChildren(element?: TazaPayTreeItem): Thenable<TazaPayTreeItem[]> {
    if (!element) {
      // Root level - show all tools as non-collapsible items
      return Promise.resolve(this.tools.map(tool => 
        new TazaPayTreeItem(tool.name, tool.description, tool, vscode.TreeItemCollapsibleState.None)
      ));
    }

    // No children for individual tool items (flat structure)
    return Promise.resolve([]);
  }
}
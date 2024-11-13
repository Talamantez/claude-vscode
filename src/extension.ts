// src/extension.ts
import * as vscode from 'vscode';
import { askClaude, ClaudeResponse } from './api';

// Panel tracking
const activePanels = new Set<vscode.Disposable>();

// Watchdog timer
let watchdogTimer: NodeJS.Timeout | undefined;

function startWatchdog() {
    stopWatchdog(); // Clear any existing timer
    watchdogTimer = setInterval(() => {
        // Check panel health and force dispose if needed
        activePanels.forEach(panel => {
            try {
                if (panel instanceof vscode.Disposable) {
                    panel.dispose();
                }
            } catch (error) {
                console.error('Error disposing panel:', error);
            }
            activePanels.delete(panel);
        });
    }, 30000); // Check every 30 seconds
}

function stopWatchdog() {
    if (watchdogTimer) {
        clearInterval(watchdogTimer);
        watchdogTimer = undefined;
    }
}

// Helper function to extract content from Claude response
function extractContent(response: ClaudeResponse): string {
    if (!response?.content) return 'No response content';
    return response.content
        .map(item => item.text || '')
        .join('\n');
}

// Format the response
function formatResponse(prompt: string, response: ClaudeResponse, mode: 'general' | 'document' = 'general'): string {
    const now = new Date().toLocaleString();
    
    return [
        `# ${mode === 'document' ? 'Code Documentation' : 'Claude Response'} (${now})`,
        '',
        mode === 'document' ? '## Original Code' : '## Your Prompt',
        '```',
        prompt,
        '```',
        '',
        '## Response',
        extractContent(response),
        '',
        '---',
        `*Using ${response.model}*`,
        `*Tokens: ${response.usage?.input_tokens} input, ${response.usage?.output_tokens} output*`
    ].join('\n');
}

async function handleClaudeRequest(mode: 'general' | 'document') {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No active editor!');
        return;
    }
    
    const selection = editor.selection;
    const text = editor.document.getText(selection);
    if (!text) {
        vscode.window.showInformationMessage('Please select some text first');
        return;
    }

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(sync~spin) Asking Claude...";
    statusBarItem.show();

    try {
        const prompt = mode === 'document' 
            ? `Please document this code:\n\n${text}`
            : text;

        const response = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: mode === 'document' ? 'Generating Documentation...' : 'Asking Claude...',
            cancellable: false
        }, async () => {
            return await askClaude(prompt);
        });

        const formattedResponse = formatResponse(text, response, mode);
        const doc = await vscode.workspace.openTextDocument({
            content: formattedResponse,
            language: 'markdown'
        });
        
        const editor = await vscode.window.showTextDocument(doc, { 
            preview: true,
            viewColumn: vscode.ViewColumn.Beside 
        });

        // Track the panel
        if (editor) {
            const disposable = new vscode.Disposable(() => {
                try {
                    vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                } catch (error) {
                    console.error('Error closing panel:', error);
                }
            });
            activePanels.add(disposable);
        }

    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        statusBarItem.dispose();
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Claude extension activating...');

    // Start watchdog
    startWatchdog();
    context.subscriptions.push(new vscode.Disposable(stopWatchdog));

    // Create and track status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);

    // Register commands
    const askCommand = vscode.commands.registerCommand('claude-vscode.askClaude', () => 
        handleClaudeRequest('general'));
    
    const documentCommand = vscode.commands.registerCommand('claude-vscode.documentCode', () => 
        handleClaudeRequest('document'));

    // Add to subscriptions for proper disposal
    context.subscriptions.push(askCommand, documentCommand);

    // Add panel cleanup subscription
    context.subscriptions.push(new vscode.Disposable(() => {
        activePanels.forEach(panel => {
            try {
                panel.dispose();
            } catch (error) {
                console.error('Error disposing panel:', error);
            }
        });
        activePanels.clear();
    }));

    console.log('Claude extension activated');
}

export async function deactivate() {
    console.log('Claude extension deactivating...');

    // Stop watchdog
    stopWatchdog();

    try {
        // Close all editors first
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Clean up panels
        activePanels.forEach(panel => {
            try {
                panel.dispose();
            } catch (error) {
                console.error('Error disposing panel during deactivation:', error);
            }
        });
        activePanels.clear();

        // Final cleanup of any remaining editors/panels
        vscode.window.tabGroups.all.forEach(group => {
            group.tabs.forEach(tab => {
                try {
                    const input = tab.input;
                    if (input && typeof input === 'object' && 'dispose' in input) {
                        (input as { dispose: () => void }).dispose();
                    }
                } catch (error) {
                    console.error('Error disposing tab during deactivation:', error);
                }
            });
        });

        // One more attempt to close everything
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    } catch (error) {
        console.error('Error during deactivation:', error);
    }

    console.log('Claude extension deactivated');
}
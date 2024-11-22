// src/extension.ts
import * as vscode from 'vscode';
import { ClaudeApiService, DefaultClaudeApiService } from './services/claude-api';
import { ClaudeResponse } from './api';
import { Timeouts } from './config';
import { waitForExtensionReady, ensureAllEditorsClosed, unregisterCommands } from './utils';

// Global state management
let registeredCommands: vscode.Disposable[] = [];
let apiService: ClaudeApiService;
let cancellationTokenSource: vscode.CancellationTokenSource | undefined;

/**
 * Formats the response from Claude into a markdown document
 */
function formatResponse(prompt: string, response: ClaudeResponse, mode: 'general' | 'document'): string {
    const now = new Date().toLocaleString();
    const title = mode === 'document' ? 'Code Documentation' : 'Claude Response';
    const promptTitle = mode === 'document' ? 'Original Code' : 'Your Prompt';

    const content = response.content
        ?.map(item => item.text || '')
        .join('\n') || 'No response content';

    return [
        `# ${title} (${now})`,
        '',
        `## ${promptTitle}`,
        '```',
        prompt,
        '```',
        '',
        '## Response',
        content,
        '',
        '---',
        `*Using ${response.model}*`,
        `*Tokens: ${response.usage?.input_tokens} input, ${response.usage?.output_tokens} output*`
    ].join('\n');
}

/**
 * Creates and manages a response panel
 */
export async function createResponsePanel(content: string): Promise<vscode.TextEditor | undefined> {
    try {
        const doc = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        });

        const editor = await vscode.window.showTextDocument(doc, {
            preview: true,
            viewColumn: vscode.ViewColumn.Beside
        });

        // Safely toggle readonly
        const commands = await vscode.commands.getCommands();
        if (commands.includes('workbench.action.toggleEditorReadonly')) {
            await vscode.commands.executeCommand('workbench.action.toggleEditorReadonly');
        }

        return editor;
    } catch (error) {
        console.error('Error creating response panel:', error);
        throw error;
    }
}

/**
 * Handles Claude API requests
 */
async function handleClaudeRequest(mode: 'general' | 'document') {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No active editor!');
        return;
    }
    
    // Create new CancellationTokenSource
    const tokenSource = new vscode.CancellationTokenSource();
    
    const selection = editor.selection;
    const text = editor.document.getText(selection);
    if (!text) {
        vscode.window.showInformationMessage('Please select some text first');
        tokenSource.dispose();
        return;
    }

    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        Timeouts.STATUS_BAR_PRIORITY
    );
    statusBarItem.text = "$(sync~spin) Asking Claude...";
    statusBarItem.show();

    try {
        const prompt = mode === 'document'
            ? `Please document this code:\n\n${text}`
            : text;

        const response = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: mode === 'document' ? 'Generating Documentation...' : 'Asking Claude...',
            cancellable: true
        }, async (progress, progressToken) => {
            // Link the progress cancellation to our token source
            progressToken.onCancellationRequested(() => {
                tokenSource.cancel();
            });
            
            return await apiService.askClaude(prompt, tokenSource.token);
        });

        const formattedResponse = formatResponse(text, response, mode);
        await createResponsePanel(formattedResponse);
    } catch (error) {
        if (error instanceof vscode.CancellationError) {
            vscode.window.showInformationMessage('Request cancelled');
            return;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Error: ${errorMessage}`);
        console.error('Error handling Claude request:', error);
    } finally {
        statusBarItem.dispose();
        tokenSource.dispose();
    }
}

/**
 * Cleans up all panels and editors
 */
export async function cleanupPanelsAndEditors(): Promise<void> {
    try {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await new Promise(resolve => setTimeout(resolve, Timeouts.CLEANUP));

        // Remove activePanels cleanup code, just keep tab cleanup
        vscode.window.tabGroups.all.forEach(group => {
            group.tabs.forEach(tab => {
                try {
                    const input = tab.input;
                    if (input && typeof input === 'object' && 'dispose' in input) {
                        (input as { dispose: () => void }).dispose();
                    }
                } catch (error) {
                    console.error('Error disposing tab:', error);
                }
            });
        });

        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    } catch (error) {
        console.error('Error during cleanup:', error);
        throw error;
    }
}

/**
 * Activates the extension
 */
export async function activate(context: vscode.ExtensionContext, service?: ClaudeApiService) {
    console.log('Claude extension activating...');

    try {
        // Ensure previous commands are disposed and add safety timeout
        await deactivate();
        await new Promise(resolve => setTimeout(resolve, Timeouts.ACTIVATION)); // Wait for cleanup
        
        // Initialize API service
        apiService = service || new DefaultClaudeApiService();

        // Register commands after cleanup
        const commands = [
            // Support command for donations
            vscode.commands.registerCommand('claude-vscode.support', () => {
                vscode.env.openExternal(vscode.Uri.parse('https://buy.stripe.com/aEUcQc7Cb3VE22I3cc'));
            }),

            // Main commands
            vscode.commands.registerCommand('claude-vscode.askClaude', () => 
                handleClaudeRequest('general')
            ),

            vscode.commands.registerCommand('claude-vscode.documentCode', () => 
                handleClaudeRequest('document')
            )
        ];

        // Store commands and add to subscriptions
        registeredCommands = commands;
        context.subscriptions.push(...commands);

        console.log('Claude extension activated successfully');
        return Promise.resolve();

    } catch (error) {
        console.error('Error during activation:', error);
        // Ensure cleanup on activation failure
        await deactivate();
        throw error;
    }
}

/**
 * Deactivates the extension
 */
export async function deactivate() {
    console.log('Claude extension deactivating...');

    try {
        // Dispose all registered commands
        for (const cmd of registeredCommands) {
            try {
                cmd.dispose();
            } catch (err) {
                console.warn('Error disposing command:', err);
            }
        }
        registeredCommands = [];

        // Clean up panels and editors
        await cleanupPanelsAndEditors();

        console.log('Claude extension deactivated successfully');
    } catch (error) {
        console.error('Error during deactivation:', error);
        throw error;
    } finally {
        console.log('Thank you for supporting the Open Source!');
    }
}
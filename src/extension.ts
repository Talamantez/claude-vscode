// src/extension.ts
import * as vscode from 'vscode';
import { ClaudeApiService, DefaultClaudeApiService } from './services/claude-api';
import { ClaudeResponse } from './api';

// Global state management
let registeredCommands: vscode.Disposable[] = [];
let apiService: ClaudeApiService;
let cancellationTokenSource: vscode.CancellationTokenSource | undefined;

// Constants
const CLEANUP_TIMEOUT = 1000; // 1 second
const STATUS_BAR_PRIORITY = 100;

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
    cancellationTokenSource = new vscode.CancellationTokenSource();
    const cancellationToken = cancellationTokenSource.token;
    const selection = editor.selection;
    const text = editor.document.getText(selection);
    if (!text) {
        vscode.window.showInformationMessage('Please select some text first');
        return;
    }

    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        STATUS_BAR_PRIORITY
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
        }, async (progress, token) => {
            return await apiService.askClaude(prompt, token);
        });

        const formattedResponse = formatResponse(text, response, mode);
        await createResponsePanel(formattedResponse);
    } catch (error) {
        if (error instanceof vscode.CancellationError) {
            vscode.window.showInformationMessage('Request cancelled');
        } else {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Error: ${errorMessage}`);
            console.error('Error handling Claude request:', error);
        }
    } finally {
        statusBarItem.dispose();
        if (cancellationTokenSource) {
            cancellationTokenSource.dispose();
            cancellationTokenSource = undefined;
        }
    }
}

/**
 * Cleans up all panels and editors
 */
export async function cleanupPanelsAndEditors(): Promise<void> {
    try {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await new Promise(resolve => setTimeout(resolve, CLEANUP_TIMEOUT));

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
        // Cleanup any existing commands first
        registeredCommands.forEach(cmd => {
            try {
                cmd.dispose();
            } catch (error) {
                console.warn('Error disposing command:', error);
            }
        });
        registeredCommands = [];

        apiService = service || new DefaultClaudeApiService();

        // Support command for donations
        const supportCommand = vscode.commands.registerCommand('claude-vscode.support', () => {
            vscode.env.openExternal(vscode.Uri.parse('https://buy.stripe.com/aEUcQc7Cb3VE22I3cc'));
        });

        // Main commands
        const askCommand = vscode.commands.registerCommand(
            'claude-vscode.askClaude',
            () => handleClaudeRequest('general')
        );

        const documentCommand = vscode.commands.registerCommand(
            'claude-vscode.documentCode',
            () => handleClaudeRequest('document')
        );

        // Store commands
        registeredCommands = [supportCommand, askCommand, documentCommand];

        // Add to subscriptions
        context.subscriptions.push(...registeredCommands);

        console.log('Claude extension activated');

        // Return activation promise
        return Promise.resolve();
    } catch (error) {
        console.error('Error during activation:', error);
        throw error;
    }
}

/**
 * Deactivates the extension
 */
export async function deactivate() {
    console.log('Claude extension deactivating...');

    try {
        registeredCommands.forEach(cmd => cmd.dispose());
        registeredCommands = [];

        await cleanupPanelsAndEditors();

        console.log('Claude extension deactivated');
    } catch (error) {
        console.error('Error during deactivation:', error);
        throw error;
    } finally {
        console.log('Thank you for supporting the Open Source!')
    }
}
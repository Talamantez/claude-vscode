// src/extension.ts
import * as vscode from 'vscode';
import { ClaudeApiService, DefaultClaudeApiService } from './services/claude-api';
import { ClaudeResponse } from './api';

// Global state management
let registeredCommands: vscode.Disposable[] = [];
const activePanels = new Set<vscode.Disposable>();
let apiService: ClaudeApiService;

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

        // Safely handle readonly toggle
        const commands = await vscode.commands.getCommands(true);
        if (commands.includes('workbench.action.toggleEditorReadonly')) {
            await vscode.commands.executeCommand('workbench.action.toggleEditorReadonly');
        }

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
            cancellable: false
        }, async () => {
            return await apiService.askClaude(prompt);
        });

        const formattedResponse = formatResponse(text, response, mode);
        await createResponsePanel(formattedResponse);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Error: ${errorMessage}`);
        console.error('Error handling Claude request:', error);
    } finally {
        statusBarItem.dispose();
    }
}

/**
 * Cleans up all panels and editors
 */
export async function cleanupPanelsAndEditors(): Promise<void> {
    try {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await new Promise(resolve => setTimeout(resolve, CLEANUP_TIMEOUT));

        activePanels.forEach(panel => {
            try {
                panel.dispose();
            } catch (error) {
                console.error('Error disposing panel:', error);
            }
        });
        activePanels.clear();

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
        registeredCommands.forEach(cmd => cmd.dispose());
        registeredCommands = [];

        apiService = service || new DefaultClaudeApiService();

        // Support command for donations
        context.subscriptions.push(
            vscode.commands.registerCommand('claude-vscode.support', () => {
                vscode.env.openExternal(vscode.Uri.parse('https://buy.stripe.com/aEUcQc7Cb3VE22I3cc'));
            })
        );

        const commands = [
            vscode.commands.registerCommand(
                'claude-vscode.askClaude',
                () => handleClaudeRequest('general')
            ),
            vscode.commands.registerCommand(
                'claude-vscode.documentCode',
                () => handleClaudeRequest('document')
            )
        ];

        registeredCommands.push(...commands);
        context.subscriptions.push(...commands);

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
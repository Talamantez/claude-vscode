// src/extension.ts
import * as vscode from 'vscode';
import { ClaudeApiService, DefaultClaudeApiService } from './services/claude-api';
import { ClaudeResponse } from './api';
import { Timeouts } from './config';
import { waitForExtensionReady } from './utils';

// Global state management
let isCleaningUp = false;
let registeredCommands: vscode.Disposable[] = [];
let apiService: ClaudeApiService;

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
export async function createResponsePanel(content: string, sourceEditor?: vscode.TextEditor): Promise<vscode.TextEditor | undefined> {
    try {
        // Store the current source editor state
        const sourceDocument = sourceEditor?.document;
        const sourceSelection = sourceEditor?.selection;
        const sourceViewColumn = sourceEditor?.viewColumn;

        // Create the response document
        const doc = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        });

        // Determine view column - always try to use a new column to the right
        const targetViewColumn = sourceViewColumn
            ? sourceViewColumn + 1 as vscode.ViewColumn
            : vscode.ViewColumn.Two;

        // Show the new document
        const responseEditor = await vscode.window.showTextDocument(doc, {
            viewColumn: targetViewColumn,
            preserveFocus: true,
            preview: false // Make it a permanent editor to avoid VS Code's preview behavior
        });

        // If we somehow lost the source editor, restore it
        if (sourceDocument && !vscode.window.visibleTextEditors.some(e => e.document === sourceDocument)) {
            await vscode.window.showTextDocument(sourceDocument, {
                viewColumn: sourceViewColumn,
                selection: sourceSelection,
                preserveFocus: false
            });
        }

        return responseEditor;
    } catch (error) {
        console.error('Error creating response panel:', error);
        throw error;
    }
}


/**
 * Handles Claude API requests
 */
async function handleClaudeRequest(mode: 'general' | 'document') {
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        Timeouts.STATUS_BAR_PRIORITY
    );
    statusBarItem.text = "$(sync~spin) Asking Claude...";
    statusBarItem.show();

    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Please open a file and select some text first');
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection);
        if (!text) {
            vscode.window.showInformationMessage('Please select some text first');
            return;
        }

        const tokenSource = new vscode.CancellationTokenSource();

        const response = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: mode === 'document' ? 'Generating Documentation...' : 'Asking Claude...',
            cancellable: true
        }, async (progress, progressToken) => {
            progressToken.onCancellationRequested(() => {
                tokenSource.cancel();
            });

            const prompt = mode === 'document'
                ? `Please document this code:\n\n${text}`
                : text;

            return await apiService.askClaude(prompt, tokenSource.token);
        });

        const formattedResponse = formatResponse(text, response, mode);
        await createResponsePanel(formattedResponse, editor);

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
    }
}

/**
 * Cleans up all panels and editors
 */
export async function cleanupPanelsAndEditors(excludeEditor?: vscode.TextEditor): Promise<void> {
    if (isCleaningUp) {
        console.log('Cleanup already in progress, skipping');
        return;
    }

    isCleaningUp = true;
    try {
        // Get all editors except the one to exclude
        const editorsToClose = vscode.window.visibleTextEditors.filter(editor =>
            editor !== excludeEditor &&
            editor.document.uri !== excludeEditor?.document.uri
        );

        // Close each editor individually
        for (const editor of editorsToClose) {
            try {
                await vscode.window.showTextDocument(editor.document);
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            } catch (error) {
                console.warn('Error closing editor:', error);
                // Continue with other editors even if one fails
            }
        }

        // Restore focus to excluded editor if it exists
        if (excludeEditor && !excludeEditor.document.isClosed) {
            await vscode.window.showTextDocument(excludeEditor.document, {
                viewColumn: excludeEditor.viewColumn,
                selection: excludeEditor.selection,
                preserveFocus: false
            });
        }

        await waitForExtensionReady(Timeouts.CLEANUP);
    } catch (error) {
        console.error('Error during cleanup:', error);
        throw error;
    } finally {
        isCleaningUp = false;
    }
}

/**
 * Activates the extension
 */
export async function activate(context: vscode.ExtensionContext, service?: ClaudeApiService) {
    console.log('Claude extension activating...');

    try {
        // Initialize API service
        apiService = service || new DefaultClaudeApiService();

        // Simply register new commands without any cleanup
        const commands = [
            vscode.commands.registerCommand('claude-vscode.support', () => {
                vscode.env.openExternal(vscode.Uri.parse('https://buymeacoffee.com/conscious.robot'));
            }),
            vscode.commands.registerCommand('claude-vscode.askClaude', () =>
                handleClaudeRequest('general')
            ),
            vscode.commands.registerCommand('claude-vscode.documentCode', () =>
                handleClaudeRequest('document')
            )
        ];

        // Add to subscriptions
        context.subscriptions.push(...commands);
        console.log('Claude extension activated successfully');

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
        // Dispose commands without forcing unregistration
        registeredCommands.forEach(cmd => {
            try {
                cmd.dispose();
            } catch (err) {
                // Ignore disposal errors
            }
        });
        registeredCommands = [];

        console.log('Claude extension deactivated successfully');
    } catch (error) {
        console.error('Error during deactivation:', error);
        throw error;
    } finally {
        console.log('Thank you for supporting Open Source!');
    }
}
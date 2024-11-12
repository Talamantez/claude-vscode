// src/extension.ts
import * as vscode from 'vscode';
import { askClaude } from './api.ts';

export function activate(context: vscode.ExtensionContext) {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);

    let disposable = vscode.commands.registerCommand('claude-vscode.askClaude', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor!');
            return;
        }

        try {
            const selection = editor.selection;
            const text = editor.document.getText(selection);
            
            if (!text) {
                vscode.window.showInformationMessage('Please select some text first');
                return;
            }

            // Show working status
            statusBarItem.text = "$(sync~spin) Asking Claude...";
            statusBarItem.show();

            // Show progress
            const response = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Asking Claude...',
                cancellable: false
            }, async () => {
                return await askClaude(text);
            });

            // Hide status
            statusBarItem.hide();

            // Format the response nicely
            const formattedResponse = formatResponse(text, response);

            // Show response in new editor
            const doc = await vscode.workspace.openTextDocument({
                content: formattedResponse,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc, { 
                preview: true,
                viewColumn: vscode.ViewColumn.Beside // Opens side by side
            });

        } catch (error) {
            statusBarItem.hide();
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            } else {
                vscode.window.showErrorMessage('An unknown error occurred');
            }
        }
    });

    context.subscriptions.push(disposable);
}

function formatResponse(prompt: string, response: any): string {
    const now = new Date().toLocaleString();
    
    return [
        `# Claude Response (${now})`,
        '',
        '## Your Prompt',
        '```',
        prompt,
        '```',
        '',
        '## Response',
        response.content[0].text,
        '',
        '---',
        `*Using ${response.model}*`,
        `*Tokens: ${response.usage?.input_tokens} input, ${response.usage?.output_tokens} output*`
    ].join('\n');
}

export function deactivate() {}
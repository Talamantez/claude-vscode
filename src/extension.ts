// src/extension.ts
import * as vscode from 'vscode';
import { askClaude } from './api';

export function activate(context: vscode.ExtensionContext) {
    // Create status bar item
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

            // Show response in new editor
            const doc = await vscode.workspace.openTextDocument({
                content: response,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc, { preview: true });

        } catch (error) {
            // Hide status on error
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

export function deactivate() {}
﻿// src/extension.ts
import * as vscode from 'vscode';
import { askClaude } from './api';
import { getConfiguration } from './config';

export function activate(context: vscode.ExtensionContext) {
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

            // Show progress
            const response = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Asking Claude...',
                cancellable: false
            }, async () => {
                return await askClaude(text);
            });

            // Show response in new editor
            const doc = await vscode.workspace.openTextDocument({
                content: response,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc, { preview: true });

        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}
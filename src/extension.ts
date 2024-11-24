// File: src/extension.ts
import * as vscode from 'vscode';
import { ClaudeExtension } from './ClaudeExtension';
import { ClaudeApiService } from './services/claude-api';

let extension: ClaudeExtension | undefined;

// Re-export these for testing
export { ClaudeExtension } from './ClaudeExtension';
export { ResponsePanelManager } from './ResponsePanelManager';
export { CommandManager } from './CommandManager';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Claude extension activating...');
    try {
        extension = new ClaudeExtension(context);
        await extension.activate();
        console.log('Claude extension activated successfully');
    } catch (error) {
        console.error('Error during activation:', error);
        if (extension) {
            await extension.dispose();
            extension = undefined;
        }
        throw error;
    }
}

export async function deactivate() {
    console.log('Claude extension deactivating...');
    try {
        if (extension) {
            await extension.dispose();
            extension = undefined;
        }
        console.log('Claude extension deactivated successfully');
    } catch (error) {
        console.error('Error during deactivation:', error);
        throw error;
    }
}

// Expose the extension instance for testing
export function getExtension(): ClaudeExtension | undefined {
    return extension;
}
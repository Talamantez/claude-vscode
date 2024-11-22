// src/utils.ts
import * as vscode from 'vscode';
import { Timeouts } from './config';

/**
 * Waits for the extension to be ready after state changes
 * @param timeout Optional custom timeout (defaults to 3x activation timeout)
 */
export async function waitForExtensionReady(timeout?: number): Promise<void> {
    const waitTime = timeout || Math.max(Timeouts.ACTIVATION * 3, 500);
    await new Promise(resolve => setTimeout(resolve, waitTime));
}

/**
 * Ensures all editor windows are closed
 * @param retries Number of retry attempts
 * @param delay Delay between retries in ms
 */
export async function ensureAllEditorsClosed(retries = 3, delay = 500): Promise<void> {
    for (let i = 0; i < retries; i++) {
        if (vscode.window.visibleTextEditors.length === 0) return;
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    if (vscode.window.visibleTextEditors.length > 0) {
        throw new Error('Failed to close all editors');
    }
}

/**
 * Unregisters our extension's commands from VS Code
 */
export async function unregisterCommands(): Promise<void> {
    const allCommands = await vscode.commands.getCommands();
    const ourCommands = [
        'claude-vscode.support',
        'claude-vscode.askClaude',
        'claude-vscode.documentCode'
    ];

    for (const cmd of ourCommands) {
        if (allCommands.includes(cmd)) {
            try {
                await vscode.commands.executeCommand('workbench.action.unregisterCommand', cmd);
            } catch (err) {
                console.warn(`Failed to unregister command ${cmd}:`, err);
            }
        }
    }
    await waitForExtensionReady(Timeouts.ACTIVATION);
}
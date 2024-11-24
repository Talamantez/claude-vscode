// src/config.ts
import * as vscode from 'vscode';
import { waitForExtensionReady } from './utils';

export interface Configuration {
    model: string;
    apiKey?: string;
}

// Extension timing configuration
export const Timeouts = {
    CLEANUP: 1000, // 1 second for cleanup operations
    DEFAULT_ACTIVATION: 100, // 100ms default safety delay
    get ACTIVATION(): number {
        return parseInt(process.env.VSCODE_CLAUDE_ACTIVATION_TIMEOUT || '', 10) || this.DEFAULT_ACTIVATION;
    },
    STATUS_BAR_PRIORITY: 100
} as const;

export function getConfiguration(): Configuration {
    const config = vscode.workspace.getConfiguration('claude-vscode');
    return {
        model: config.get('model') || 'claude-3-opus-20240229',
        apiKey: config.get('apiKey')
    };
}

export async function unregisterCommands(): Promise<void> {
    const allCommands = await vscode.commands.getCommands();
    const ourCommands = [
        'claude-vscode.askClaude',
        'claude-vscode.documentCode'
    ];

    // First try normal unregistration
    for (const cmd of ourCommands) {
        if (allCommands.includes(cmd)) {
            try {
                await vscode.commands.executeCommand('workbench.action.unregisterCommand', cmd);
            } catch (err) {
                console.warn(`Failed to unregister command ${cmd}:`, err);
            }
        }
    }

    // Wait for commands to unregister
    await waitForExtensionReady(Timeouts.ACTIVATION);

    // Force cleanup in case normal unregistration failed
    const remainingCommands = await vscode.commands.getCommands();
    for (const cmd of ourCommands) {
        if (remainingCommands.includes(cmd)) {
            try {
                // Force dispose any existing command registration
                const existingDisposable = vscode.commands.registerCommand(cmd, () => { });
                existingDisposable.dispose();
            } catch (err) {
                console.warn(`Failed force cleanup of command ${cmd}:`, err);
            }
        }
    }

    // Final wait to ensure cleanup
    await waitForExtensionReady(Timeouts.ACTIVATION);
}
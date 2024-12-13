// src/config.ts
import * as vscode from 'vscode';
import { waitForExtensionReady } from './utils';

export interface Configuration {
    model: string;
    apiKey?: string;
    apiUrl: string;
}

// Extension timing configuration
export const Timeouts = {
    CLEANUP: 1000,
    DEFAULT_ACTIVATION: 100,
    get ACTIVATION(): number {
        return parseInt(process.env.VSCODE_CLAUDE_ACTIVATION_TIMEOUT || '', 10) || this.DEFAULT_ACTIVATION;
    },
    STATUS_BAR_PRIORITY: 100
} as const;

// Update the valid models list to match package.json
export const VALID_MODELS = [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-5-sonnet-20240620'
] as const;

export type ValidModel = typeof VALID_MODELS[number];

export function getConfiguration(): Configuration {
    const config = vscode.workspace.getConfiguration('claude-vscode');
    const modelSetting = config.get<string>('model');

    // Type-safe model validation
    const model = typeof modelSetting === 'string' && VALID_MODELS.includes(modelSetting as ValidModel)
        ? modelSetting
        : 'claude-3-opus-20240229';

    return {
        model,
        apiKey: config.get('apiKey'),
        apiUrl: 'https://conscious-robot.com/api' // Default API URL
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

    await waitForExtensionReady(Timeouts.ACTIVATION);

    // Force cleanup in case normal unregistration failed
    const remainingCommands = await vscode.commands.getCommands();
    for (const cmd of ourCommands) {
        if (remainingCommands.includes(cmd)) {
            try {
                const existingDisposable = vscode.commands.registerCommand(cmd, () => { });
                existingDisposable.dispose();
            } catch (err) {
                console.warn(`Failed force cleanup of command ${cmd}:`, err);
            }
        }
    }

    await waitForExtensionReady(Timeouts.ACTIVATION);
}
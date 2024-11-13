// src/config.ts
import * as vscode from 'vscode';

export interface Configuration {
    model: string;
    apiKey?: string;
}

export function getConfiguration(): Configuration {
    const config = vscode.workspace.getConfiguration('claude-vscode');
    return {
        model: config.get('model') || 'claude-3-opus-20240229',
        apiKey: config.get('apiKey')
    };
}

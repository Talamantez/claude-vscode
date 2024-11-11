// src/config.ts
import * as vscode from 'vscode';

export interface Configuration {
    apiEndpoint: string;
    apiKey: string;
}

export function getConfiguration(): Configuration {
    const config = vscode.workspace.getConfiguration('claude-vscode');
    return {
        apiEndpoint: config.get('apiEndpoint') || '',
        apiKey: config.get('apiKey') || ''
    };
}
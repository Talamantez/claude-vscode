// src/editor-utils.ts
import * as vscode from 'vscode';

export interface EditorRetryOptions {
    maxAttempts?: number;
    delayMs?: number;
    timeout?: number;
}

const DEFAULT_OPTIONS: EditorRetryOptions = {
    maxAttempts: 3,
    delayMs: 100,
    timeout: 5000
};

export class EditorTimeoutError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'EditorTimeoutError';
    }
}

/**
 * Waits for the active editor with retries
 */
export async function waitForActiveEditor(options: EditorRetryOptions = {}): Promise<vscode.TextEditor> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        throw new Error('No active editor found');
    }
    return editor;
}

/**
 * Ensures response panel remains visible and active
 */
export async function ensureResponsePanelActive(panel: vscode.TextEditor, options: EditorRetryOptions = {}): Promise<void> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    while (Date.now() - startTime < opts.timeout!) {
        if (!panel.document.isClosed && vscode.window.visibleTextEditors.includes(panel)) {
            return;
        }

        try {
            await vscode.window.showTextDocument(panel.document, panel.viewColumn);
            return;
        } catch (error) {
            console.log('Retrying to ensure response panel visibility...', error);
            await new Promise(resolve => setTimeout(resolve, opts.delayMs));
        }
    }

    throw new EditorTimeoutError('Failed to keep response panel active');
}
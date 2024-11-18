// src/services/claude-api.ts
import * as vscode from 'vscode';
import { askClaude as apiAskClaude, ClaudeResponse } from '../api';

export interface ClaudeApiService {
    askClaude(text: string): Promise<ClaudeResponse>;
}

export class DefaultClaudeApiService implements ClaudeApiService {
    private readonly _disposables: vscode.Disposable[] = [];

    constructor() {
        // Add any initialization if needed
    }

    async askClaude(text: string): Promise<ClaudeResponse> {
        try {
            return await apiAskClaude(text);
        } catch (error) {
            console.error('Error in DefaultClaudeApiService:', error);
            throw error;
        }
    }

    dispose(): void {
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                try {
                    disposable.dispose();
                } catch (error) {
                    console.error('Error disposing service:', error);
                }
            }
        }
    }
}
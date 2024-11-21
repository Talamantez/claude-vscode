// src/services/claude-api.ts
import * as vscode from 'vscode';
import { askClaude as apiAskClaude, ClaudeResponse } from '../api';

export interface ClaudeApiService {
    askClaude(text: string, token?: vscode.CancellationToken): Promise<ClaudeResponse>;
}

export class DefaultClaudeApiService implements ClaudeApiService {
    async askClaude(text: string, token?: vscode.CancellationToken): Promise<ClaudeResponse> {
        try {
            return await apiAskClaude(text, token);
        } catch (error) {
            console.error('Error in DefaultClaudeApiService:', error);
            throw error;
        }
    }
}
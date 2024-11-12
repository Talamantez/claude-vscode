// src/api.ts
import { window } from 'vscode';
import fetch from 'node-fetch';
import { getConfiguration } from './config.ts';

interface ClaudeMessageContent {
    type: string;
    text: string;
}

interface ClaudeResponse {
    id: string;
    type: string;
    role: string;
    model: string;
    content: ClaudeMessageContent[];
    stop_reason: string;
    stop_sequence: string;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

export async function askClaude(text: string): Promise<ClaudeResponse> {
    const config = getConfiguration();
    
    try {
        const response = await fetch('https://long-ferret-58.deno.dev', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                prompt: text,
                model: config.model
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        if (error instanceof Error) {
            window.showErrorMessage(`Failed to call Claude: ${error.message}`);
            throw error;
        } else {
            window.showErrorMessage('Failed to call Claude: Unknown error');
            throw new Error('Unknown error occurred');
        }
    }
}
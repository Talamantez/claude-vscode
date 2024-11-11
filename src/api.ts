// src/api.ts
import { window } from 'vscode';
import { getConfiguration } from './config';
import fetch from 'node-fetch';

interface ClaudeResponse {
    content: Array<{type: string, text: string}>;
}

export async function askClaude(text: string): Promise<string> {
    const config = getConfiguration();
    
    if (!config.apiKey) {
        throw new Error('Claude API key not configured');
    }

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({ 
                messages: [{
                    role: "user",
                    content: text
                }],
                model: "claude-3-opus-20240229",
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json() as ClaudeResponse;
        return data.content[0].text;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to call Claude API: ${error.message}`);
        } else {
            throw new Error('Failed to call Claude API: Unknown error');
        }
    }
}
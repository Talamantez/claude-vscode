// src/api.ts
import { window } from 'vscode';
import fetch from 'node-fetch';

interface ClaudeContent {
    type: string;
    text: string;
}

interface ClaudeMessage {
    id: string;
    type: string;
    role: string;
    model: string;
    content: ClaudeContent[];
    stop_reason: string;
    stop_sequence: string;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

export async function askClaude(text: string): Promise<string> {
    try {
        const response = await fetch('https://long-ferret-58.deno.dev', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                prompt: text
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json() as ClaudeMessage;
        
        // Extract just the text content from Claude's response
        if (data.content && data.content.length > 0) {
            const textContent = data.content.find(c => c.type === 'text');
            if (textContent) {
                return textContent.text;
            }
        }
        
        throw new Error('No text content found in response');
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
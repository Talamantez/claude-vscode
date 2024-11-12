// src/api.ts
import { window } from 'vscode';
import fetch from 'node-fetch';

interface ClaudeResponse {
    id: string;
    type: string;
    role: string;
    model: string;
    content: string;
    stop_reason: string;
    stop_sequence: string;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

export async function askClaude(text: string): Promise<ClaudeResponse> {
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

        const data = await response.json();
        
        // Extract text from content array
        const textContent = data.content.find((c: any) => c.type === 'text')?.text || '';
        
        // Return formatted response
        return {
            id: data.id,
            type: data.type,
            role: data.role,
            model: data.model,
            content: textContent,
            stop_reason: data.stop_reason,
            stop_sequence: data.stop_sequence,
            usage: data.usage
        };
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
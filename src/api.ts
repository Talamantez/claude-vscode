// src/api.ts
import * as vscode from 'vscode';
import { getConfiguration } from './config';

export interface ClaudeMessageContent {
    type: string;
    text: string;
}

export interface ClaudeResponse {
    id: string;
    type: string;
    role: string;
    model: string;
    content: ClaudeMessageContent[];
    stop_reason: string | null;
    stop_sequence: string | null;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
    remaining?: number;
    dailyLimit?: number;
}

const SERVICE_URL = 'https://long-ferret-58.deno.dev';

export async function askClaude(text: string): Promise<ClaudeResponse> {
    const config = getConfiguration();
    
    try {
        const response = await fetch(SERVICE_URL, {
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

        const data: unknown = await response.json();
        
        // Type guard to verify the response matches our expected structure
        if (!isClaudeResponse(data)) {
            throw new Error('Invalid response format from Claude API');
        }
        
        return data as ClaudeResponse;
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to call Claude: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    }
}

// Type guard function
function isClaudeResponse(data: unknown): data is ClaudeResponse {
    const response = data as Partial<ClaudeResponse>;
    return (
        typeof data === 'object' &&
        data !== null &&
        Array.isArray(response.content) &&
        response.content?.every((item: unknown) => 
            typeof item === 'object' &&
            item !== null &&
            'type' in item &&
            'text' in item &&
            typeof (item as ClaudeMessageContent).type === 'string' &&
            typeof (item as ClaudeMessageContent).text === 'string'
        ) &&
        typeof response.model === 'string' &&
        typeof response.usage === 'object' &&
        response.usage !== null &&
        typeof response.usage.input_tokens === 'number' &&
        typeof response.usage.output_tokens === 'number'
    );
}
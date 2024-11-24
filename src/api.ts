// src/api.ts
import * as vscode from 'vscode';
import { getConfiguration } from './config';

// Constants and type definitions
const SERVICE_URL = 'https://api.anthropic.com/v1/messages';
const VALID_MODELS = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229'] as const;
type ValidModel = typeof VALID_MODELS[number];

// Interface definitions
export interface ClaudeMessageContent {
    type: 'text';  // Restrict to known types
    text: string;
}

export interface ClaudeResponse {
    id: string;
    type: string;
    role: string;
    model: ValidModel;
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

// Type guard functions - defined before use
function isClaudeMessageContent(item: unknown): item is ClaudeMessageContent {
    return (
        typeof item === 'object' &&
        item !== null &&
        'type' in item &&
        'text' in item &&
        (item as ClaudeMessageContent).type === 'text' &&
        typeof (item as ClaudeMessageContent).text === 'string'
    );
}

function isClaudeResponse(data: unknown): data is ClaudeResponse {
    const response = data as Partial<ClaudeResponse>;

    if (typeof data !== 'object' || data === null) {
        return false;
    }

    const requiredStringFields = ['id', 'type', 'role'] as const;
    for (const field of requiredStringFields) {
        if (typeof response[field] !== 'string') {
            return false;
        }
    }

    if (!Array.isArray(response.content)) {
        return false;
    }

    if (!response.content.every(isClaudeMessageContent)) {
        return false;
    }

    if (
        typeof response.usage !== 'object' ||
        response.usage === null ||
        typeof response.usage.input_tokens !== 'number' ||
        typeof response.usage.output_tokens !== 'number'
    ) {
        return false;
    }

    if (
        (response.stop_reason !== null && typeof response.stop_reason !== 'string') ||
        (response.stop_sequence !== null && typeof response.stop_sequence !== 'string') ||
        (response.remaining !== undefined && typeof response.remaining !== 'number') ||
        (response.dailyLimit !== undefined && typeof response.dailyLimit !== 'number')
    ) {
        return false;
    }

    if (!response.model || !VALID_MODELS.includes(response.model as ValidModel)) {
        return false;
    }

    return true;
}

// Main API function
export async function askClaude(text: string, token?: vscode.CancellationToken): Promise<ClaudeResponse> {
    const config = getConfiguration();

    if (!config.apiKey && !process.env.CLAUDE_API_KEY) {
        throw new Error('No API key configured. Please add your Claude API key in settings.');
    }

    // Create AbortController and link it to the cancellation token
    const abortController = new AbortController();
    if (token) {
        token.onCancellationRequested(() => {
            abortController.abort();
        });
    }

    try {
        const response = await fetch(SERVICE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': config.apiKey || process.env.CLAUDE_API_KEY || ''
            },
            body: JSON.stringify({
                messages: [{
                    role: 'user',
                    content: text
                }],
                model: config.model,
                max_tokens: 1500
            }),
            signal: abortController.signal
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`API error: ${response.status} - ${errorData}`);
        }

        const data: unknown = await response.json();

        if (!isClaudeResponse(data)) {
            console.error('Invalid response structure:', data);
            throw new Error('Invalid response format from Claude API');
        }

        return data;
    } catch (error) {
        // Check if the error was due to cancellation
        if (error instanceof Error && error.name === 'AbortError') {
            throw new vscode.CancellationError();
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to call Claude: ${errorMessage}`);
        throw error;
    }
}
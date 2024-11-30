// src/api.ts
import * as vscode from 'vscode';
import { getConfiguration } from './config';

// Constants and type definitions
const SERVICE_URL = 'https://api.anthropic.com/v1/messages';
const VALID_MODELS = [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-5-sonnet-20240620'
] as const;
type ValidModel = typeof VALID_MODELS[number];

// Interface definitions
export interface ClaudeMessageContent {
    type: 'text';
    text: string;
}

export interface ClaudeResponse {
    id: string;
    type: string;
    role: string;
    model: string; // Changed from ValidModel to string for more flexibility
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

// Type guard functions with more flexible validation
function isClaudeMessageContent(item: unknown): item is ClaudeMessageContent {
    if (!item || typeof item !== 'object') {
        return false;
    }

    const content = item as Partial<ClaudeMessageContent>;

    // Allow for potential variations in content structure
    if (content.type !== 'text') {
        return false;
    }

    if (typeof content.text !== 'string') {
        return false;
    }

    return true;
}

function isClaudeResponse(data: unknown): data is ClaudeResponse {
    if (!data || typeof data !== 'object') {
        return false;
    }

    const response = data as Partial<ClaudeResponse>;

    // Required string fields with more flexible validation
    if (typeof response.id !== 'string' ||
        typeof response.type !== 'string' ||
        typeof response.role !== 'string') {
        return false;
    }

    // Model validation - just ensure it's a string
    if (typeof response.model !== 'string') {
        return false;
    }

    // Content validation with error handling
    if (!Array.isArray(response.content)) {
        return false;
    }

    // Check each content item but don't fail on empty array
    if (response.content.length > 0 && !response.content.every(isClaudeMessageContent)) {
        return false;
    }

    // Usage validation with more flexible structure
    if (!response.usage || typeof response.usage !== 'object') {
        return false;
    }

    const usage = response.usage as Record<string, unknown>;
    if (typeof usage.input_tokens !== 'number' ||
        typeof usage.output_tokens !== 'number') {
        return false;
    }

    // Optional fields validation
    if (response.stop_reason !== undefined &&
        response.stop_reason !== null &&
        typeof response.stop_reason !== 'string') {
        return false;
    }

    if (response.stop_sequence !== undefined &&
        response.stop_sequence !== null &&
        typeof response.stop_sequence !== 'string') {
        return false;
    }

    // Optional numeric fields
    if (response.remaining !== undefined &&
        typeof response.remaining !== 'number') {
        return false;
    }

    if (response.dailyLimit !== undefined &&
        typeof response.dailyLimit !== 'number') {
        return false;
    }

    return true;
}

// Main API function with improved error handling
export async function askClaude(text: string, token?: vscode.CancellationToken): Promise<ClaudeResponse> {
    const config = getConfiguration();

    if (!config.apiKey && !process.env.CLAUDE_API_KEY) {
        throw new Error('No API key configured. Please add your Claude API key in settings.');
    }

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
            let errorMessage = `API error: ${response.status}`;
            try {
                const errorData = await response.text();
                errorMessage += ` - ${errorData}`;
            } catch {
                // If we can't parse the error response, just use the status
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        if (!isClaudeResponse(data)) {
            console.error('Invalid response structure:', JSON.stringify(data, null, 2));
            throw new Error('Invalid response format from Claude API');
        }

        return data;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new vscode.CancellationError();
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to call Claude: ${errorMessage}`);
        throw error;
    }
}
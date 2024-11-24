// test/suite/api.test.ts
import * as assert from 'assert';
import * as sinon from 'sinon';
import { askClaude, ClaudeResponse } from '../../src/api';
import * as vscode from 'vscode';

suite('Claude API Tests', () => {
    let sandbox: sinon.SinonSandbox;
    let fetchStub: sinon.SinonStub;

    const mockConfig = {
        apiKey: 'test-key',
        model: 'claude-3-opus-20240229'
    };

    const mockSuccessResponse: ClaudeResponse = {
        id: 'test-id',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Test response' }],
        model: 'claude-3-opus-20240229',
        stop_reason: null,
        stop_sequence: null,
        usage: {
            input_tokens: 10,
            output_tokens: 20
        }
    };

    setup(() => {
        sandbox = sinon.createSandbox();

        // Stub global fetch
        fetchStub = sandbox.stub(global, 'fetch');

        // Stub configuration
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: (key: string) => {
                if (key === 'apiKey') return mockConfig.apiKey;
                if (key === 'model') return mockConfig.model;
                return undefined;
            }
        } as any);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('successful API call', async () => {
        fetchStub.resolves({
            ok: true,
            json: async () => mockSuccessResponse
        } as Response);

        const response = await askClaude('Test prompt');

        assert.strictEqual(response.content[0].text, 'Test response');
        assert.strictEqual(response.model, 'claude-3-opus-20240229');

        const fetchCall = fetchStub.getCall(0);
        const requestInit = fetchCall.args[1] as RequestInit & {
            headers: Record<string, string>;
        };
        const requestBody = JSON.parse(requestInit.body as string);

        assert.deepStrictEqual(requestBody.messages, [{
            role: 'user',
            content: 'Test prompt'
        }]);
        assert.strictEqual(requestInit.headers['anthropic-version'], '2023-06-01');
    });

    test('validates request headers', async () => {
        fetchStub.resolves({
            ok: true,
            json: async () => mockSuccessResponse
        } as Response);

        await askClaude('Test prompt');

        const requestInit = fetchStub.getCall(0).args[1] as RequestInit & {
            headers: Record<string, string>;
        };

        assert.deepStrictEqual(requestInit.headers, {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': 'test-key'
        });
    });

    test('handles request cancellation', async () => {
        const tokenSource = new vscode.CancellationTokenSource();

        // Create an AbortError that matches the browser's native error
        const abortError = new Error();
        abortError.name = 'AbortError';

        // Setup fetch to throw the abort error after a delay
        fetchStub.callsFake(() => new Promise((_, reject) => {
            setTimeout(() => {
                reject(abortError);
            }, 10);
        }));

        // Start the request and immediately cancel
        const promise = askClaude('Test prompt', tokenSource.token);
        tokenSource.cancel();

        // Use a custom validator function
        await assert.rejects(
            promise,
            error => {
                // Check if the error is an instance of vscode.CancellationError
                return error instanceof vscode.CancellationError;
            },
            'Expected a CancellationError'
        );
    });

    test('handles missing API key', async () => {
        // Update config stub to return no API key
        sandbox.restore();
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: (key: string) => undefined
        } as any);
        process.env.CLAUDE_API_KEY = '';

        await assert.rejects(
            askClaude('Test prompt'),
            /No API key configured/
        );
    });

    test('validates response format', async () => {
        fetchStub.resolves({
            ok: true,
            json: async () => ({
                id: 'test-id',
                // Missing required fields
            })
        } as Response);

        await assert.rejects(
            askClaude('Test prompt'),
            /Invalid response format/
        );
    });

    test('handles network errors', async () => {
        fetchStub.rejects(new Error('Network error'));

        await assert.rejects(
            askClaude('Test prompt'),
            /Network error/
        );
    });
});
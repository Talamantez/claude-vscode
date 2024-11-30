// test/suite/api-responses.test.ts
import * as assert from 'assert';
import * as sinon from 'sinon';
import { askClaude, ClaudeResponse } from '../../src/api';
import * as vscode from 'vscode';

suite('Claude API Response Tests', () => {
    let sandbox: sinon.SinonSandbox;
    let fetchStub: sinon.SinonStub;

    const mockConfig = {
        apiKey: 'test-key',
        model: 'claude-3-opus-20240229'
    };

    setup(() => {
        sandbox = sinon.createSandbox();

        // Stub global fetch
        fetchStub = sandbox.stub(global, 'fetch');

        // Stub VSCode configuration
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

    // Test helper to create mock responses
    function createMockResponse(model: string): ClaudeResponse {
        return {
            id: 'test-id',
            type: 'message',
            role: 'assistant',
            content: [{ type: 'text', text: 'Test response' }],
            model: model,
            stop_reason: null,
            stop_sequence: null,
            usage: {
                input_tokens: 10,
                output_tokens: 20
            }
        };
    }

    // Test all supported models
    const supportedModels = [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-5-sonnet-20240620'
    ];

    supportedModels.forEach(model => {
        test(`handles ${model} response format correctly`, async () => {
            const mockResponse = createMockResponse(model);
            fetchStub.resolves({
                ok: true,
                json: async () => mockResponse
            } as Response);

            const response = await askClaude('Test prompt');
            assert.strictEqual(response.model, model);
            assert.strictEqual(response.content[0].text, 'Test response');
        });
    });

    // Test variations in content structure
    test('handles empty content array', async () => {
        const mockResponse = createMockResponse('claude-3-opus-20240229');
        mockResponse.content = [];

        fetchStub.resolves({
            ok: true,
            json: async () => mockResponse
        } as Response);

        const response = await askClaude('Test prompt');
        assert.deepStrictEqual(response.content, []);
    });

    test('handles multiple content items', async () => {
        const mockResponse = createMockResponse('claude-3-opus-20240229');
        mockResponse.content = [
            { type: 'text', text: 'First response' },
            { type: 'text', text: 'Second response' }
        ];

        fetchStub.resolves({
            ok: true,
            json: async () => mockResponse
        } as Response);

        const response = await askClaude('Test prompt');
        assert.strictEqual(response.content.length, 2);
        assert.strictEqual(response.content[0].text, 'First response');
        assert.strictEqual(response.content[1].text, 'Second response');
    });

    // Test error handling
    test('handles malformed response data', async () => {
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

    test('handles API errors with detailed messages', async () => {
        fetchStub.resolves({
            ok: false,
            status: 400,
            text: async () => 'Invalid request: bad model specified'
        } as Response);

        await assert.rejects(
            askClaude('Test prompt'),
            /API error: 400 - Invalid request: bad model specified/
        );
    });

    test('handles missing API key', async () => {
        sandbox.restore();
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: () => undefined
        } as any);
        process.env.CLAUDE_API_KEY = '';

        await assert.rejects(
            askClaude('Test prompt'),
            /No API key configured/
        );
    });

    test('handles request cancellation', async () => {
        const tokenSource = new vscode.CancellationTokenSource();

        const abortError = new Error();
        abortError.name = 'AbortError';

        fetchStub.callsFake(() => new Promise((_, reject) => {
            setTimeout(() => reject(abortError), 10);
        }));

        const promise = askClaude('Test prompt', tokenSource.token);
        tokenSource.cancel();

        await assert.rejects(
            promise,
            error => error instanceof vscode.CancellationError
        );
    });

    // Test optional fields
    test('handles responses with optional fields', async () => {
        const mockResponse = createMockResponse('claude-3-opus-20240229');
        mockResponse.remaining = 1000;
        mockResponse.dailyLimit = 10000;

        fetchStub.resolves({
            ok: true,
            json: async () => mockResponse
        } as Response);

        const response = await askClaude('Test prompt');
        assert.strictEqual(response.remaining, 1000);
        assert.strictEqual(response.dailyLimit, 10000);
    });

    // Test rate limiting and quota information
    test('handles rate limiting information', async () => {
        const mockResponse = createMockResponse('claude-3-opus-20240229');
        mockResponse.remaining = 0;
        mockResponse.dailyLimit = 1000;

        fetchStub.resolves({
            ok: true,
            json: async () => mockResponse
        } as Response);

        const response = await askClaude('Test prompt');
        assert.strictEqual(response.remaining, 0);
        assert.strictEqual(response.dailyLimit, 1000);
    });

    // Test unexpected field values
    test('handles unexpected field values gracefully', async () => {
        const mockResponse = {
            ...createMockResponse('claude-3-opus-20240229'),
            unexpected_field: 'some value',
            another_field: 123
        };

        fetchStub.resolves({
            ok: true,
            json: async () => mockResponse
        } as Response);

        const response = await askClaude('Test prompt');
        assert.ok(response.id);  // Basic validation still passes
    });
});
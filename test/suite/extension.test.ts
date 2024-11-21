import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as extension from '../../src/extension';
import { cleanupPanelsAndEditors, createResponsePanel } from '../../src/extension';

interface ClaudeApiService {
    askClaude(text: string, token?: vscode.CancellationToken): Promise<any>;
}

suite('Claude Extension Test Suite', () => {
    let sandbox: sinon.SinonSandbox;

    async function ensureAllEditorsClosed(retries = 3, delay = 500): Promise<void> {
        for (let i = 0; i < retries; i++) {
            if (vscode.window.visibleTextEditors.length === 0) return;
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        assert.strictEqual(vscode.window.visibleTextEditors.length, 0, 'All editors should be closed');
    }

    setup(async () => {
        sandbox = sinon.createSandbox();
        await ensureAllEditorsClosed();
    });

    teardown(async () => {
        sandbox.restore();
        await ensureAllEditorsClosed();
    });

    test('Response Panel Creation and Management', async function () {
        this.timeout(10000);

        const mockText = "Test selection";
        const mockResponse = await createResponsePanel(mockText);
        assert.ok(mockResponse, "Response panel should be created");

        // Verify editor state
        const editors = vscode.window.visibleTextEditors;
        assert.strictEqual(editors.length, 1, "Should have one visible editor");

        await cleanupPanelsAndEditors();
    });

    test('Multiple Panel Resource Management', async function () {
        this.timeout(45000);
        const panelCount = 3;
        const initialMemory = process.memoryUsage();

        try {
            // Create multiple panels
            for (let i = 0; i < panelCount; i++) {
                const doc = await vscode.workspace.openTextDocument({
                    content: `Test content ${i + 1}`,
                    language: 'markdown'
                });

                const editor = await vscode.window.showTextDocument(doc, {
                    viewColumn: vscode.ViewColumn.Beside
                });

                assert.ok(editor, `Panel ${i + 1} should be visible`);
                await vscode.commands.executeCommand('workbench.action.moveEditorToNextGroup');
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const editorCount = vscode.window.visibleTextEditors.filter(
                editor => editor.document.languageId === 'markdown'
            ).length;
            assert.strictEqual(editorCount, panelCount);

            // Cleanup and memory check
            await cleanupPanelsAndEditors();
            if (global.gc) global.gc();

            const finalMemory = process.memoryUsage();
            const memoryDiff = finalMemory.heapUsed - initialMemory.heapUsed;
            assert.ok(memoryDiff < 5 * 1024 * 1024, 'Memory usage should not increase significantly');

            assert.strictEqual(vscode.window.visibleTextEditors.length, 0, 'All editors should be closed');
        } catch (error) {
            console.error('Test failed:', error);
            await ensureAllEditorsClosed(5, 1000);
            throw error;
        }
    });

    /**
     * Tests for the Claude VS Code extension
     */
    suite('Claude Extension Test Suite', () => {
        let sandbox: sinon.SinonSandbox;

        /**
         * Helper function to ensure all editors are closed before/after tests
         */
        async function ensureAllEditorsClosed(retries = 3, delay = 500): Promise<void> {
            for (let i = 0; i < retries; i++) {
                if (vscode.window.visibleTextEditors.length === 0) return;
                await vscode.commands.executeCommand('workbench.action.closeAllEditors');
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            assert.strictEqual(vscode.window.visibleTextEditors.length, 0, 'All editors should be closed');
        }

        setup(async () => {
            sandbox = sinon.createSandbox();
            await ensureAllEditorsClosed();
        });

        teardown(async () => {
            sandbox.restore();
            await ensureAllEditorsClosed();
        });

        /**
         * Tests basic response panel creation and cleanup
         */
        test('Response Panel Creation and Management', async function () {
            this.timeout(10000);

            const mockText = "Test selection";
            const mockResponse = await createResponsePanel(mockText);
            assert.ok(mockResponse, "Response panel should be created");

            const editors = vscode.window.visibleTextEditors;
            assert.strictEqual(editors.length, 1, "Should have one visible editor");

            await cleanupPanelsAndEditors();
        });

        /**
         * Tests handling of multiple panels and resource cleanup
         */
        test('Multiple Panel Resource Management', async function () {
            this.timeout(45000);
            const panelCount = 3;
            const initialMemory = process.memoryUsage();

            try {
                // Create multiple panels
                for (let i = 0; i < panelCount; i++) {
                    const doc = await vscode.workspace.openTextDocument({
                        content: `Test content ${i + 1}`,
                        language: 'markdown'
                    });

                    const editor = await vscode.window.showTextDocument(doc, {
                        viewColumn: vscode.ViewColumn.Beside
                    });

                    assert.ok(editor, `Panel ${i + 1} should be visible`);
                    await vscode.commands.executeCommand('workbench.action.moveEditorToNextGroup');
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                const editorCount = vscode.window.visibleTextEditors.filter(
                    editor => editor.document.languageId === 'markdown'
                ).length;
                assert.strictEqual(editorCount, panelCount);

                await cleanupPanelsAndEditors();
                if (global.gc) global.gc();

                const finalMemory = process.memoryUsage();
                const memoryDiff = finalMemory.heapUsed - initialMemory.heapUsed;
                assert.ok(memoryDiff < 5 * 1024 * 1024, 'Memory usage should not increase significantly');
                assert.strictEqual(vscode.window.visibleTextEditors.length, 0, 'All editors should be closed');
            } catch (error) {
                console.error('Test failed:', error);
                await ensureAllEditorsClosed(5, 1000);
                throw error;
            }
        });

        /**
         * Tests the request cancellation functionality
         */
        test('Cancel Button Functionality', async function () {
            this.timeout(45000);

            try {
                await extension.deactivate();

                // Set up mock API with controlled response timing
                let mockResolve: (value: any) => void;
                const askClaudeStub = sinon.stub();
                const mockPromise = new Promise(resolve => {
                    mockResolve = resolve;
                });
                askClaudeStub.returns(mockPromise);

                // Create mock API service
                const mockApiService: ClaudeApiService = {
                    askClaude: askClaudeStub
                };

                // Set up mock extension context
                const mockContext = {
                    subscriptions: [],
                    workspaceState: {
                        get: () => undefined,
                        update: () => Promise.resolve()
                    },
                    globalState: {
                        get: () => undefined,
                        update: () => Promise.resolve(),
                        setKeysForSync: () => { }
                    },
                    extensionPath: '',
                    storagePath: '',
                    logPath: '',
                    extensionUri: vscode.Uri.file(''),
                    asAbsolutePath: (relativePath: string) => relativePath,
                    secrets: {
                        get: () => Promise.resolve(undefined),
                        store: () => Promise.resolve(),
                        delete: () => Promise.resolve()
                    },
                    globalStorageUri: vscode.Uri.file(''),
                    logUri: vscode.Uri.file(''),
                    storageUri: vscode.Uri.file(''),
                    globalStoragePath: ''
                };

                // Initialize extension with mocks
                await extension.activate(mockContext as unknown as vscode.ExtensionContext, mockApiService);
                await new Promise(resolve => setTimeout(resolve, 100));

                await vscode.commands.executeCommand('workbench.action.closeAllEditors');

                // Create test document with selection
                const mockText = "Test selection";
                const doc = await vscode.workspace.openTextDocument({
                    content: mockText,
                    language: 'plaintext'
                });
                const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
                editor.selection = new vscode.Selection(0, 0, 0, mockText.length);

                // Execute Claude command and handle response
                const commandPromise = vscode.commands.executeCommand('claude-vscode.askClaude');

                // Simulate response after delay
                setTimeout(() => {
                    mockResolve({
                        content: [{
                            type: 'text',
                            text: 'Request cancelled'
                        }],
                        id: 'test-id',
                        model: 'claude-3-opus-20240229',
                        role: 'assistant',
                        stop_reason: 'cancelled',
                        stop_sequence: null,
                        type: 'message',
                        usage: { input_tokens: 0, output_tokens: 0 }
                    });
                }, 200);

                await commandPromise;
                await new Promise(resolve => setTimeout(resolve, 500));

                // Verify final state
                const visibleEditors = vscode.window.visibleTextEditors;
                const markdownEditors = visibleEditors.filter(e => e.document.languageId === 'markdown');
                assert.strictEqual(markdownEditors.length, 1, "Should have one markdown editor");
                assert.ok(markdownEditors[0].document.getText().includes('Request cancelled'));

            } catch (error) {
                console.error('Cancel button test failed:', error);
                throw error;
            } finally {
                await ensureAllEditorsClosed(5, 1000);
                await extension.deactivate();
            }
        });

        /**
         * Tests extension activation and deactivation lifecycle
         */
        test('Extension Lifecycle Management', async function () {
            this.timeout(30000);

            try {
                const docs = await Promise.all([
                    vscode.workspace.openTextDocument({
                        content: 'Test content 1',
                        language: 'markdown'
                    }),
                    vscode.workspace.openTextDocument({
                        content: 'Test content 2',
                        language: 'markdown'
                    })
                ]);

                for (const doc of docs) {
                    await vscode.window.showTextDocument(doc, {
                        viewColumn: vscode.ViewColumn.Beside,
                        preview: true
                    });
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                const editorCount = vscode.window.visibleTextEditors.length;
                assert.ok(editorCount > 0, 'Should have open editors');

                await extension.deactivate();
                await ensureAllEditorsClosed(5, 1000);
                assert.strictEqual(vscode.window.visibleTextEditors.length, 0, 'Should cleanup on deactivation');
            } catch (error) {
                console.error('Lifecycle test failed:', error);
                await ensureAllEditorsClosed(5, 1000);
                throw error;
            }
        });
    });

    test('Extension Lifecycle Management', async function () {
        this.timeout(30000);

        try {
            // Create test documents
            const docs = await Promise.all([
                vscode.workspace.openTextDocument({
                    content: 'Test content 1',
                    language: 'markdown'
                }),
                vscode.workspace.openTextDocument({
                    content: 'Test content 2',
                    language: 'markdown'
                })
            ]);

            for (const doc of docs) {
                await vscode.window.showTextDocument(doc, {
                    viewColumn: vscode.ViewColumn.Beside,
                    preview: true
                });
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const editorCount = vscode.window.visibleTextEditors.length;
            assert.ok(editorCount > 0, 'Should have open editors');

            await extension.deactivate();
            await ensureAllEditorsClosed(5, 1000);
            assert.strictEqual(vscode.window.visibleTextEditors.length, 0, 'Should cleanup on deactivation');
        } catch (error) {
            console.error('Lifecycle test failed:', error);
            await ensureAllEditorsClosed(5, 1000);
            throw error;
        }
    });
});
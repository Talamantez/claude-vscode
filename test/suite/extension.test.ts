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

    test('Cancel Button Functionality', async function () {
        this.timeout(30000);

        const mockText = "Test selection";
        const mockCancellationSource = new vscode.CancellationTokenSource();
        const mockApiService: ClaudeApiService = {
            askClaude: sinon.stub().callsFake((text, token) => {
                return new Promise((resolve) => {
                    token?.onCancellationRequested(() => {
                        resolve({
                            content: [],
                            id: 'test-id',
                            model: 'claude-3-opus-20240229',
                            role: 'test-role',
                            stop_reason: 'cancelled',
                            stop_sequence: null,
                            type: 'test-type',
                            usage: {
                                input_tokens: 0,
                                output_tokens: 0
                            }
                        });
                    });
                });
            })
        };

        await extension.activate({} as any, mockApiService);
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');

        const doc = await vscode.workspace.openTextDocument({
            content: mockText,
            language: 'plaintext'
        });

        await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
        const editor = vscode.window.activeTextEditor;
        assert.ok(editor);

        editor!.selection = new vscode.Selection(0, 0, 0, mockText.length);

        setTimeout(() => {
            mockCancellationSource.cancel();
        }, 500);

        await vscode.commands.executeCommand('claude-vscode.askClaude');

        const visibleEditors = vscode.window.visibleTextEditors;
        assert.strictEqual(visibleEditors.length, 1, "Original editor should still be open");

        const infoMessage = await new Promise(resolve =>
            vscode.window.onDidChangeActiveTextEditor(e => {
                if (e?.document.languageId === 'plaintext') {
                    resolve(e.document.getText());
                }
            })
        );

        assert.strictEqual(infoMessage, 'Request cancelled', "Cancel message should be shown");

        await extension.deactivate();
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
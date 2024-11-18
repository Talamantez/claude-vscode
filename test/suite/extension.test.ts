import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as extension from '../../src/extension';
import { cleanupPanelsAndEditors, createResponsePanel } from '../../src/extension';

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

    test('Response Panel Creation and Management', async function() {
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
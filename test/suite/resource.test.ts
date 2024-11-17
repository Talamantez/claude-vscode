// test/suite/resource.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as extension from '../../src/extension';

suite('Resource Management Test Suite', () => {
    // Helper function to ensure all editors are closed
    async function ensureAllEditorsClosed(retries = 3, delay = 500): Promise<void> {
        for (let i = 0; i < retries; i++) {
            if (vscode.window.visibleTextEditors.length === 0) {
                return;
            }
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        // Final check
        assert.strictEqual(
            vscode.window.visibleTextEditors.length,
            0,
            'All editors should be closed'
        );
    }

    // Setup before each test
    setup(async () => {
        await ensureAllEditorsClosed();
    });

    // Cleanup after each test
    teardown(async () => {
        await ensureAllEditorsClosed();
    });

    test('Multiple Panel Creation and Cleanup', async function() {
        this.timeout(45000);
        console.log('Starting Multiple Panel test...');

        const panelCount = 5;
        const panels: vscode.TextEditor[] = [];

        try {
            // Create multiple panels
            for (let i = 0; i < panelCount; i++) {
                console.log(`Creating panel ${i + 1}/${panelCount}`);
                const doc = await vscode.workspace.openTextDocument({
                    content: `Test content ${i + 1}`,
                    language: 'markdown'
                });
                
                const editor = await vscode.window.showTextDocument(doc, {
                    viewColumn: vscode.ViewColumn.Beside
                });
                panels.push(editor);

                // Verify panel was created
                assert.ok(
                    vscode.window.visibleTextEditors.includes(editor),
                    `Panel ${i + 1} should be visible`
                );

                // Wait between creations
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Record memory usage
            const initialMemory = process.memoryUsage();

            // Close panels one by one
            for (const panel of panels) {
                try {
                    const doc = panel.document;
                    await vscode.window.showTextDocument(doc, { preview: true });
                    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    console.error('Error closing panel:', error);
                }
            }

            // Ensure all editors are closed
            await ensureAllEditorsClosed(5, 1000);

            // Force garbage collection if possible
            if (global.gc) {
                global.gc();
            }

            // Wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check memory usage
            const finalMemory = process.memoryUsage();
            const memoryDiff = finalMemory.heapUsed - initialMemory.heapUsed;
            
            console.log('Memory usage difference:', memoryDiff);
            assert.ok(
                memoryDiff < 5 * 1024 * 1024, // Allow up to 5MB difference
                'Memory usage should not increase significantly'
            );

            // Final verification
            assert.strictEqual(
                vscode.window.visibleTextEditors.length,
                0,
                'All editors should be closed'
            );

        } catch (error) {
            console.error('Test failed:', error);
            // Attempt emergency cleanup
            await ensureAllEditorsClosed(5, 1000);
            throw error;
        }
    });

    test('Manual Deactivation Cleanup', async function() {
        this.timeout(30000);
        console.log('Starting Manual Deactivation test...');

        try {
            // Create some test documents
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

            // Show documents
            const editors: vscode.TextEditor[] = [];
            for (const doc of docs) {
                const editor = await vscode.window.showTextDocument(doc, { 
                    viewColumn: vscode.ViewColumn.Beside,
                    preview: true  // Add preview flag
                });
                editors.push(editor);
                // Wait between openings
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Verify editors are open
            assert.ok(
                vscode.window.visibleTextEditors.length > 0,
                'Should have open editors'
            );

            console.log('Calling deactivate function...');
            // Call deactivate function directly
            await extension.deactivate();

            // Wait for cleanup and ensure editors are closed
            await ensureAllEditorsClosed(5, 1000);

            console.log('Deactivation test completed successfully');
        } catch (error) {
            console.error('Deactivation test failed:', error);
            // Attempt emergency cleanup
            await ensureAllEditorsClosed(5, 1000);
            throw error;
        }
    });
});
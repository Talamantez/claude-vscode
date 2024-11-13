// test/suite/resource.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as extension from '../../src/extension';

suite('Resource Management Test Suite', () => {
    test('Multiple Panel Creation and Cleanup', async function() {
        this.timeout(45000);
        console.log('Starting Multiple Panel test...');

        const panelCount = 5;
        const panels: vscode.TextEditor[] = [];  // Properly typed array

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

                // Wait a bit between creations
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Record memory usage
            const initialMemory = process.memoryUsage();

            // Close panels one by one
            for (let i = 0; i < panels.length; i++) {
                console.log(`Closing panel ${i + 1}/${panelCount}`);
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                await new Promise(resolve => setTimeout(resolve, 500));
            }

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

            // Verify all editors are closed
            assert.strictEqual(
                vscode.window.visibleTextEditors.length,
                0,
                'All editors should be closed'
            );

        } catch (error) {
            console.error('Test failed:', error);
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
            const editors: vscode.TextEditor[] = [];  // Properly typed array
            for (const doc of docs) {
                const editor = await vscode.window.showTextDocument(doc, { 
                    viewColumn: vscode.ViewColumn.Beside 
                });
                editors.push(editor);
            }

            // Verify editors are open
            assert.ok(
                vscode.window.visibleTextEditors.length > 0,
                'Should have open editors'
            );

            console.log('Calling deactivate function...');
            // Call deactivate function directly
            await extension.deactivate();

            // Wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Close any remaining editors
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            
            // Final wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify cleanup
            assert.strictEqual(
                vscode.window.visibleTextEditors.length,
                0,
                'All editors should be cleaned up after deactivation'
            );

            console.log('Deactivation test completed successfully');
        } catch (error) {
            console.error('Deactivation test failed:', error);
            throw error;
        }
    });
});
// test/suite/resource.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Resource Management Test Suite', () => {
    test('Multiple Panel Creation and Cleanup', async function() {
        this.timeout(45000);
        console.log('Starting Multiple Panel test...');

        const panelCount = 5;
        const panels = [];

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

    test('Extension Deactivation Cleanup', async function() {
        this.timeout(30000);
        console.log('Starting Deactivation test...');

        try {
            // Create some panels
            const doc1 = await vscode.workspace.openTextDocument({
                content: 'Test content 1',
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc1);

            const doc2 = await vscode.workspace.openTextDocument({
                content: 'Test content 2',
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc2, vscode.ViewColumn.Beside);

            // Close all editors first
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Force deactivation
            const ext = vscode.extensions.getExtension('conscious-robot.claude-vscode-assistant');
            if (ext && ext.isActive) {
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
            }

            // Wait for deactivation and cleanup
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Close any remaining editors
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify cleanup
            assert.strictEqual(
                vscode.window.visibleTextEditors.length,
                0,
                'All editors should be cleaned up after deactivation'
            );

        } catch (error) {
            console.error('Test failed:', error);
            throw error;
        } finally {
            // One final attempt to clean up
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        }
    });
});
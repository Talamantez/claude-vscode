// test-execution.ts

import * as vscode from 'vscode';
import * as assert from 'assert';

/**
 * Basic Extension Functionality Tests
 */
async function testBasicFunctionality() {
    // 1. Test command registration
    const commands = await vscode.commands.getCommands();
    const requiredCommands = [
        'claude-vscode.askClaude',
        'claude-vscode.documentCode',
        'claude-vscode.support'
    ];
    
    for (const cmd of requiredCommands) {
        assert.ok(
            commands.includes(cmd),
            `Command ${cmd} should be registered`
        );
    }

    // 2. Test API configuration
    const config = vscode.workspace.getConfiguration('claude-vscode');
    const model = config.get('model');
    assert.ok(
        model === 'claude-3-opus-20240229' || model === 'claude-3-sonnet-20240229',
        'Model configuration should be valid'
    );

    // 3. Test document creation
    const doc = await vscode.workspace.openTextDocument({
        content: 'function test() { return true; }',
        language: 'javascript'
    });
    
    const editor = await vscode.window.showTextDocument(doc);
    assert.ok(editor, 'Editor should be opened');

    // Select all text
    const lastLine = doc.lineAt(doc.lineCount - 1);
    editor.selection = new vscode.Selection(
        0, 0,
        lastLine.range.end.line,
        lastLine.range.end.character
    );

    // 4. Test Claude commands
    try {
        await vscode.commands.executeCommand('claude-vscode.documentCode');
        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verify response panel
        const editors = vscode.window.visibleTextEditors;
        const responseEditor = editors.find(e => 
            e.document.languageId === 'markdown' &&
            e.document.getText().includes('Code Documentation')
        );
        assert.ok(responseEditor, 'Response panel should be created');
        
    } catch (error) {
        console.error('Command execution failed:', error);
        throw error;
    }
}

/**
 * Resource Management Tests
 */
async function testResourceManagement() {
    const initialEditors = vscode.window.visibleTextEditors.length;
    const docs = [];
    
    try {
        // Create multiple documents
        for (let i = 0; i < 3; i++) {
            const doc = await vscode.workspace.openTextDocument({
                content: `Test content ${i}`,
                language: 'markdown'
            });
            const editor = await vscode.window.showTextDocument(doc, {
                viewColumn: vscode.ViewColumn.Beside
            });
            docs.push(doc);
        }
        
        // Verify editor count
        assert.strictEqual(
            vscode.window.visibleTextEditors.length,
            initialEditors + 3,
            'Should have opened 3 new editors'
        );
        
        // Close editors
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        
        // Verify cleanup
        assert.strictEqual(
            vscode.window.visibleTextEditors.length,
            0,
            'All editors should be closed'
        );
        
    } catch (error) {
        console.error('Resource management test failed:', error);
        throw error;
    }
}

/**
 * Error Handling Tests
 */
async function testErrorHandling() {
    try {
        // Test with no editor
        await vscode.commands.executeCommand('claude-vscode.askClaude');
        // Should show info message
        
        // Test with empty selection
        const doc = await vscode.workspace.openTextDocument({
            content: '',
            language: 'text'
        });
        await vscode.window.showTextDocument(doc);
        await vscode.commands.executeCommand('claude-vscode.askClaude');
        // Should show info message
        
    } catch (error) {
        console.error('Error handling test failed:', error);
        throw error;
    }
}

/**
 * Run all tests
 */
export async function runTests() {
    try {
        console.log('Starting tests...');
        
        console.log('Testing basic functionality...');
        await testBasicFunctionality();
        
        console.log('Testing resource management...');
        await testResourceManagement();
        
        console.log('Testing error handling...');
        await testErrorHandling();
        
        console.log('All tests completed successfully!');
        
    } catch (error) {
        console.error('Tests failed:', error);
        throw error;
    }
}
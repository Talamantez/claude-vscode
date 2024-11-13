// test/suite/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import { askClaude, type ClaudeResponse } from '../../src/api';
import * as extension from '../../src/extension';

class MockEnvironmentVariableCollection implements vscode.EnvironmentVariableCollection {
    private _map = new Map<string, vscode.EnvironmentVariableMutator>();

    public persistent = false;
    public description: string | vscode.MarkdownString = 'Test Environment Variables';

    replace(variable: string, value: string): void {
        this._map.set(variable, {
            value,
            type: vscode.EnvironmentVariableMutatorType.Replace,
            options: { applyAtProcessCreation: true }
        });
    }

    append(variable: string, value: string): void {
        this._map.set(variable, {
            value,
            type: vscode.EnvironmentVariableMutatorType.Append,
            options: { applyAtProcessCreation: true }
        });
    }

    prepend(variable: string, value: string): void {
        this._map.set(variable, {
            value,
            type: vscode.EnvironmentVariableMutatorType.Prepend,
            options: { applyAtProcessCreation: true }
        });
    }

    get(variable: string): vscode.EnvironmentVariableMutator | undefined {
        return this._map.get(variable);
    }

    forEach(callback: (variable: string, mutator: vscode.EnvironmentVariableMutator, collection: vscode.EnvironmentVariableCollection) => void): void {
        const self = this as vscode.EnvironmentVariableCollection;
        this._map.forEach((mutator, variable) => callback(variable, mutator, self));
    }

    delete(variable: string): void {
        this._map.delete(variable);
    }

    clear(): void {
        this._map.clear();
    }

    [Symbol.iterator](): Iterator<[string, vscode.EnvironmentVariableMutator]> {
        return this._map.entries();
    }
}

// Helper function to wait for condition
async function waitForCondition(condition: () => boolean, timeout: number = 10000, interval: number = 100): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (condition()) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
}

suite('Extension Test Suite', () => {
    let sandbox: sinon.SinonSandbox;

    suiteSetup(async () => {
        console.log('Suite setup starting...');
        const ext = vscode.extensions.getExtension('conscious-robot.claude-vscode-assistant');
        if (ext) {
            console.log('Found extension, activating...');
            await ext.activate();
        } else {
            console.log('Extension not found, activating manually...');
            await extension.activate(createMockExtensionContext());
        }
        console.log('Suite setup complete');
    });

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    suiteTeardown(async () => {
        console.log('Suite teardown starting...');
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        console.log('Suite teardown complete');
    });

    function createMockExtensionContext(): vscode.ExtensionContext {
        const baseDir = path.join(__dirname, '../../');
        const context = {
            subscriptions: [],
            extensionUri: vscode.Uri.file(baseDir),
            extensionPath: baseDir,
            globalState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => []
            },
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => []
            },
            globalStoragePath: path.join(baseDir, 'global-storage'),
            storagePath: path.join(baseDir, 'storage'),
            logPath: path.join(baseDir, 'logs'),
            asAbsolutePath: (relativePath: string) => path.join(baseDir, relativePath),
            storageUri: vscode.Uri.file(path.join(baseDir, 'storage')),
            globalStorageUri: vscode.Uri.file(path.join(baseDir, 'global-storage')),
            logUri: vscode.Uri.file(path.join(baseDir, 'logs')),
            extensionMode: vscode.ExtensionMode.Test,
            environmentVariableCollection: new MockEnvironmentVariableCollection(),
            secrets: {
                get: (key: string) => Promise.resolve(undefined),
                store: (key: string, value: string) => Promise.resolve(),
                delete: (key: string) => Promise.resolve()
            },
            extension: {
                id: 'test-extension',
                extensionUri: vscode.Uri.file(baseDir),
                extensionPath: baseDir,
                isActive: true,
                packageJSON: {},
                exports: undefined,
                activate: () => Promise.resolve(),
                extensionKind: vscode.ExtensionKind.Workspace
            },
            languageModelAccessInformation: {
                apiVersions: []
            }
        } as const;

        return context as unknown as vscode.ExtensionContext;
    }

    test('Window Lifecycle Test', async () => {
        // Close any existing editors first
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create a document
        const doc = await vscode.workspace.openTextDocument({
            content: 'test content',
            language: 'plaintext'
        });

        // Show it in a new editor
        await vscode.window.showTextDocument(doc);

        // Verify editor is active
        const activeEditor = vscode.window.activeTextEditor;
        assert.ok(activeEditor, 'Should have an active editor');
        assert.strictEqual(
            activeEditor.document.getText(),
            'test content',
            'Editor should contain our test content'
        );

        // Close the editor
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');

        // Wait for disposal
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify no editors are open
        assert.strictEqual(
            vscode.window.visibleTextEditors.length,
            0,
            'No editors should be open'
        );
    });

    test('Response Panel Creation and Disposal', async function () {
        // Increase timeout to 30 seconds for this test
        this.timeout(30000);
        console.log('Starting Response Panel test...');

        // Mock Claude response
        const mockResponse: ClaudeResponse = {
            id: 'test-id',
            type: 'text',
            role: 'assistant',
            content: [{ type: 'text', text: 'Test response' }],
            model: 'claude-3',
            stop_reason: null,
            stop_sequence: null,
            usage: { input_tokens: 10, output_tokens: 20 }
        };

        try {
            console.log('Setting up Claude API stub...');
            const askClaudeStub = async () => mockResponse;
            sandbox.stub(await import('../../src/api'), 'askClaude').callsFake(askClaudeStub);

            console.log('Creating test document...');
            const doc = await vscode.workspace.openTextDocument({
                content: 'test code',
                language: 'typescript'
            });

            console.log('Opening test document...');
            await vscode.window.showTextDocument(doc);

            console.log('Verifying available commands...');
            const commands = await vscode.commands.getCommands();
            assert.ok(
                commands.includes('claude-vscode.askClaude'),
                'Command should be registered'
            );

            console.log('Setting up text selection...');
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                throw new Error('No active editor found');
            }
            editor.selection = new vscode.Selection(0, 0, 0, 9);

            console.log('Executing Claude command...');
            await vscode.commands.executeCommand('claude-vscode.askClaude');

            console.log('Waiting for response panel...');
            const panelCreated = await waitForCondition(
                () => vscode.window.visibleTextEditors.some(e => e.document.languageId === 'markdown'),
                15000
            );

            if (!panelCreated) {
                throw new Error('Response panel was not created within timeout');
            }
            console.log('Response panel created successfully');

            // Get all visible editors
            const editors = vscode.window.visibleTextEditors;
            console.log(`Found ${editors.length} visible editors`);
            editors.forEach((e, i) => {
                console.log(`Editor ${i}: languageId=${e.document.languageId}, uri=${e.document.uri}`);
            });

            // Verify response panel was created
            assert.ok(
                editors.some(e => e.document.languageId === 'markdown'),
                'Response panel should be created'
            );

            console.log('Closing all editors...');
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');

            console.log('Waiting for editors to close...');
            const editorsClosed = await waitForCondition(
                () => vscode.window.visibleTextEditors.length === 0,
                5000
            );

            if (!editorsClosed) {
                throw new Error('Editors did not close within timeout');
            }

            assert.strictEqual(
                vscode.window.visibleTextEditors.length,
                0,
                'All editors should be closed'
            );

            console.log('Test completed successfully');
        } catch (error) {
            console.error('Test failed:', error);
            throw error;
        }
    });
});
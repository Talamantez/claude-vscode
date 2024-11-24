// File: test/suite/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ClaudeResponse } from '../../src/api';
import { ClaudeExtension } from '../../src/extension';
import { thoroughCleanup } from '../../src/test-utils';
import { ClaudeApiService } from '../../src/services/claude-api';

suite('Claude Extension Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let testExtension: ClaudeExtension | null;

    suiteSetup(async () => {
        console.log('Suite setup starting...');
        await thoroughCleanup();
        await forceUnregisterAllCommands();
        console.log('Suite setup complete');
    });

    setup(async () => {
        console.log('Test setup starting...');
        sandbox = sinon.createSandbox();
        testExtension = null;
        await thoroughCleanup();
        await forceUnregisterAllCommands();
        console.log('Test setup complete');
    });

    teardown(async () => {
        console.log('Test teardown starting...');
        sandbox.restore();
        if (testExtension) {
            await testExtension.dispose();
            testExtension = null;
        }
        await thoroughCleanup();
        await forceUnregisterAllCommands();
        console.log('Test teardown complete');
    });

    suiteTeardown(async () => {
        console.log('Suite teardown starting...');
        await thoroughCleanup();
        await forceUnregisterAllCommands();
        console.log('Suite teardown complete');
    });

    async function forceUnregisterAllCommands() {
        const ourCommands = [
            'claude-vscode.support',
            'claude-vscode.askClaude',
            'claude-vscode.documentCode'
        ];

        console.log('Force unregistering all commands...');

        // First try to get all currently registered commands
        const allCommands = await vscode.commands.getCommands();

        for (const cmd of ourCommands) {
            try {
                if (allCommands.includes(cmd)) {
                    console.log(`Attempting to unregister existing command: ${cmd}`);
                    // Create and immediately dispose a new registration to force unregister
                    const disposable = vscode.commands.registerCommand(cmd, () => { });
                    disposable.dispose();
                }
            } catch (err) {
                console.warn(`Error while force unregistering ${cmd}:`, err);
            }
        }

        // Give VSCode time to process
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    test('Response Panel Creation and Management', async function () {
        this.timeout(10000);
        console.log('Starting Response Panel test...');

        const mockContext = createMockExtensionContext();
        console.log('Created mock context');

        testExtension = new ClaudeExtension(mockContext);
        console.log('Created extension instance');

        await testExtension.activate();
        console.log('Extension activated');

        const mockText = "Test selection";
        const doc = await vscode.workspace.openTextDocument({
            content: mockText,
            language: 'plaintext'
        });

        const editor = await vscode.window.showTextDocument(doc);
        editor.selection = new vscode.Selection(0, 0, 0, mockText.length);

        await vscode.commands.executeCommand('claude-vscode.askClaude');

        const editors = vscode.window.visibleTextEditors;
        assert.ok(editors.length > 0, "Should have visible editors");

        console.log('Response Panel test complete');
    });

    test('Multiple Panel Resource Management', async function () {
        this.timeout(45000);
        console.log('Starting Multiple Panel test...');

        const panelCount = 3;
        await thoroughCleanup();
        if (global.gc) global.gc();

        const initialMemory = process.memoryUsage();

        try {
            const mockContext = createMockExtensionContext();
            testExtension = new ClaudeExtension(mockContext);
            await testExtension.activate();

            for (let i = 0; i < panelCount; i++) {
                console.log(`Creating panel ${i + 1}/${panelCount}`);
                const doc = await vscode.workspace.openTextDocument({
                    content: `Test content ${i + 1}`,
                    language: 'markdown'
                });

                const editor = await vscode.window.showTextDocument(doc, {
                    viewColumn: vscode.ViewColumn.Beside
                });

                assert.ok(editor, `Panel ${i + 1} should be visible`);
                await vscode.commands.executeCommand('workbench.action.moveEditorToNextGroup');

                await thoroughCleanup();
                if (global.gc) global.gc();
            }

            const finalMemory = process.memoryUsage();
            const memoryDiff = finalMemory.heapUsed - initialMemory.heapUsed;

            console.log('Memory usage:', {
                initial: initialMemory.heapUsed / 1024 / 1024,
                final: finalMemory.heapUsed / 1024 / 1024,
                diff: memoryDiff / 1024 / 1024
            });

            assert.ok(memoryDiff < 5 * 1024 * 1024, 'Memory usage should not increase significantly');
            assert.strictEqual(vscode.window.visibleTextEditors.length, 0, 'All editors should be closed');

        } catch (error) {
            console.error('Test failed:', error);
            await thoroughCleanup();
            throw error;
        }
    });

    test('Cancel Button Functionality', async function () {
        this.timeout(45000);
        console.log('Starting Cancel Button test...');

        try {
            const mockResponse: ClaudeResponse = {
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
            };

            const mockApiService: ClaudeApiService = {
                askClaude: sinon.stub().callsFake(async () => {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return mockResponse;
                })
            };

            const mockContext = createMockExtensionContext();
            testExtension = new ClaudeExtension(mockContext, mockApiService);
            await testExtension.activate();

            const mockText = "Test selection";
            const doc = await vscode.workspace.openTextDocument({
                content: mockText,
                language: 'plaintext'
            });
            const editor = await vscode.window.showTextDocument(doc);
            editor.selection = new vscode.Selection(0, 0, 0, mockText.length);

            await vscode.commands.executeCommand('claude-vscode.askClaude');

            const responseEditor = await waitForMarkdownEditor();
            assert.ok(responseEditor, "Should find a markdown editor");

            const editorContent = responseEditor.document.getText();
            assert.ok(editorContent.includes('Request cancelled'), "Response should contain expected text");

            console.log('Cancel Button test complete');
        } catch (error) {
            console.error('Cancel button test failed:', error);
            throw error;
        }
    });
});

async function waitForMarkdownEditor(timeout = 5000): Promise<vscode.TextEditor | undefined> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const editors = vscode.window.visibleTextEditors;
        const mdEditor = editors.find(e => e.document.languageId === 'markdown');
        if (mdEditor) return mdEditor;
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return undefined;
}

function createMockExtensionContext(): vscode.ExtensionContext {
    class MockMemento implements vscode.Memento {
        private storage = new Map<string, any>();

        get<T>(key: string): T | undefined {
            return this.storage.get(key);
        }

        update(key: string, value: any): Thenable<void> {
            this.storage.set(key, value);
            return Promise.resolve();
        }

        keys(): readonly string[] {
            return Array.from(this.storage.keys());
        }
    }

    class MockSecretStorage implements vscode.SecretStorage {
        private storage = new Map<string, string>();
        public onDidChange = new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event;

        get(key: string): Thenable<string | undefined> {
            return Promise.resolve(this.storage.get(key));
        }

        store(key: string, value: string): Thenable<void> {
            this.storage.set(key, value);
            return Promise.resolve();
        }

        delete(key: string): Thenable<void> {
            this.storage.delete(key);
            return Promise.resolve();
        }
    }

    return {
        subscriptions: [],
        workspaceState: new MockMemento(),
        globalState: Object.assign(new MockMemento(), {
            setKeysForSync: () => { }
        }),
        extensionPath: "",
        storagePath: "",
        logPath: "",
        extensionUri: vscode.Uri.file(""),
        asAbsolutePath: (relativePath: string) => relativePath,
        secrets: new MockSecretStorage(),
        globalStorageUri: vscode.Uri.file(""),
        logUri: vscode.Uri.file(""),
        storageUri: vscode.Uri.file(""),
        extensionMode: vscode.ExtensionMode.Test,
        globalStoragePath: "",
    } as unknown as vscode.ExtensionContext;
}
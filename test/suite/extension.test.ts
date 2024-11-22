import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as extension from '../../src/extension';
import { cleanupPanelsAndEditors, createResponsePanel } from '../../src/extension';
import { waitForExtensionReady, ensureAllEditorsClosed } from '../../src/utils';
import { ClaudeResponse } from '../../src/api';

interface ClaudeApiService {
    askClaude(text: string, token?: vscode.CancellationToken): Promise<any>;
}
interface LanguageModelAccessCheckResult {
    granted: boolean;
    feature: string;
}
suite('Claude Extension Test Suite', () => {
    let sandbox: sinon.SinonSandbox;

    suiteSetup(async () => {
        await extension.deactivate();
        await waitForExtensionReady();
        await ensureAllEditorsClosed();
    });

    setup(async () => {
        sandbox = sinon.createSandbox();
        await extension.deactivate();
        await waitForExtensionReady();
        await ensureAllEditorsClosed();
    });

    teardown(async () => {
        sandbox.restore();
        await extension.deactivate();
        await waitForExtensionReady();
        await ensureAllEditorsClosed();
    });

    suiteTeardown(async () => {
        await extension.deactivate();
        await waitForExtensionReady();
        await ensureAllEditorsClosed();
    });

    test('Response Panel Creation and Management', async function () {
        this.timeout(10000);

        const mockText = "Test selection";
        const mockResponse = await createResponsePanel(mockText);
        assert.ok(mockResponse, "Response panel should be created");

        const editors = vscode.window.visibleTextEditors;
        assert.strictEqual(editors.length, 1, "Should have one visible editor");

        await cleanupPanelsAndEditors();
    });

    test('Multiple Panel Resource Management', async function () {
        this.timeout(45000);
        const panelCount = 3;
        const initialMemory = process.memoryUsage();

        try {
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
                await waitForExtensionReady(100);
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

    test('Cancel Button Functionality', async function () {
        this.timeout(45000);

        let mockEditor: vscode.TextEditor | undefined;
        let responseEditor: vscode.TextEditor | undefined;

        try {
            await extension.deactivate();
            await waitForExtensionReady();

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

            // Create mock extension context with proper interface implementations
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

            // Create a mock environment variable collection
            class MockEnvironmentVariableCollection implements vscode.EnvironmentVariableCollection {
                private variables = new Map<string, vscode.EnvironmentVariableMutator>();
            
                [Symbol.iterator](): Iterator<[string, vscode.EnvironmentVariableMutator]> {
                    return this.variables[Symbol.iterator]();
                }
            
                public get size(): number {
                    return this.variables.size;
                }
            
                public clear(): void {
                    this.variables.clear();
                }
            
                public delete(variable: string): boolean {
                    return this.variables.delete(variable);
                }
            
                public forEach(callback: (variable: string, mutator: vscode.EnvironmentVariableMutator, collection: vscode.EnvironmentVariableCollection) => void): void {
                    this.variables.forEach((mutator, variable) => callback(variable, mutator, this));
                }
            
                public get(variable: string): vscode.EnvironmentVariableMutator | undefined {
                    return this.variables.get(variable);
                }
            
                public replace(variable: string, value: string): void {
                    this.variables.set(variable, {
                        value,
                        type: vscode.EnvironmentVariableMutatorType.Replace,
                        options: { applyAtProcessCreation: true }
                    });
                }
            
                public append(variable: string, value: string): void {
                    this.variables.set(variable, {
                        value,
                        type: vscode.EnvironmentVariableMutatorType.Append,
                        options: { applyAtProcessCreation: true }
                    });
                }
            
                public prepend(variable: string, value: string): void {
                    this.variables.set(variable, {
                        value,
                        type: vscode.EnvironmentVariableMutatorType.Prepend,
                        options: { applyAtProcessCreation: true }
                    });
                }
            
                public get persistent(): boolean {
                    return false;
                }
            
                public getScoped(scope: vscode.EnvironmentVariableScope): vscode.EnvironmentVariableCollection {
                    return this;
                }
            
                public description: string | vscode.MarkdownString | undefined;
            }

            const mockExtension: vscode.Extension<any> = {
                id: "test-extension",
                extensionUri: vscode.Uri.file(""),
                extensionPath: "",
                isActive: true,
                packageJSON: {
                    name: "test-extension",
                    version: "1.0.0",
                    engines: { vscode: "^1.60.0" }
                },
                exports: undefined,
                activate: () => Promise.resolve(),
                extensionKind: vscode.ExtensionKind.Workspace
            };
            const mockLanguageModelAccessInformation: vscode.LanguageModelAccessInformation = {
                // @ts-ignore
                async checkAccess(): Promise<LanguageModelAccessCheckResult> {
                    return {
                        granted: false,
                        feature: 'languageModel'
                    };
                }
            };
            const mockContext: vscode.ExtensionContext = {
                environmentVariableCollection: new MockEnvironmentVariableCollection(),
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
                extension: mockExtension,
                languageModelAccessInformation: mockLanguageModelAccessInformation
            };

            await extension.activate(mockContext, mockApiService);
            await waitForExtensionReady();

            await ensureAllEditorsClosed();
            await waitForExtensionReady();

            const mockText = "Test selection";
            const doc = await vscode.workspace.openTextDocument({
                content: mockText,
                language: 'plaintext'
            });
            mockEditor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
            mockEditor.selection = new vscode.Selection(0, 0, 0, mockText.length);
            await waitForExtensionReady();

            await vscode.commands.executeCommand('claude-vscode.askClaude');
            await waitForExtensionReady();

            const startTime = Date.now();
            const timeout = 5000;

            while (Date.now() - startTime < timeout) {
                const editors = vscode.window.visibleTextEditors;
                responseEditor = editors.find(e => e.document.languageId === 'markdown');
                if (responseEditor) break;
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            assert.ok(responseEditor, "Should find a markdown editor within timeout period");
            const editorContent = responseEditor.document.getText();
            assert.ok(editorContent.includes('Request cancelled'), "Response should contain expected text");

        } catch (error) {
            console.error('Cancel button test failed:', error);
            throw error;
        } finally {
            if (mockEditor) {
                await vscode.window.showTextDocument(mockEditor.document, mockEditor.viewColumn);
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }
            if (responseEditor) {
                await vscode.window.showTextDocument(responseEditor.document, responseEditor.viewColumn);
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }
            await extension.deactivate();
            await waitForExtensionReady();
            await ensureAllEditorsClosed();
        }
    });

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
                    preview: false
                });
                await waitForExtensionReady(100);
            }

            const editorCount = vscode.window.visibleTextEditors.length;
            assert.ok(editorCount > 0, 'Should have open editors');

            await extension.deactivate();
            await waitForExtensionReady();
            await ensureAllEditorsClosed(5, 1000);
            assert.strictEqual(vscode.window.visibleTextEditors.length, 0, 'Should cleanup on deactivation');
        } catch (error) {
            console.error('Lifecycle test failed:', error);
            await ensureAllEditorsClosed(5, 1000);
            throw error;
        }
    });
});
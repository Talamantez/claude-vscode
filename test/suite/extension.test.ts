// File: test/suite/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ClaudeExtension } from '../../src/extension';
import { thoroughCleanup } from '../../src/test-utils';
import { ClaudeApiService } from '../../src/services/claude-api';
import { waitForExtensionReady } from '../../src/utils';

// Test helper functions
function createFullDocumentSelection(doc: vscode.TextDocument): vscode.Selection {
    const lastLine = doc.lineCount - 1;
    const lastChar = doc.lineAt(lastLine).text.length;
    return new vscode.Selection(
        new vscode.Position(0, 0),             // anchor: start of document
        new vscode.Position(lastLine, lastChar) // active: end of document
    );
}

async function createTestDocument(content: string, language = 'plaintext'): Promise<vscode.TextEditor> {
    const doc = await vscode.workspace.openTextDocument({
        content,
        language
    });

    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = createFullDocumentSelection(doc);
    await waitForExtensionReady(500); // Give VS Code time to stabilize
    return editor;
}

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

suite('Claude Extension Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let testExtension: ClaudeExtension | null;
    let mockContext: vscode.ExtensionContext;
    let mockApiService: ClaudeApiService;
    let registeredCommands: Map<string, (...args: any[]) => any>;
    let originalExecuteCommand: typeof vscode.commands.executeCommand;

    suiteSetup(async () => {
        console.log('🎬 Starting test suite setup...');
        await thoroughCleanup();
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✨ Test suite setup complete!');
    });

    setup(async () => {
        console.log('\n🔄 Setting up test...');

        sandbox = sinon.createSandbox();
        testExtension = null;
        registeredCommands = new Map();

        // Store original executeCommand
        originalExecuteCommand = vscode.commands.executeCommand;

        // Create mock API service
        mockApiService = {
            askClaude: sandbox.stub().resolves({
                content: [{ type: 'text', text: 'Test response' }],
                id: 'test-id',
                model: 'claude-3-opus-20240229',
                role: 'assistant',
                stop_reason: null,
                stop_sequence: null,
                type: 'message',
                usage: { input_tokens: 0, output_tokens: 0 }
            })
        };

        // Stub command registration
        sandbox.stub(vscode.commands, 'registerCommand').callsFake((commandId: string, handler: (...args: any[]) => any) => {
            console.log(`🎯 Registering command: ${commandId}`);
            registeredCommands.set(commandId, handler);
            return {
                dispose: () => {
                    console.log(`🗑️ Disposing command: ${commandId}`);
                    registeredCommands.delete(commandId);
                }
            };
        });

        // Stub command execution to handle both custom and built-in commands
        sandbox.stub(vscode.commands, 'executeCommand').callsFake(async (commandId: string, ...args: any[]) => {
            console.log(`🎮 Executing command: ${commandId}`);

            // Check if it's one of our registered commands
            const handler = registeredCommands.get(commandId);
            if (handler) {
                return handler(...args);
            }

            // If not our command, check if it's a built-in VS Code command
            if (commandId.startsWith('workbench.') || commandId.startsWith('vscode.')) {
                try {
                    // Use the original executeCommand for built-in commands
                    return await originalExecuteCommand.apply(vscode.commands, [commandId, ...args]);
                } catch (error) {
                    console.warn(`⚠️ Built-in command execution failed: ${commandId}`, error);
                    // Don't throw for certain known commands that might not be available in test environment
                    if (commandId === 'workbench.action.closeAllEditors') {
                        return;
                    }
                    throw error;
                }
            }

            throw new Error(`Command '${commandId}' not found`);
        });

        mockContext = createMockExtensionContext();

        await thoroughCleanup();
        console.log('✅ Test setup complete!');
    });
    teardown(async () => {
        console.log('\n🧹 Starting test cleanup...');

        sandbox.restore();
        console.log('✨ Sandbox restored');

        if (testExtension) {
            await testExtension.dispose();
            testExtension = null;
            console.log('✅ Extension disposed');
        }

        await thoroughCleanup();
        await forceUnregisterAllCommands();
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('✨ Test cleanup complete!');
    });

    suiteTeardown(async () => {
        console.log('🎬 Starting suite teardown...');
        await thoroughCleanup();
        await forceUnregisterAllCommands();
        console.log('✨ Suite teardown complete!');
    });

    async function forceUnregisterAllCommands() {
        const ourCommands = [
            'claude-vscode.support',
            'claude-vscode.askClaude',
            'claude-vscode.documentCode'
        ];

        console.log('🗑️ Force unregistering commands...');
        const allCommands = await vscode.commands.getCommands();

        for (const cmd of ourCommands) {
            try {
                if (allCommands.includes(cmd)) {
                    console.log(`Attempting to unregister: ${cmd}`);
                    const disposable = vscode.commands.registerCommand(cmd, () => { });
                    disposable.dispose();
                }
            } catch (err) {
                console.warn(`⚠️ Error unregistering ${cmd}:`, err);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    test('Extension activates and registers commands properly', async function () {
        this.timeout(10000);
        console.log('\n🧪 Testing extension activation...');

        testExtension = new ClaudeExtension(mockContext, mockApiService);
        await testExtension.activate();

        assert.strictEqual(
            mockContext.subscriptions.length > 0,
            true,
            'Subscriptions should be registered for cleanup'
        );

        // Log registered commands for debugging
        console.log('📋 Registered commands:', Array.from(registeredCommands.keys()));

        console.log('✅ Activation test completed successfully!');
    });

    test('Response Panel Creation and Management', async function () {
        this.timeout(10000);
        console.log('\n🧪 Testing response panel creation...');

        testExtension = new ClaudeExtension(mockContext, mockApiService);
        await testExtension.activate();

        const editor = await createTestDocument("Test selection");
        await vscode.commands.executeCommand('claude-vscode.askClaude');

        const editors = vscode.window.visibleTextEditors;
        assert.ok(editors.length > 0, "Should have visible editors");

        console.log('✅ Response panel test complete!');
    });


    test('Extension handles errors gracefully', async function () {
        this.timeout(45000);
        console.log('\n🧪 Testing error handling...');

        const errorApiService: ClaudeApiService = {
            askClaude: sandbox.stub().rejects(new Error('Test API Error'))
        };

        testExtension = new ClaudeExtension(mockContext, errorApiService);
        await testExtension.activate();

        const showErrorMessageSpy = sandbox.spy(vscode.window, 'showErrorMessage');
        const editor = await createTestDocument("Test selection");
        await vscode.commands.executeCommand('claude-vscode.askClaude');

        assert.ok(showErrorMessageSpy.called, 'Error message should be shown');

        console.log('✅ Error handling test complete!');
    });


    test('Extension respects VS Code lifecycle events', async function () {
        this.timeout(10000);
        console.log('\n🧪 Testing VS Code lifecycle handling...');

        const windowStateChangeEvent = new vscode.EventEmitter<void>();
        sandbox.stub(vscode.window, 'onDidChangeWindowState')
            .returns({ dispose: () => { } });

        testExtension = new ClaudeExtension(mockContext, mockApiService);
        await testExtension.activate();

        // Get initial command count
        const initialCommandCount = registeredCommands.size;
        console.log('📊 Initial command count:', initialCommandCount);

        // Simulate window state change
        windowStateChangeEvent.fire();
        await waitForExtensionReady(500);

        // Verify commands are still registered
        assert.strictEqual(
            registeredCommands.size,
            initialCommandCount,
            'Commands should remain registered after window state change'
        );

        // Log current commands for debugging
        console.log('📋 Current commands:', Array.from(registeredCommands.keys()));

        console.log('✅ Lifecycle handling test complete!');
    });

    test('Memory management during multiple operations', async function () {
        this.timeout(45000);
        console.log('\n🧪 Testing memory management...');

        const initialMemory = process.memoryUsage();

        testExtension = new ClaudeExtension(mockContext, mockApiService);
        await testExtension.activate();

        for (let i = 0; i < 3; i++) {
            console.log(`📝 Operation ${i + 1}/3`);
            await createTestDocument(`Test content ${i}`);
            await vscode.commands.executeCommand('claude-vscode.askClaude');
            await thoroughCleanup();

            if (global.gc) {
                global.gc();
            }
        }

        const finalMemory = process.memoryUsage();
        console.log('📊 Memory usage (MB):', {
            initial: initialMemory.heapUsed / 1024 / 1024,
            final: finalMemory.heapUsed / 1024 / 1024,
            diff: (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024
        });

        assert.ok(
            (finalMemory.heapUsed - initialMemory.heapUsed) < 5 * 1024 * 1024,
            'Memory increase should be reasonable'
        );

        console.log('✅ Memory management test complete!');
    });
});

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
        extension: {
            id: 'test-extension',
            extensionUri: vscode.Uri.file(''),
            extensionPath: '',
            isActive: true,
            packageJSON: {},
            exports: undefined,
            activate: () => Promise.resolve(),
            extensionKind: vscode.ExtensionKind.Workspace
        },
        environmentVariableCollection: {
            getScoped: () => ({})
        } as any,
    } as unknown as vscode.ExtensionContext;
}
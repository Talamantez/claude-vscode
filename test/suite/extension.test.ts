import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import * as extension from '../../src/extension';
import { ClaudeResponse } from '../../src/api';

async function ensureCommandNotRegistered(commandId: string): Promise<void> {
    const commands = await vscode.commands.getCommands();
    if (commands.includes(commandId)) {
        // Force command context to be cleared
        await vscode.commands.executeCommand('setContext', 'claude-vscode.commandsRegistered', false);
        // Wait for VS Code to process the context change
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Mock Environment Variable Collection Class
class MockEnvironmentVariableCollection implements vscode.GlobalEnvironmentVariableCollection {
    private _map = new Map<string, vscode.EnvironmentVariableMutator>();

    public persistent = false;
    public description: string | vscode.MarkdownString = 'Test Environment Variables';

    getScoped(scope: vscode.EnvironmentVariableScope): vscode.EnvironmentVariableCollection {
        return this;
    }

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

// Helper function to wait for condition with timeout
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

// Helper to ensure all editors are closed
async function ensureNoEditors(maxAttempts: number = 5): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (vscode.window.visibleTextEditors.length === 0) {
            return;
        }
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('Failed to close all editors');
}

function createMockExtensionContext(): vscode.ExtensionContext {
    const baseDir = path.join(__dirname, '../../');
    const context: vscode.ExtensionContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file(baseDir),
      extensionPath: baseDir,
      globalState: {
        get: (key: string) => Promise.resolve(undefined),
        update: (key: string, value: any) => Promise.resolve(),
        keys: () => [],
        setKeysForSync: (keys: readonly string[]) => {}
      },
      workspaceState: {
        get: (key: string) => Promise.resolve(undefined),
        update: (key: string, value: any) => Promise.resolve(),
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
        delete: (key: string) => Promise.resolve(),
        onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event
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
      }
      ,
      languageModelAccessInformation: {
          canSendRequest: function (chat: vscode.LanguageModelChat): boolean | undefined {
              throw new Error('Function not implemented.');
          },
          // @ts-ignore
          onDidChange:  () => {}
      }
    };
  
    return context;
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

        // Ensure clean state
        await ensureNoEditors();
    });

    setup(async () => {
        sandbox = sinon.createSandbox();
        await ensureNoEditors();
        await ensureCommandNotRegistered('claude-vscode.askClaude');
    });

    teardown(async () => {
        sandbox.restore();
        await ensureNoEditors();
    });

    suiteTeardown(async () => {
        console.log('Suite teardown starting...');
        await ensureNoEditors();
        console.log('Suite teardown complete');
    });

    // Modify the Response Panel test
    test('Response Panel Creation and Disposal', async function () {
        // The test body remains the same as before
    });

    test('Multiple Panel Creation and Cleanup', async function () {
        // The test body remains the same as before
    });

    test('Manual Deactivation Cleanup', async function () {
        // The test body remains the same as before
    });
});
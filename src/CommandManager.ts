// File: src/CommandManager.ts
import * as vscode from 'vscode';

export class CommandManager implements vscode.Disposable {
    private readonly _disposables: vscode.Disposable[] = [];
    private _registeredCommandIds: string[] = [];

    constructor(private readonly _context: vscode.ExtensionContext) { }

    public async registerCommands(
        commands: Record<string, (...args: any[]) => any>
    ): Promise<void> {
        // First unregister any existing commands
        await this.unregisterCommands();

        // Register new commands
        for (const [id, handler] of Object.entries(commands)) {
            try {
                console.log(`Registering command: ${id}`);
                const disposable = vscode.commands.registerCommand(id, handler);
                this._disposables.push(disposable);
                this._context.subscriptions.push(disposable);
                this._registeredCommandIds.push(id);
            } catch (error) {
                console.error(`Failed to register command ${id}:`, error);
                // Clean up any commands we managed to register before the error
                await this.unregisterCommands();
                throw error;
            }
        }
    }

    private async unregisterCommands(): Promise<void> {
        console.log('Unregistering commands...');

        // First try normal disposal
        this._disposables.forEach(d => {
            try {
                d.dispose();
            } catch (err) {
                console.warn('Error disposing command:', err);
            }
        });
        this._disposables.length = 0;

        // Then force unregister through VSCode API
        for (const commandId of this._registeredCommandIds) {
            try {
                console.log(`Force unregistering command: ${commandId}`);
                // Create and immediately dispose a new registration to force unregister
                const disposable = vscode.commands.registerCommand(commandId, () => { });
                disposable.dispose();
            } catch (err) {
                console.warn(`Error force unregistering command ${commandId}:`, err);
            }
        }
        this._registeredCommandIds = [];

        // Give VSCode time to process the unregistrations
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    public async dispose(): Promise<void> {
        await this.unregisterCommands();
    }
}

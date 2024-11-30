# Claude Response (11/30/2024, 3:16:20 AM)

## Your Prompt
```
// File: src/ClaudeExtension.ts
import * as vscode from 'vscode';
import { ClaudeApiService, DefaultClaudeApiService } from './services/claude-api';
import { ClaudeResponse } from './api';
import { ResponsePanelManager } from './ResponsePanelManager';
import { CommandManager } from './CommandManager';
import { Timeouts } from './config';
import { LicenseService } from './services/license-service';

export class ClaudeExtension {
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _apiService: ClaudeApiService;
    private readonly _panelManager: ResponsePanelManager;
    private readonly _commandManager: CommandManager;
    private readonly _licenseService: LicenseService;

    constructor(
        private readonly _context: vscode.ExtensionContext,
        apiService?: ClaudeApiService
    ) {
        this._apiService = apiService || new DefaultClaudeApiService();
        this._panelManager = new ResponsePanelManager(_context);
        this._commandManager = new CommandManager(_context);
        this._licenseService = new LicenseService(_context);

        // Track these managers for disposal
        this._disposables.push(this._panelManager);
        this._disposables.push(this._commandManager);
    }
    public async activate(): Promise<void> {
        // Ensure clean state
        await this.dispose();

        // Initialize license
        await this._licenseService.initializeLicense();
        await this._licenseService.showLicenseStatus();

        // Register commands
        await this._commandManager.registerCommands({
            'claude-vscode.askClaude': async () => {
                const isLicenseValid = await this._licenseService.validateLicense();
                if (!isLicenseValid) {
                    await this._licenseService.showLicenseStatus();
                    return;
                }
                await this._handleClaudeRequest('general');
            },
            'claude-vscode.documentCode': async () => {
                const isLicenseValid = await this._licenseService.validateLicense();
                if (!isLicenseValid) {
                    await this._licenseService.showLicenseStatus();
                    return;
                }
                await this._handleClaudeRequest('document');
            }
        });
    }

    public async dispose(): Promise<void> {
        // Dispose all disposables
        await Promise.all(this._disposables.map(d => {
            try {
                return Promise.resolve(d.dispose());
            } catch (err) {
                console.warn('Error disposing:', err);
                return Promise.resolve();
            }
        }));
        this._disposables.length = 0;
    }

    private async _handleClaudeRequest(mode: 'general' | 'document'): Promise<void> {
        const statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            Timeouts.STATUS_BAR_PRIORITY
        );
        this._context.subscriptions.push(statusBarItem);
        statusBarItem.text = "$(sync~spin) Asking Claude...";
        statusBarItem.show();

        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('Please open a file and select some text first');
                return;
            }

            const selection = editor.selection;
            const text = editor.document.getText(selection);
            if (!text) {
                vscode.window.showInformationMessage('Please select some text first');
                return;
            }

            const tokenSource = new vscode.CancellationTokenSource();
            this._context.subscriptions.push({ dispose: () => tokenSource.dispose() });

            const response = await this._withProgress(mode, async (progress, token) => {
                token.onCancellationRequested(() => tokenSource.cancel());
                const prompt = mode === 'document'
                    ? `Please document this code:\n\n${text}`
                    : text;
                return await this._apiService.askClaude(prompt, tokenSource.token);
            });

            await this._panelManager.createResponsePanel(
                this._formatResponse(text, response, mode),
                editor
            );

        } catch (error) {
            if (error instanceof vscode.CancellationError) {
                vscode.window.showInformationMessage('Request cancelled');
                return;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Error: ${errorMessage}`);
            console.error('Error handling Claude request:', error);
        } finally {
            statusBarItem.dispose();
        }
    }

    private async _withProgress<T>(
        mode: 'general' | 'document',
        task: (
            progress: vscode.Progress<{ message?: string; increment?: number }>,
            token: vscode.CancellationToken
        ) => Promise<T>
    ): Promise<T> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: mode === 'document' ? 'Generating Documentation...' : 'Asking Claude...',
                cancellable: true
            },
            task
        );
    }

    private _formatResponse(prompt: string, response: ClaudeResponse, mode: 'general' | 'document'): string {
        const now = new Date().toLocaleString();
        const title = mode === 'document' ? 'Code Documentation' : 'Claude Response';
        const promptTitle = mode === 'document' ? 'Original Code' : 'Your Prompt';

        const content = response.content
            ?.map(item => item.text || '')
            .join('\n') || 'No response content';

        return [
            `# ${title} (${now})`,
            '',
            `## ${promptTitle}`,
            '```',
            prompt,
            '```',
            '',
            '## Response',
            content,
            '',
            '---',
            `*Using ${response.model}*`,
            `*Tokens: ${response.usage?.input_tokens} input, ${response.usage?.output_tokens} output*`
        ].join('\n');
    }
}
```

## Response
The provided code is an implementation of a Claude extension for Visual Studio Code (VS Code). Here's a breakdown of the main components and functionality:

1. `ClaudeExtension` class:
   - This is the main class that represents the Claude extension.
   - It has dependencies on various services and managers, such as `ClaudeApiService`, `ResponsePanelManager`, `CommandManager`, and `LicenseService`.
   - The constructor initializes these dependencies and tracks them for disposal.

2. `activate` method:
   - This method is called when the extension is activated.
   - It ensures a clean state by disposing of any previous disposables.
   - It initializes the license and shows the license status.
   - It registers commands using the `CommandManager`, including "claude-vscode.askClaude" and "claude-vscode.documentCode".

3. `dispose` method:
   - This method is called when the extension is deactivated.
   - It disposes of all the disposables tracked by the extension.

4. `_handleClaudeRequest` method:
   - This private method handles the Claude request based on the provided mode ("general" or "document").
   - It checks if there is an active text editor and selected text.
   - It creates a status bar item to display the progress of the request.
   - It calls the `_withProgress` method to show a progress notification and make the API request using `ClaudeApiService`.
   - It creates a response panel using `ResponsePanelManager` to display the formatted response.
   - It handles errors and cancellation of the request.

5. `_withProgress` method:
   - This private method is a helper function to show a progress notification while making the API request.
   - It uses `vscode.window.withProgress` to display the progress and allows cancellation of the request.

6. `_formatResponse` method:
   - This private method formats the response from the Claude API into a readable format.
   - It includes the title, timestamp, original prompt, response content, model information, and token usage.

The extension relies on several services and managers:
- `ClaudeApiService`: Provides methods to make API requests to the Claude service.
- `ResponsePanelManager`: Manages the creation and display of response panels in VS Code.
- `CommandManager`: Handles the registration and execution of VS Code commands.
- `LicenseService`: Manages the initialization, validation, and display of the license status.

Overall, this extension allows users to interact with the Claude API from within VS Code. They can make general requests or request code documentation by selecting text in the active editor. The extension handles the API requests, displays progress notifications, and presents the formatted response in a dedicated panel.

---
*Using claude-3-opus-20240229*
*Tokens: 1595 input, 625 output*
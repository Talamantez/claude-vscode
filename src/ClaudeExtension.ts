// File: src/ClaudeExtension.ts
import * as vscode from 'vscode';
import { ClaudeApiService, DefaultClaudeApiService } from './services/claude-api';
import { ClaudeResponse } from './api';
import { ResponsePanelManager } from './ResponsePanelManager';
import { CommandManager } from './CommandManager';
import { Timeouts } from './config';

export class ClaudeExtension {
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _apiService: ClaudeApiService;
    private readonly _panelManager: ResponsePanelManager;
    private readonly _commandManager: CommandManager;

    constructor(
        private readonly _context: vscode.ExtensionContext,
        apiService?: ClaudeApiService
    ) {
        this._apiService = apiService || new DefaultClaudeApiService();
        this._panelManager = new ResponsePanelManager(_context);
        this._commandManager = new CommandManager(_context);

        // Track these managers for disposal
        this._disposables.push(this._panelManager);
        this._disposables.push(this._commandManager);
    }

    public async activate(): Promise<void> {
        // Ensure clean state
        await this.dispose();

        // Register commands
        await this._commandManager.registerCommands({
            'claude-vscode.support': () => {
                vscode.env.openExternal(vscode.Uri.parse('https://buymeacoffee.com/conscious.robot'));
            },
            'claude-vscode.askClaude': () => this._handleClaudeRequest('general'),
            'claude-vscode.documentCode': () => this._handleClaudeRequest('document')
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
// src/ClaudeExtension.ts
import * as vscode from 'vscode';
import { ClaudeApiService, DefaultClaudeApiService } from './services/claude-api';
import { ApiService } from './services/api-service';
import { ClaudeResponse } from './api';
import { ResponsePanelManager } from './ResponsePanelManager';
import { CommandManager } from './CommandManager';
import { Timeouts, getConfiguration } from './config';

export class ClaudeExtension {
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _apiService: ApiService;
    private readonly _claudeApiService: ClaudeApiService;
    private readonly _panelManager: ResponsePanelManager;
    private readonly _commandManager: CommandManager;

    constructor(
        private readonly _context: vscode.ExtensionContext,
        claudeApiService?: ClaudeApiService
    ) {
        this._claudeApiService = claudeApiService || new DefaultClaudeApiService();
        this._apiService = new ApiService();
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
            'claude-vscode.askClaude': async () => {
                await this._handleClaudeRequest('general');
            },
            'claude-vscode.documentCode': async () => {
                await this._handleClaudeRequest('document');
            },
            'claude-vscode.analyzeWorkspace': async () => {
                await this._handleArchitectureAnalysis();
            }
        });

        // Show initial status
        await this._updateStatusBar();
    }

    private async _updateStatusBar(): Promise<void> {
        try {
            const quota = await this._apiService.getQuota();
            const statusBarItem = vscode.window.createStatusBarItem(
                vscode.StatusBarAlignment.Right,
                100
            );

            statusBarItem.text = `$(tools) ${quota.tier} - ${quota.remaining_quota} tokens left`;
            statusBarItem.tooltip = `Daily Limit: ${quota.daily_limit}\nMonthly Limit: ${quota.monthly_limit}`;
            statusBarItem.show();

            this._disposables.push(statusBarItem);
        } catch (error) {
            console.warn('Failed to update status bar:', error);
        }
    }

    private async _handleArchitectureAnalysis(): Promise<void> {
        const workspaceFiles = await vscode.workspace.findFiles('**/*');

        // Show progress notification
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing workspace architecture...',
            cancellable: false
        }, async () => {
            try {
                const fileNames = workspaceFiles.map(file => file.fsPath.split('/').pop() || '');
                const directories = Array.from(new Set(workspaceFiles.map(file => {
                    const parts = file.fsPath.split('/');
                    return parts[parts.length - 2] || '';
                })));

                const architecture = await this._apiService.detectArchitecture(fileNames, directories);

                // Create and show report
                const report = [
                    `# Workspace Architecture Analysis\n`,
                    `## Detected Framework: ${architecture.detected_framework}`,
                    `Confidence: ${(architecture.confidence * 100).toFixed(1)}%\n`,
                    `## Detected Markers`,
                    architecture.markers.map(m => `- ${m}`).join('\n'),
                    architecture.warnings?.length ? '\n## Warnings' : '',
                    architecture.warnings?.map(w => `- ${w}`).join('\n') || ''
                ].join('\n');

                await this._panelManager.createResponsePanel(report);

            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Architecture analysis failed: ${message}`);
            }
        });
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
            // First validate license
            const isValid = await this._apiService.validateLicense();
            if (!isValid) {
                vscode.window.showErrorMessage('Invalid or expired license. Please check your API key.');
                return;
            }

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

            // Get workspace context for architecture detection
            const workspaceFiles = await vscode.workspace.findFiles('**/*');
            const fileNames = workspaceFiles.map(file => file.fsPath.split('/').pop() || '');
            const directories = Array.from(new Set(workspaceFiles.map(file => {
                const parts = file.fsPath.split('/');
                return parts[parts.length - 2] || '';
            })));

            const tokenSource = new vscode.CancellationTokenSource();
            this._context.subscriptions.push({ dispose: () => tokenSource.dispose() });

            // Make parallel requests
            const [architecture, claudeResponse] = await Promise.all([
                this._apiService.detectArchitecture(fileNames, directories),
                this._withProgress(mode, async (progress, token) => {
                    token.onCancellationRequested(() => tokenSource.cancel());
                    const prompt = mode === 'document'
                        ? `Please document this code:\n\n${text}`
                        : text;
                    return await this._claudeApiService.askClaude(prompt, tokenSource.token);
                })
            ]);

            // Track token usage
            const tokens = claudeResponse.usage?.input_tokens + claudeResponse.usage?.output_tokens || 0;
            await this._apiService.trackUsage(tokens);

            // Update status bar with new quota
            await this._updateStatusBar();

            // Format response with architecture info if relevant
            let responseContent = this._formatResponse(text, claudeResponse, mode);

            if (mode === 'document') {
                responseContent += '\n\n## Workspace Analysis\n';
                responseContent += `Detected Framework: ${architecture.detected_framework}\n`;
                responseContent += `Confidence: ${(architecture.confidence * 100).toFixed(1)}%\n`;
                responseContent += `\nMarkers:\n${architecture.markers.map(m => `- ${m}`).join('\n')}\n`;

                if (architecture.warnings?.length) {
                    responseContent += `\nWarnings:\n${architecture.warnings.map(w => `- ${w}`).join('\n')}\n`;
                }
            }

            await this._panelManager.createResponsePanel(responseContent, editor);

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

    public async dispose(): Promise<void> {
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
}
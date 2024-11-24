// File: src/ResponsePanelManager.ts
import * as vscode from 'vscode';

export class ResponsePanelManager implements vscode.Disposable {
    private readonly _disposables: vscode.Disposable[] = [];

    constructor(private readonly _context: vscode.ExtensionContext) { }

    public async createResponsePanel(
        content: string,
        sourceEditor?: vscode.TextEditor
    ): Promise<vscode.TextEditor | undefined> {
        try {
            // Store source editor state
            const sourceDocument = sourceEditor?.document;
            const sourceSelection = sourceEditor?.selection;
            const sourceViewColumn = sourceEditor?.viewColumn;

            // Create response document
            const doc = await vscode.workspace.openTextDocument({
                content,
                language: 'markdown'
            });

            // Track document for disposal
            this._disposables.push({
                dispose: () => {
                    vscode.window.showTextDocument(doc).then(() => {
                        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                    });
                }
            });

            // Show document
            const responseEditor = await vscode.window.showTextDocument(doc, {
                viewColumn: sourceViewColumn
                    ? sourceViewColumn + 1 as vscode.ViewColumn
                    : vscode.ViewColumn.Two,
                preserveFocus: true,
                preview: false
            });

            // Restore source editor if needed
            if (sourceDocument && !vscode.window.visibleTextEditors.some(e => e.document === sourceDocument)) {
                await vscode.window.showTextDocument(sourceDocument, {
                    viewColumn: sourceViewColumn,
                    selection: sourceSelection,
                    preserveFocus: false
                });
            }

            return responseEditor;
        } catch (error) {
            console.error('Error creating response panel:', error);
            throw error;
        }
    }

    public dispose(): void {
        this._disposables.forEach(d => d.dispose());
        this._disposables.length = 0;
    }
}
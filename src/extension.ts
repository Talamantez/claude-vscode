// src/extension.ts
import * as vscode from 'vscode';
import { askClaude } from './api.ts';

// Helper function to extract content from Claude response
interface ClaudeResponse {
  content: { text: string }[];
}

function extractContent(response: ClaudeResponse): string {
  if (!response || !response.content) return 'No response content';
  return response.content
    .map((item: { text: string }) => item.text || '')
    .join('\n');
}

// Format the response
function formatResponse(prompt: string, response: any, mode: 'general' | 'document' = 'general'): string {
  const now = new Date().toLocaleString();
  
  return [
    `# ${mode === 'document' ? 'Code Documentation' : 'Claude Response'} (${now})`,
    '',
    mode === 'document' ? '## Original Code' : '## Your Prompt',
    '```',
    prompt,
    '```',
    '',
    '## Response',
    extractContent(response),
    '',
    '---',
    `*Using ${response.model}*`,
    `*Tokens: ${response.usage?.input_tokens} input, ${response.usage?.output_tokens} output*`
  ].join('\n');
}

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBarItem);

  async function handleClaudeRequest(mode: 'general' | 'document') {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor!');
      return;
    }
    
    const selection = editor.selection;
    const text = editor.document.getText(selection);
    if (!text) {
      vscode.window.showInformationMessage('Please select some text first');
      return;
    }

    statusBarItem.text = "$(sync~spin) Asking Claude...";
    statusBarItem.show();

    try {
      const prompt = mode === 'document' 
        ? `Please document this code:\n\n${text}`
        : text;

      const response = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: mode === 'document' ? 'Generating Documentation...' : 'Asking Claude...',
        cancellable: false
      }, async () => {
        return await askClaude(prompt);
      });

      const formattedResponse = formatResponse(text, response, mode);
      const doc = await vscode.workspace.openTextDocument({
        content: formattedResponse,
        language: 'markdown'
      });
      
      await vscode.window.showTextDocument(doc, { 
        preview: true,
        viewColumn: vscode.ViewColumn.Beside 
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      statusBarItem.hide();
    }
  }

  const askCommand = vscode.commands.registerCommand('claude-vscode.askClaude', () => 
    handleClaudeRequest('general'));
  
  const documentCommand = vscode.commands.registerCommand('claude-vscode.documentCode', () => 
    handleClaudeRequest('document'));

  context.subscriptions.push(askCommand, documentCommand);
}
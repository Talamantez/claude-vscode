// code-reviewer-extension.ts
import * as vscode from 'vscode';
import { askClaude } from 'claude-vscode';

export function activate(context: vscode.ExtensionContext) {
  // Specialized code review command
  let reviewCommand = vscode.commands.registerCommand(
    'claude-review.reviewCode',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const text = editor.document.getText(editor.selection);
      const reviewPrompt = `Review this code for:
- Best practices
- Performance issues
- Security concerns
- Edge cases

Code to review:
${text}

Provide specific, actionable feedback.`;

      // Uses your stable Claude connection
      const response = await askClaude(reviewPrompt);
      // Custom formatting for reviews
      displayReviewResponse(response);
    }
  );
}

function displayReviewResponse(response: any) {
  // Custom review display with categories
  const issues = sortIntoCategories(response.content);
  // Could use TreeView or custom WebView
}
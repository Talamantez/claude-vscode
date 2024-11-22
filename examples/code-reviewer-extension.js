"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
// code-reviewer-extension.ts
const vscode = require("vscode");
const claude_vscode_1 = require("claude-vscode");
function activate(context) {
    // Specialized code review command
    let reviewCommand = vscode.commands.registerCommand('claude-review.reviewCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
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
        const response = await (0, claude_vscode_1.askClaude)(reviewPrompt);
        // Custom formatting for reviews
        displayReviewResponse(response);
    });
}
function displayReviewResponse(response) {
    // Custom review display with categories
    const issues = sortIntoCategories(response.content);
    // Could use TreeView or custom WebView
}
//# sourceMappingURL=code-reviewer-extension.js.map
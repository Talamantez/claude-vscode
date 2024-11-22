"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
// react-analyzer-extension.ts
const vscode = require("vscode");
const claude_vscode_1 = require("claude-vscode");
function activate(context) {
    let analyzeCommand = vscode.commands.registerCommand('claude-react.analyzeComponent', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const component = editor.document.getText(editor.selection);
        const analysisPrompt = `Analyze this React component:
${component}

Provide:
1. Component structure
2. Prop usage
3. State management
4. Performance considerations
5. Accessibility issues`;
        const response = await (0, claude_vscode_1.askClaude)(analysisPrompt);
        showComponentAnalysis(response);
    });
}
function showComponentAnalysis(response) {
    // Custom WebView with interactive sections
    const panel = vscode.window.createWebviewPanel('reactAnalysis', 'React Analysis', vscode.ViewColumn.Beside, { enableScripts: true });
    panel.webview.html = `
    <html>
      <body>
        <h1>Component Analysis</h1>
        <div class="analysis-sections">
          ${formatAnalysisSections(response)}
        </div>
      </body>
    </html>
  `;
}
//# sourceMappingURL=react-analyzer-extension.js.map
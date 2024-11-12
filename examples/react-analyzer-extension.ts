// react-analyzer-extension.ts
import * as vscode from 'vscode';
import { askClaude, ClaudeResponse } from 'claude-vscode';

export function activate(context: vscode.ExtensionContext) {
  let analyzeCommand = vscode.commands.registerCommand(
    'claude-react.analyzeComponent',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const component = editor.document.getText(editor.selection);
      const analysisPrompt = `Analyze this React component:
${component}

Provide:
1. Component structure
2. Prop usage
3. State management
4. Performance considerations
5. Accessibility issues`;

      const response = await askClaude(analysisPrompt);
      showComponentAnalysis(response);
    }
  );
}

function showComponentAnalysis(response: ClaudeResponse) {
  // Custom WebView with interactive sections
  const panel = vscode.window.createWebviewPanel(
    'reactAnalysis',
    'React Analysis',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

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
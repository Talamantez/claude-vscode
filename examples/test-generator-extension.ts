// test-generator-extension.ts
import * as vscode from 'vscode';
import { askClaude } from 'claude-vscode';

export function activate(context: vscode.ExtensionContext) {
  let generateTestCommand = vscode.commands.registerCommand(
    'claude-test.generateTests',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const code = editor.document.getText(editor.selection);
      const framework = detectTestFramework(editor.document);
      
      const testPrompt = `Generate comprehensive tests for this code using ${framework}:
${code}

Include:
- Unit tests
- Edge cases
- Mock examples
- Error scenarios`;

      const response = await askClaude(testPrompt);
      await createTestFile(response, editor.document);
    }
  );
}

function createTestFile(response: ClaudeResponse, sourceDoc: vscode.TextDocument) {
  // Creates a new test file next to the source
  const testPath = sourceDoc.uri.path.replace('.ts', '.test.ts');
  // ... create and open test file
}
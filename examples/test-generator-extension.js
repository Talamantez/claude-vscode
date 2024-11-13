"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
// test-generator-extension.ts
const vscode = require("vscode");
const claude_vscode_1 = require("claude-vscode");
function activate(context) {
    let generateTestCommand = vscode.commands.registerCommand('claude-test.generateTests', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const code = editor.document.getText(editor.selection);
        const framework = detectTestFramework(editor.document);
        const testPrompt = `Generate comprehensive tests for this code using ${framework}:
${code}

Include:
- Unit tests
- Edge cases
- Mock examples
- Error scenarios`;
        const response = await (0, claude_vscode_1.askClaude)(testPrompt);
        await createTestFile(response, editor.document);
    });
}
function createTestFile(response, sourceDoc) {
    // Creates a new test file next to the source
    const testPath = sourceDoc.uri.path.replace('.ts', '.test.ts');
    // ... create and open test file
}
//# sourceMappingURL=test-generator-extension.js.map
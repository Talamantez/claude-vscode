# Claude AI Assistant for VS Code

⚠️ DEVELOPMENT STATUS: This extension is currently in active development and not ready for production use. Features may be incomplete or change significantly. Use at your own risk and avoid using with sensitive information or production environments.



Bring the power of Claude directly into your development workflow. This extension allows you to interact with Claude AI without leaving VS Code, helping you write, document, and understand code more effectively.

![Claude VSCode Assistant Demo](logo.png)

## Features

- **Ask Claude**: Select any text and get instant AI assistance
- **Document Code**: Automatically generate documentation for your code
- **Context-Aware**: Claude understands your code and provides relevant responses
- **Markdown Output**: Responses are formatted in clean, readable Markdown

## Getting Started

1. Install the extension from the VS Code Marketplace
2. Use one of the following commands:
   - Select text and use `Ask Claude` for general assistance
   - Select code and use `Document Code` for automatic documentation

## Usage Examples

### Ask Claude
1. Select any text in your editor
2. Right-click and select "Ask Claude" or use the Command Palette (Ctrl+Shift+P) and type "Ask Claude"
3. Claude will analyze your selection and provide a response in a new editor tab

### Document Code
1. Select the code you want to document
2. Right-click and select "Document Code" or use the Command Palette
3. Claude will generate comprehensive documentation for your code

## Configuration

You can configure the extension in your VS Code settings:

```json
{
  "claude-vscode.model": "claude-3-opus-20240229" // or "claude-3-sonnet-20240229"
}
```

## Tips for Best Results

1. **Be Specific**: The more context you provide, the better Claude can help
2. **Select Relevant Code**: When documenting, include function signatures and important context
3. **Use Clear Questions**: For general queries, phrase your questions clearly

## Requirements

- Visual Studio Code version 1.80.0 or higher
- Active internet connection

## Privacy & Security

- All queries are processed through Claude's API with standard security measures
- No code or queries are stored permanently
- Responses are generated in real-time and displayed only in your VS Code environment

## Support

If you encounter any issues or have suggestions:
- File an issue on our [GitHub repository](https://github.com/conscious-robot/claude-vscode)
- Contact support through the marketplace page

## License

This extension is licensed under the MIT License. See the LICENSE file for details.

---
Made with ❤️ by [conscious-robot](https://github.com/conscious-robot)
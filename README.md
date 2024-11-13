# Claude VS Code Assistant

[![CI/CD](https://github.com/talamantez/claude-vscode/actions/workflows/ci.yml/badge.svg)](https://github.com/talamantez/claude-vscode/actions/workflows/ci.yml)

Bring the power of Claude directly into your development workflow. This extension allows you to interact with Claude AI without leaving VS Code, helping you write, document, and understand code more effectively.

https://www.awesomescreenshot.com/video/33547525?key=8c3b97293ba780ded6ba9d19f9423f35

## Features

- **Ask Claude**: Select any text and get instant AI assistance
- **Document Code**: Automatically generate documentation for your code
- **Context-Aware**: Claude understands your code and provides relevant responses
- **Markdown Output**: Responses are formatted in clean, readable Markdown

## Getting Started

1. Install the extension from the VS Code Marketplace
2. Select text and use one of two commands:
   - `Ask Claude` for general assistance
   - `Document Code` for automatic documentation

That's it! No fuss, no muss.

## Usage Examples

### Ask Claude

1. Select any text in your editor
2. Right-click and select "Claude AI" > "Ask Claude" or use the Command Palette (Ctrl+Shift+P) and type "Ask Claude"
3. Claude will analyze your selection and provide a response in a new editor tab

### Document Code

1. Select the code you want to document
2. Right-click and select "Claude AI" > "Document Code With Claude" or use the Command Palette (Ctrl+Shift+P) and type "Document Code"
3. Claude will generate comprehensive documentation for your code

## Configuration

You can configure the extension in your VS Code settings:

```json
{
  "claude-vscode.model": "claude-3-opus-20240229"
}
```

or

```json
{
  "claude-vscode.model": "claude-3-sonnet-20240229"
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

- File an issue on our [GitHub repository](https://github.com/talamantez/claude-vscode)
- Contact support through the marketplace page

## Update Plan 🗺️

This extension is designed as a stable foundation for Claude integration in VS Code. Think of it as a reliable base that other extensions can build upon.

### Core Extension Philosophy

- 🎯 Rock-solid Claude communication
- 🚀 Clean, predictable API surface
- ⚡ Fast, reliable performance
- 🛠️ Extensible design

### For Extension Builders

Want to build on top of Claude VS Code? Great! You can:

- 🔌 Use our stable Claude connection
- 🎨 Create specialized UX for specific use cases
- 🏗️ Build workflow-specific features
- 🧪 Experiment with new ideas

### What We Maintain

- 📡 Core Claude integration
- 🔄 API version updates
- 🐛 Bug fixes
- ⚡ Performance improvements

Think of this as "Claude as a Service" - we handle the stable connection, you build the cool stuff! 🤖

Have ideas for extensions? We'd love to see what you build! Check out our GitHub for integration examples.

![Conscious Robot](logo.png)

## License

This extension is licensed under the MIT License. See the LICENSE file for details.

---

Made with ❤️ by [conscious-robot](https://github.com/talamantez)

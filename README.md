# Claude VS Code Assistant

[![CI/CD](https://github.com/talamantez/claude-vscode/actions/workflows/ci.yml/badge.svg)](https://github.com/talamantez/claude-vscode/actions/workflows/ci.yml)

Bring the power of Claude directly into your development workflow. This extension allows you to interact with Claude AI without leaving VS Code, helping you write, document, and understand code more effectively.

[Watch Demo Video](https://www.awesomescreenshot.com/video/33547525?key=8c3b97293ba780ded6ba9d19f9423f35)

## Features

* **Ask Claude**: Select any text and get instant AI assistance
* **Document Code**: Automatically generate documentation for your code
* **Context-Aware**: Claude understands your code and provides relevant responses
* **Markdown Output**: Responses are formatted in clean, readable Markdown

## Getting Started

1. Install the extension from the VS Code Marketplace
2. Set up your Claude API key (see Security section below)
3. Select text and use one of two commands:
    * `Ask Claude` for general assistance
    * `Document Code` for automatic documentation

That's it! No fuss, no muss.

## Security & API Key Setup 🔐

### Obtaining an API Key

1. Sign up for an Anthropic account
2. Navigate to your API settings
3. Generate a new API key
4. Keep your key secure - never share it or commit it to version control

### Setting Up Your Key (Two Secure Methods)

#### Method 1: VS Code Settings (Recommended)
1. Open VS Code Settings (Ctrl/Cmd + ,)
2. Search for "Claude VS Code"
3. Enter your API key in the "API Key" field
4. VS Code securely stores your key in its encrypted storage

#### Method 2: Environment Variable
* Set `CLAUDE_API_KEY` in your environment variables
* Ensure the variable is set securely according to your OS best practices

### Security Measures

* **Key Storage**: 
    * Keys are stored in VS Code's secure storage system
    * Never logged or exposed in plain text
    * Not visible in settings UI after saving

* **Data Transmission**:
    * All API communication uses HTTPS
    * Keys are only sent to official Anthropic endpoints
    * No third-party services involved

* **Best Practices**:
    * Regularly rotate your API key
    * Use environment variables in production
    * Never share your key or include it in screenshots
    * Set up key expiration when possible

## Usage Examples

### Ask Claude
1. Select any text in your editor
2. Right-click and select "Claude AI" > "Ask Claude"
   OR
   Use Command Palette (Ctrl+Shift+P) and type "Ask Claude"
3. Claude will analyze your selection and provide a response in a new editor tab

### Document Code
1. Select the code you want to document
2. Right-click and select "Claude AI" > "Document Code With Claude"
   OR
   Use Command Palette (Ctrl+Shift+P) and type "Document Code"
3. Claude will generate comprehensive documentation for your code

## Configuration

### Model Selection
Choose your preferred Claude model in VS Code settings:

```jsonc
{
    "claude-vscode.model": "claude-3-opus-20240229"
}
```

or

```jsonc
{
    "claude-vscode.model": "claude-3-sonnet-20240229"
}
```

## Tips for Best Results

1. **Be Specific**: The more context you provide, the better Claude can help
2. **Select Relevant Code**: When documenting, include function signatures and important context
3. **Use Clear Questions**: For general queries, phrase your questions clearly

## Requirements

* Visual Studio Code version 1.80.0 or higher
* Active internet connection
* Claude API key (see Security section)

## Privacy & Data Handling

* **No Data Storage**:
    * Queries are processed in real-time only
    * No code or queries are stored permanently
    * Responses exist only in your VS Code environment

* **Request Handling**:
    * Direct communication with Claude API
    * No intermediate servers
    * All communication over HTTPS

* **User Privacy**:
    * No telemetry collection
    * No user tracking
    * No data sharing with third parties

## Support

Need help? Try these resources:

* [GitHub Issues](https://github.com/talamantez/claude-vscode)
* Marketplace Support Page
* Documentation Wiki

## Update Plan 🗺️

This extension is designed as a stable foundation for Claude integration in VS Code. Think of it as a reliable base that other extensions can build upon.

### Core Extension Philosophy

* 🎯 Rock-solid Claude communication
* 🚀 Clean, predictable API surface
* ⚡ Fast, reliable performance
* 🛠️ Extensible design

### For Extension Builders

Want to build on top of Claude VS Code? Great! You can:

* 🔌 Use our stable Claude connection
* 🎨 Create specialized UX for specific use cases
* 🏗️ Build workflow-specific features
* 🧪 Experiment with new ideas

### What We Maintain

* 📡 Core Claude integration
* 🔄 API version updates
* 🐛 Bug fixes
* ⚡ Performance improvements

Think of this as "Claude as a Service" - we handle the stable connection, you build the cool stuff! 🤖

Have ideas for extensions? We'd love to see what you build! Check out our GitHub for integration examples.

![Conscious Robot](logo.png)

## License

This extension is licensed under the MIT License. See the LICENSE file for details.

---

Made with ❤️ by [conscious-robot](https://github.com/talamantez)
# Right Click? Claude!

"We go faster when we go together" [Baratunde Thurston](https://podcasts.apple.com/us/podcast/life-with-machines/id1766829040)
Bring the power of Claude directly into your development workflow. This extension allows you to interact with Claude AI without leaving VS Code, helping you write, document, and understand code more effectively.

[Basic usage (video)](https://www.awesomescreenshot.com/video/33547525?key=8c3b97293ba780ded6ba9d19f9423f35)

[Tip! Include text from previous AI responses (video)](https://www.awesomescreenshot.com/video/33636474?key=d16f8b7ef6b546ae58390f5defccb571)

## Key Features

* Ask Claude: Select any text and right click to get instant AI assistance
* Document Code: Automatically generate documentation for your code
* Context-Aware: Include context by including text from previous responses.
* Markdown Output: Responses are formatted in clean, readable Markdown

## Quick Start

1. Install the extension
2. Set up your Claude API key (see below)
3. Select text, right click, select Claude AI then select:
   * `Ask Claude` for general assistance
   * `Document Code` for automatic documentation

That's it! No fuss, no muss.

## API Key Setup

### Get Your Key
1. Sign up for an Anthropic account
2. Navigate to API settings
3. Generate a new API key
4. Keep it secure - never share or commit it

### Add Your Key

Method 1 - VS Code Settings (Recommended):
1. Open Settings (Ctrl/Cmd + ,)
2. Search for "Claude VS Code"
3. Enter your API key
4. VS Code stores it securely

Method 2 - Environment Variable:
* Set CLAUDE_API_KEY in your environment
* Ensure secure variable management

## Security First

* Keys stored in VS Code's secure storage
* HTTPS-only API communication
* No data storage or logging
* Direct Claude API integration
* Your key, your control

## Model Selection

Choose your model in VS Code settings:
* claude-3-opus-20240229 (default)
* claude-3-sonnet-20240229

## Requirements

* VS Code 1.80.0+
* Internet connection
* Claude API key

Need help? Visit our [GitHub repository](https://github.com/talamantez/claude-vscode)

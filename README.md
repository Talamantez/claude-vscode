# Claude VSCode Extension

A VSCode extension that integrates Claude AI assistant directly into your editor.

## Features

- 🤖 Ask Claude: Select text and get AI assistance directly in VSCode
- 📝 Document Code: Automatically generate documentation for your code
- ⚡ Fast responses through optimized Deno server
- 🎨 Clean markdown formatting with syntax highlighting

## Installation

1. Clone this repository
2. Run `pnpm install`
3. Build with `pnpm run build`
4. Press F5 in VSCode to run the extension in debug mode

## Usage

1. Select text in any editor
2. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
3. Type "Claude" and choose:
   - "Ask Claude" for general questions
   - "Document Code" for code documentation

## Configuration

In VSCode settings:
- `claude-vscode.model`: Choose Claude model (default: claude-3-opus-20240229)

## Development

- Build: `pnpm run build`
- Watch: `pnpm run watch`
- Lint: `pnpm run lint`

## License

MIT

![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/[your-publisher-name].claude-vscode)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
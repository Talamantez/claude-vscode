# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.1.9] - 2024-11-21
### Changed
 - Fixed broken link in readme, fix changelog date

## [1.1.8] - 2024-11-21
### Changed
 - Added Cancel Button, updated test suite

## [1.1.7] - 2024-11-18
### Changed
 - Updated Icon

## [1.1.6] - 2024-11-18
### Changed
 - Update Readme: hoist Feminist Inclusion Leadership Center fundraiser

## [1.1.4] - 2024-11-18
### Changed
 - Update Readme with new product announcement

## [1.1.4] - 2024-11-18
### Fixed
- Remove auto-closing of response windows
- Simplified window management
- Cleaned up editor disposal code

## [1.1.3] - 2024-11-18
### Fixed
- Response windows now properly handle readonly mode
- Improved window management and cleanup
- Removed unnecessary watchdog timer
- Fixed test suite for window management

## [1.1.2] - 2024-11-18
### Fixed
- Response windows now open in readonly mode
- Eliminated unwanted "Save?" prompts
- Improved window cleanup handling
### Added
- Comprehensive window management tests

## [1.1.0] - 2024-11-13
### Added
- Secure API key management 🔐
- Environment variable support for API key
- Enhanced security documentation
- VS Code secure storage integration

### Changed
- Updated authentication flow to use API keys
- Improved error handling for authentication issues
- Enhanced README with security best practices
- Optimized marketplace documentation formatting

### Security
- Implemented secure API key storage
- Added authentication validation
- Enhanced privacy measures
- Added comprehensive security documentation

## [1.0.0] - 2024-03-12
### Official Stable Release! 🎉
- Everything you need, nothing you don't
- Stable, tested, and ready for daily use
- Full support for Claude 3 models

### Features
- Direct Claude integration in VS Code
- Code documentation generation
- Smart context handling
- Clean Markdown responses
- Progress indicators
- Token usage tracking
- Model selection (Opus/Sonnet)

## [0.1.1] - 2024-03-12
### Added
- Model selection in settings (claude-3-opus-20240229 or claude-3-sonnet-20240229)
- Progress indicator in status bar during requests
- Token usage display in responses
- Proper error handling with user-friendly messages

### Changed
- Improved response formatting with Markdown
- Optimized package size and performance
- Updated to latest Claude API version
- Better error messages for common issues

### Fixed
- Package structure and duplicate assets
- Build process optimizations
- Extension activation events

## [0.1.0] - 2024-03-12
### Added
- Initial release
- Two main commands: "Ask Claude" and "Document Code"
- Basic integration with Claude API
- Support for text selection and code documentation
- Markdown-formatted responses
- Side-by-side response view
- Basic configuration options

[1.1.0]: https://github.com/conscious-robot/claude-vscode/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/conscious-robot/claude-vscode/compare/v0.1.1...v1.0.0
[0.1.1]: https://github.com/conscious-robot/claude-vscode/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/conscious-robot/claude-vscode/releases/tag/v0.1.0
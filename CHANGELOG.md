# Changelog
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [2.0.0] - 2024-11-24
### Fixed
Purchase link

## [2.0.0] - 2024-11-24
### 🚀 Going Pro!
After a few intense weeks of development and amazing community support, we're taking the next step with Claude AI Assistant Pro.

### Added
- Professional license management
- 7-day free trial for new users
- Improved window management stability
- Better response panel organization

### Changed
- Moving to a one-time $9.99 purchase model
- Enhanced response panel reliability
- Smoother cancellation handling
- Updated documentation

### Fixed
- Multiple window handling issues
- Preview mode conflicts
- Response panel persistence
- Source file state preservation

## [1.1.13] - 2024-11-22
### Fixed
 - Bug: First-time right-click "Ask Claude" was triggering save prompt on source file
 - Improved editor management to prevent VS Code's preview behavior from affecting source files
 - Enhanced source editor state preservation during Claude responses

## [1.1.12] - 2024-11-22
### Fixed
 - Bug: Panel was closing, brought extension under docker vm, updated tests

## [1.1.11] - 2024-11-22
### Fixed
 - Bug: Panel was closing, changed preview mode to false

## [1.1.10] - 2024-11-21
### Fixed
 - Bug: "Cancel" button was working in the UI but was letting the request complete in the background.

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

## [1.0.0] - 2024-11-12
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

## [0.1.1] - 2024-11-12
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

## [0.1.0] - 2024-11-12
### Added
- Initial release
- Two main commands: "Ask Claude" and "Document Code"
- Basic integration with Claude API
- Support for text selection and code documentation
- Markdown-formatted responses
- Side-by-side response view
- Basic configuration options
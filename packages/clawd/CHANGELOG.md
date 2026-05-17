# Changelog

All notable changes to Clawd Code CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- **CRITICAL**: Removed exposed API key from `user-settings.json` (deleted file)
- Added comprehensive `.gitignore` rules for sensitive files
- Added input validation for all Solana addresses
- Added request timeouts (10 seconds) for all API calls
- Improved error handling to prevent information leakage

### Added
- **Solana Blockchain Integration**
  - `solana_get_asset`: Retrieve NFT and digital asset data via Helius DAS API
  - `solana_get_price`: Get token prices via Birdeye API
  - `solana_get_wallet_balance`: Query wallet balances and token accounts
- **Enterprise Documentation**
  - `CONTRIBUTING.md`: Comprehensive contributor guidelines
  - `SECURITY.md`: Security best practices and vulnerability reporting
  - `ARCHITECTURE.md`: Detailed system architecture documentation
  - `SCALING.md`: Scaling strategies for 1,000+ DAU
- **Improved Error Handling**
  - Better error messages for API failures
  - Timeout handling for network requests
  - Input validation for Solana addresses

### Changed
- Rebranded the terminal UI from funGrok to Clawd Code CLI
- Updated startup copy, help text, and MCP client metadata for Clawd branding
- Moved preferred config and instruction paths to `.clawd/` with legacy `.grok/` fallback
- Updated package.json with proper metadata and keywords
- Enhanced Solana tool with input validation and error handling
- Improved error messages throughout the codebase

### Fixed
- Fixed switch statement linting error in `grok-agent.ts`
- Improved TypeScript type safety in Solana tool

## [0.0.34] - Previous Release

### Features
- Conversational AI interface powered by Grok
- Text editor capabilities
- Bash command execution
- MCP (Model Context Protocol) integration
- Morph Fast Apply support
- Interactive terminal UI

[Unreleased]: https://github.com/8bit/clawd-code-cli/compare/v0.0.34...HEAD

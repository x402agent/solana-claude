# Contributing to DarkDefi

Thank you for your interest in contributing to DarkDefi! We welcome contributions from the community.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Issues

- Use GitHub Issues to report bugs or request features
- Provide detailed information including steps to reproduce
- Include environment details (OS, Node version, etc.)

### Development Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `bun run test`
5. Run linting: `bun run lint`
6. Commit your changes: `git commit -m 'Add some feature'`
7. Push to the branch: `git push origin feature/your-feature`
8. Open a Pull Request

### Pull Request Guidelines

- Use a clear, descriptive title
- Provide a detailed description of changes
- Reference any related issues
- Ensure all tests pass
- Update documentation if needed
- Follow the existing code style

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- Bun >= 1.0.0
- Git

### Installation

```bash
git clone https://github.com/x402agent/DarkDefi.git
cd DarkDefi
bun install
```

### Available Scripts

```bash
# Development
bun run dev          # Start development server
bun run build        # Build for production
bun run build:lib    # Build library

# Quality
bun run typecheck    # TypeScript type checking
bun run lint         # ESLint
bun run test         # Run tests

# Maintenance
bun run clean        # Clean build artifacts
```

## Project Structure

```
DarkDefi/
├── src/                    # Main source code
├── automaton-main/         # Autonomous primitives
├── clawd-tui/             # Terminal interface
├── scripts/               # Utility scripts
├── docs/                  # Documentation
└── .github/               # GitHub configuration
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Use interfaces for object types
- Prefer `const` over `let`

### Code Style

- Follow ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Testing

- Write unit tests for new features
- Aim for good test coverage
- Use descriptive test names
- Test both success and error cases

### Commit Messages

- Use conventional commits format
- Start with type: `feat:`, `fix:`, `docs:`, etc.
- Keep first line under 50 characters
- Provide detailed body if needed

## Security

- Never commit secrets or API keys
- Use GitHub Secrets for CI/CD
- Report security issues privately (see SECURITY.md)

## Documentation

- Update README for new features
- Add JSDoc comments for APIs
- Keep documentation current

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

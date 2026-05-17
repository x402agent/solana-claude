# Contributing to Clawd Code CLI

Thank you for your interest in contributing to Clawd Code CLI. This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Solana Integration Guidelines](#solana-integration-guidelines)
- [Scaling Considerations](#scaling-considerations)

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/8bit/clawd-code-cli.git
   cd clawd-code-cli
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/8bit/clawd-code-cli.git
   ```

## Development Setup

### Prerequisites

- **Bun 1.0+** (recommended) or **Node.js 18+**
- **Git** for version control
- A **Grok API key** from [X.AI](https://x.ai) for testing

### Installation

1. **Install dependencies**:
   ```bash
   bun install
   # or
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys (NEVER commit this file)
   ```

3. **Build the project**:
   ```bash
   bun run build
   # or
   npm run build
   ```

4. **Link for local development**:
   ```bash
   bun link
   # or
   npm link
   ```

### Running in Development

```bash
# Development mode with hot reload
bun run dev

# Or with Node.js
bun run dev:node
```

## Project Structure

```
clawd-code-cli/
├── src/
│   ├── agent/          # Core agent logic and orchestration
│   ├── commands/        # CLI command handlers
│   ├── grok/            # Grok API client and tool definitions
│   ├── hooks/           # React hooks for UI state management
│   ├── mcp/             # Model Context Protocol integration
│   ├── tools/           # Tool implementations (bash, editor, solana, etc.)
│   ├── types/           # TypeScript type definitions
│   ├── ui/              # Terminal UI components (Ink/React)
│   └── utils/           # Utility functions and helpers
├── dist/                # Compiled JavaScript (generated)
├── .env.example         # Environment variable template
├── CONTRIBUTING.md      # This file
├── SECURITY.md          # Security guidelines
└── README.md            # Main documentation
```

## Coding Standards

### TypeScript

- Use **TypeScript** for all new code
- Prefer **type imports** when importing types: `import type { ... }`
- Avoid `any` types - use proper types or `unknown`
- Use **interfaces** for object shapes, **types** for unions/intersections
- Add **JSDoc comments** for public APIs

### Code Style

- Follow existing code patterns and conventions
- Use **2 spaces** for indentation
- Use **single quotes** for strings (unless escaping)
- Use **async/await** over promises
- Handle errors explicitly - don't swallow exceptions

### Example

```typescript
/**
 * Retrieves asset information from Solana blockchain
 * @param assetId - The unique identifier of the asset
 * @returns Promise resolving to asset data or error
 */
async getAsset(assetId: string): Promise<ToolResult> {
  try {
    // Implementation
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
```

## Making Changes

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `perf/description` - Performance improvements

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(solana): add wallet balance query tool
fix(agent): handle API rate limit errors gracefully
docs(readme): update Solana integration setup
```

## Testing

### Before Submitting

1. **Run type checking**:
   ```bash
   bun run typecheck
   ```

2. **Run linter**:
   ```bash
   bun run lint
   ```

3. **Build the project**:
   ```bash
   bun run build
   ```

4. **Test manually**:
   ```bash
   bun run dev
   # Test your changes interactively
   ```

### Writing Tests

- Add tests for new features
- Test error cases and edge cases
- Keep tests simple and focused
- Use descriptive test names

## Submitting Changes

1. **Update your fork**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** and commit:
   ```bash
   git add .
   git commit -m "feat(scope): your commit message"
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** on GitHub:
   - Fill out the PR template
   - Link related issues
   - Request review from maintainers

## Solana Integration Guidelines

When adding Solana-related features:

### API Rate Limiting

- **Helius DAS API**: Implement request queuing for high-volume usage
- **Birdeye API**: Respect rate limits (check API documentation)
- Add **exponential backoff** for retries
- Cache responses when appropriate

### Error Handling

```typescript
async getAsset(assetId: string): Promise<ToolResult> {
  try {
    // Validate input
    if (!assetId || assetId.length < 32) {
      return { success: false, error: 'Invalid asset ID format' };
    }

    // Make API call with timeout
    const response = await axios.post(url, data, { timeout: 10000 });
    
    // Handle API errors
    if (response.data.error) {
      return { success: false, error: response.data.error.message };
    }
    
    return { success: true, output: JSON.stringify(response.data.result) };
  } catch (error: unknown) {
    // Handle network errors, timeouts, etc.
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return { success: false, error: 'Request timeout' };
      }
    }
    return { success: false, error: 'Failed to fetch asset data' };
  }
}
```

### Security

- **Never** commit API keys or secrets
- Use environment variables for all credentials
- Validate and sanitize user inputs
- Use HTTPS for all API calls
- Implement request signing if required by API

## Scaling Considerations

For scaling to 1,000+ daily active users:

### Performance

- **Caching**: Cache frequently accessed data (asset metadata, prices)
- **Connection pooling**: Reuse HTTP connections
- **Batch requests**: Group multiple API calls when possible
- **Lazy loading**: Load tools and features on demand

### Monitoring

- Add **logging** for API calls and errors
- Track **usage metrics** (requests per user, response times)
- Monitor **rate limit** usage
- Alert on **error rates** exceeding thresholds

### Architecture

- **Stateless design**: Don't store session data in memory
- **Error recovery**: Graceful degradation when APIs are unavailable
- **Resource limits**: Set timeouts and memory limits
- **Queue system**: For high-volume operations

### Example: Adding Caching

```typescript
import NodeCache from 'node-cache';

class SolanaTool {
  private cache: NodeCache;
  
  constructor() {
    // Cache for 5 minutes
    this.cache = new NodeCache({ stdTTL: 300 });
  }
  
  async getAsset(assetId: string): Promise<ToolResult> {
    // Check cache first
    const cached = this.cache.get<ToolResult>(assetId);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const result = await this.fetchAsset(assetId);
    
    // Cache result
    if (result.success) {
      this.cache.set(assetId, result);
    }
    
    return result;
  }
}
```

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Reach out to maintainers for guidance

Thank you for contributing! 🚀

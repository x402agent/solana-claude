# Clawd Code CLI Architecture

This document describes the architecture of Clawd Code CLI, designed for scalability and enterprise-level usage.

## Overview

Clawd Code CLI is a conversational AI CLI tool that integrates with:
- **Grok AI** (X.AI) for natural language processing
- **Solana Blockchain** via Helius DAS API and Birdeye
- **MCP (Model Context Protocol)** for extensibility
- **Morph Fast Apply** for high-speed code editing

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface Layer                     │
│  (Ink/React Terminal UI - chat-interface.tsx)              │
└───────────────────────┬───────────────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────────────┐
│                      Agent Layer                              │
│  (GrokAgent - orchestrates tools and AI interactions)       │
└───────────────────────┬───────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
│  Grok API   │ │   Tools      │ │    MCP     │
│   Client    │ │   Layer      │ │  Servers   │
└─────────────┘ └──────────────┘ └────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
│  Text Editor │ │   Bash      │ │  Solana    │
│    Tool      │ │    Tool     │ │   Tool     │
└─────────────┘ └──────────────┘ └────────────┘
```

## Core Components

### 1. Agent Layer (`src/agent/grok-agent.ts`)

**Responsibilities:**
- Orchestrates tool execution
- Manages conversation history
- Handles streaming responses
- Token counting and usage tracking
- Error handling and recovery

**Key Features:**
- **Tool Round Limiting**: Prevents infinite loops (default: 400 rounds)
- **Streaming Support**: Real-time token count updates
- **MCP Integration**: Dynamic tool loading from MCP servers
- **Custom Instructions**: Project and global instruction support

### 2. Tool System (`src/tools/`)

Tools are modular, stateless components that perform specific operations:

#### Text Editor Tool
- File viewing, creation, and editing
- Supports partial file views (line ranges)
- Confirmation system for destructive operations

#### Bash Tool
- Execute shell commands
- Directory management
- File operations (find, grep, ls)

#### Solana Tool
- **getAsset()**: Helius DAS API integration
- **getPrice()**: Birdeye price API
- **getWalletBalance()**: Solana RPC queries

#### Morph Editor Tool (Optional)
- High-speed code editing (4,500+ tokens/sec)
- Requires MORPH_API_KEY

### 3. Grok Client (`src/grok/client.ts`)

**Responsibilities:**
- API communication with Grok/X.AI
- Request/response handling
- Streaming support
- Error handling

**Configuration:**
- Configurable base URL (default: `https://api.x.ai/v1`)
- Model selection
- Token limits (default: 1536)

### 4. MCP Integration (`src/mcp/`)

**Model Context Protocol** allows extending functionality:

- **stdio**: Run MCP servers as subprocesses
- **http**: Connect to HTTP-based servers
- **sse**: Server-Sent Events transport

**Example**: Linear integration for project management

## Data Flow

### User Input → Response

```
1. User types message
   ↓
2. ChatInterface captures input
   ↓
3. GrokAgent.processUserMessage()
   ↓
4. GrokClient.chat() → API call
   ↓
5. Response contains tool_calls
   ↓
6. executeTool() for each tool call
   ↓
7. Tool results added to conversation
   ↓
8. Next API call with tool results
   ↓
9. Final response displayed
```

### Solana Query Flow

```
User: "Get price of SOL"
   ↓
Clawd agent identifies solana_get_price tool
   ↓
SolanaTool.getPrice("So11111...")
   ↓
Birdeye API Request
   ↓
Response formatted and returned
   ↓
Displayed to user
```

## Scalability Considerations

### Current Limitations

1. **Single Process**: Runs in single Node.js process
2. **No Caching**: Each request hits APIs directly
3. **No Rate Limiting**: Relies on API providers' limits
4. **Memory**: Chat history stored in memory

### Scaling to 1,000+ DAU

#### 1. Caching Layer

**Implementation:**
```typescript
// Add caching for frequently accessed data
import NodeCache from 'node-cache';

class CachedSolanaTool extends SolanaTool {
  private cache: NodeCache;
  
  constructor() {
    super();
    // Cache for 5 minutes
    this.cache = new NodeCache({ 
      stdTTL: 300,
      checkperiod: 60 
    });
  }
  
  async getPrice(tokenAddress: string): Promise<ToolResult> {
    const cacheKey = `price:${tokenAddress}`;
    const cached = this.cache.get<ToolResult>(cacheKey);
    if (cached) return cached;
    
    const result = await super.getPrice(tokenAddress);
    if (result.success) {
      this.cache.set(cacheKey, result);
    }
    return result;
  }
}
```

**Benefits:**
- Reduces API calls by 60-80%
- Faster response times
- Lower API costs

#### 2. Rate Limiting

**Implementation:**
```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;
  
  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const recent = requests.filter(t => now - t < this.windowMs);
    
    if (recent.length >= this.maxRequests) {
      return false;
    }
    
    recent.push(now);
    this.requests.set(key, recent);
    return true;
  }
}
```

#### 3. Connection Pooling

**Implementation:**
```typescript
import axios from 'axios';

// Reuse HTTP connections
const httpClient = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  maxRedirects: 5,
  // Connection pooling
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});
```

#### 4. Request Queuing

For high-volume operations:

```typescript
import PQueue from 'p-queue';

class QueuedSolanaTool extends SolanaTool {
  private queue: PQueue;
  
  constructor() {
    super();
    // Process 10 requests concurrently, max 100 queued
    this.queue = new PQueue({ 
      concurrency: 10,
      interval: 1000,
      intervalCap: 50
    });
  }
  
  async getAsset(assetId: string): Promise<ToolResult> {
    return this.queue.add(() => super.getAsset(assetId));
  }
}
```

#### 5. Monitoring & Logging

**Implementation:**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Log API calls
logger.info('API call', {
  tool: 'solana_get_price',
  token: tokenAddress,
  timestamp: Date.now(),
  duration: Date.now() - startTime,
});
```

#### 6. Error Recovery

**Implementation:**
```typescript
async getAssetWithRetry(assetId: string, retries = 3): Promise<ToolResult> {
  for (let i = 0; i < retries; i++) {
    try {
      return await this.getAsset(assetId);
    } catch (error) {
      if (i === retries - 1) throw error;
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}
```

## Performance Optimizations

### 1. Lazy Loading

Load tools only when needed:

```typescript
class LazyToolLoader {
  private tools: Map<string, () => Promise<any>> = new Map();
  
  async getTool(name: string) {
    if (!this.tools.has(name)) {
      // Load tool dynamically
      const tool = await import(`./tools/${name}.js`);
      this.tools.set(name, () => Promise.resolve(tool));
    }
    return this.tools.get(name)!();
  }
}
```

### 2. Streaming Responses

Already implemented for:
- Token count updates
- Real-time content display
- Tool execution progress

### 3. Memory Management

- Limit chat history size
- Clear old entries
- Dispose token counters when switching models

## Security Architecture

### 1. API Key Management

- **Environment Variables**: Primary method
- **User Settings**: Fallback (encrypted at rest)
- **Never**: Hardcoded or committed

### 2. Input Validation

- Validate all user inputs
- Sanitize file paths
- Validate Solana addresses

### 3. Error Handling

- Don't expose internal errors
- Log errors securely
- Graceful degradation

## Extension Points

### Adding New Tools

1. Create tool class in `src/tools/`
2. Export from `src/tools/index.ts`
3. Add to `GrokAgent` constructor
4. Add tool definition to `src/grok/tools.ts`
5. Add handler in `executeTool()`

### Adding MCP Servers

Configure in `.clawd/settings.json`:

```json
{
  "mcpServers": {
    "my-server": {
      "name": "my-server",
      "transport": "stdio",
      "command": "node",
      "args": ["server.js"]
    }
  }
}
```

## Future Enhancements

1. **Distributed Caching**: Redis for multi-instance deployments
2. **Metrics Collection**: Prometheus/Grafana integration
3. **Plugin System**: Dynamic tool loading
4. **WebSocket Support**: Real-time updates
5. **Multi-User Support**: User isolation and quotas

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## Questions?

Open an issue or start a discussion for architecture questions.

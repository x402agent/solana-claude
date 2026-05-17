# Ollama Integration

Clawd Code CLI supports connecting to local Ollama instances for running open-source AI models without API costs.

## Available Models

Your Ollama instance has the following models available:

| Model | Size | Use Case |
|-------|------|----------|
| `ollama/glm-5.1:cloud` | ~10GB | General purpose, cloud-optimized |
| `ollama/8bit/DeepSolana:latest` | ~2GB | DeepSeek variant optimized for Solana |
| `ollama/minimax-m2.7:cloud` | ~6GB | MiniMax cloud model |
| `ollama/minimax-m2.1:cloud` | ~4GB | MiniMax lightweight variant |
| `ollama/kimi-k2.5:cloud` | ~6GB | Kimi cloud model |
| `ollama/kimi-k2.6:cloud` | cloud | Kimi K2.6 cloud model |

## Quick Start

### 1. Ensure Ollama is Running

```bash
# Check if Ollama is running
curl http://localhost:11434/v1/models
```

If Ollama isn't running, start it:
```bash
ollama serve
```

### 2. Use Ollama Models

**Option A: Set as default model**
```bash
clawd config set defaultModel "ollama/gemma4:latest"
```

**Option B: Use inline with command**
```bash
clawd --model "ollama/gemma4:latest" "explain this code"
```

### 3. Run the CLI

```bash
bun run dev
```

The CLI will automatically detect Ollama models and use your local Ollama endpoint.

## Configuration

### Environment Variables

```bash
# Optional: Override Ollama endpoint
export OLLAMA_BASE_URL=http://localhost:11434/v1

# Optional: Set default Ollama model
export OLLAMA_MODEL=ollama/gemma4:latest
```

### User Settings

Edit `~/.clawd/user-settings.json`:

```json
{
  "ollamaBaseURL": "http://localhost:11434/v1",
  "defaultModel": "ollama/gemma4:latest",
  "models": [
    "ollama/glm-5.1:cloud",
    "ollama/gemma4:latest",
    "ollama/8bit/DeepSolana:latest"
  ]
}
```

## Benefits of Ollama

- **No API costs** - Run models locally for free
- **Privacy** - Your code and conversations stay on your machine
- **Offline capable** - Works without internet
- **Fast for small tasks** - Quick responses for code reviews, refactoring

## Grok vs Ollama

| Feature | Grok (xAI) | Ollama |
|---------|------------|--------|
| Context Window | Up to 2M tokens | Varies by model |
| Web Search | ✅ Built-in | ❌ Not available |
| Reasoning | ✅ Advanced | Varies by model |
| Local Execution | ❌ | ✅ |
| Cost | API-based | Free |

## Troubleshooting

### Connection Errors

```bash
# Verify Ollama is accessible
curl http://localhost:11434/api/tags

# Check Ollama logs
ollama logs
```

### Model Not Found

```bash
# Pull the model if missing
ollama pull gemma4:latest
```

### Performance Issues

For best performance:
- Use models that fit in your available RAM
- Close other memory-intensive applications
- Consider using smaller models for quick tasks

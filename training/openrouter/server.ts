#!/usr/bin/env node
/**
 * OpenRouter-compatible inference server for Solana CLAWD GGUF models.
 *
 * Exposes an OpenAI-compatible API that can be registered as an OpenRouter provider
 * or used directly with any OpenAI-compatible client.
 *
 * Endpoints:
 *   POST /api/v1/chat/completions   — Chat completion (streaming + non-streaming)
 *   GET  /api/v1/models             — List available models
 *   GET  /health                    — Health check
 *
 * Environment:
 *   MODEL_PATH     — Path to GGUF file (required)
 *   PORT           — Server port (default 8080)
 *   API_KEY        — API key for authentication (optional, disabled if unset)
 *   GPU_LAYERS     — Number of GPU layers to offload (default 0)
 *   CONTEXT_SIZE   — Context window size (default 4096)
 *   MAX_CONCURRENT — Max concurrent requests (default 4)
 *
 * Usage:
 *   MODEL_PATH=../models/gguf/solana-clawd-Q4_K_M.gguf node dist/server.js
 *   MODEL_PATH=./model.gguf PORT=3000 API_KEY=sk-test node dist/server.js
 */

import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import {
  getLlama,
  LlamaModel,
  LlamaContext,
  LlamaChatSession,
  type Token,
} from 'node-llama-cpp'
import { z } from 'zod'

const MODEL_PATH = process.env.MODEL_PATH
const PORT = parseInt(process.env.PORT ?? '8080', 10)
const API_KEY = process.env.API_KEY ?? ''
const GPU_LAYERS = parseInt(process.env.GPU_LAYERS ?? '0', 10)
const CONTEXT_SIZE = parseInt(process.env.CONTEXT_SIZE ?? '4096', 10)
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT ?? '4', 10)

const MODEL_ID = 'solana-clawd'

// ─── Request validation ──────────────────────────────────────────────────────

const ChatCompletionSchema = z.object({
  model: z.string().default(MODEL_ID),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })).min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  top_p: z.number().min(0).max(1).default(0.9),
  max_tokens: z.number().min(1).max(8192).default(2048),
  stream: z.boolean().default(false),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
})

// ─── Server setup ────────────────────────────────────────────────────────────

async function startServer() {
  if (!MODEL_PATH) {
    console.error('\n  \x1b[31mError: MODEL_PATH environment variable is required.\x1b[0m')
    console.error('  Example: MODEL_PATH=../models/gguf/solana-clawd-Q4_K_M.gguf node dist/server.js\n')
    process.exit(1)
  }

  console.log('\n  \x1b[36m\x1b[1m$CLAWD OpenRouter Provider\x1b[0m\n')
  console.log(`  Model:   ${MODEL_PATH}`)
  console.log(`  Port:    ${PORT}`)
  console.log(`  Auth:    ${API_KEY ? 'enabled' : 'disabled (no API_KEY set)'}`)
  console.log(`  GPU:     ${GPU_LAYERS} layers`)
  console.log(`  Context: ${CONTEXT_SIZE}`)
  console.log()

  // Load model
  console.log('  Loading GGUF model...')
  const llama = await getLlama()
  const model = await llama.loadModel({ modelPath: MODEL_PATH })
  const contextPool: LlamaContext[] = []
  let activeRequests = 0

  async function getContext(): Promise<LlamaContext> {
    if (contextPool.length > 0) return contextPool.pop()!
    return await model.createContext({ contextSize: CONTEXT_SIZE })
  }

  function releaseContext(ctx: LlamaContext) {
    if (contextPool.length < MAX_CONCURRENT) {
      contextPool.push(ctx)
    }
  }

  console.log('  \x1b[32m✔\x1b[0m Model loaded\n')

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))

  // ─── Auth middleware ─────────────────────────────────────────────────────

  function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!API_KEY) return next()
    const auth = req.headers.authorization
    if (!auth || auth !== `Bearer ${API_KEY}`) {
      return res.status(401).json({
        error: { message: 'Invalid API key', type: 'invalid_api_key', code: 'invalid_api_key' },
      })
    }
    next()
  }

  // ─── Health check ────────────────────────────────────────────────────────

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      model: MODEL_ID,
      model_path: MODEL_PATH,
      active_requests: activeRequests,
      uptime: process.uptime(),
    })
  })

  // ─── List models ─────────────────────────────────────────────────────────

  app.get('/api/v1/models', authMiddleware, (_req, res) => {
    res.json({
      object: 'list',
      data: [{
        id: MODEL_ID,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'solana-clawd',
        permission: [],
        root: MODEL_ID,
        parent: null,
      }],
    })
  })

  // ─── Chat completions ───────────────────────────────────────────────────

  app.post('/api/v1/chat/completions', authMiddleware, async (req, res) => {
    const parsed = ChatCompletionSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: { message: `Invalid request: ${parsed.error.message}`, type: 'invalid_request_error' },
      })
    }

    if (activeRequests >= MAX_CONCURRENT) {
      return res.status(429).json({
        error: { message: 'Too many concurrent requests', type: 'rate_limit_error' },
      })
    }

    const { messages, temperature, top_p, max_tokens, stream, stop } = parsed.data
    const requestId = `chatcmpl-${uuidv4().slice(0, 12)}`
    activeRequests++

    try {
      const context = await getContext()
      const session = new LlamaChatSession({ contextSequence: context.getSequence() })

      // Build prompt from messages
      const systemMsgs = messages.filter(m => m.role === 'system')
      const systemPrompt = systemMsgs.map(m => m.content).join('\n')
      const userMsgs = messages.filter(m => m.role !== 'system')
      const lastUserMsg = userMsgs[userMsgs.length - 1]?.content ?? ''

      if (stream) {
        // Streaming response (SSE)
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        let totalTokens = 0

        const response = await session.prompt(lastUserMsg, {
          maxTokens: max_tokens,
          temperature,
          topP: top_p,
          stopOnAbortSignal: false,
          onTextChunk(chunk: string) {
            totalTokens++
            const data = {
              id: requestId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: MODEL_ID,
              choices: [{
                index: 0,
                delta: { content: chunk },
                finish_reason: null,
              }],
            }
            res.write(`data: ${JSON.stringify(data)}\n\n`)
          },
        })

        // Final chunk
        const finalData = {
          id: requestId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: MODEL_ID,
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        }
        res.write(`data: ${JSON.stringify(finalData)}\n\n`)
        res.write('data: [DONE]\n\n')
        res.end()

        releaseContext(context)
      } else {
        // Non-streaming response
        const response = await session.prompt(lastUserMsg, {
          maxTokens: max_tokens,
          temperature,
          topP: top_p,
        })

        const result = {
          id: requestId,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: MODEL_ID,
          choices: [{
            index: 0,
            message: { role: 'assistant', content: response },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        }

        res.json(result)
        releaseContext(context)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error'
      res.status(500).json({
        error: { message, type: 'server_error' },
      })
    } finally {
      activeRequests--
    }
  })

  // ─── OpenRouter provider info ───────────────────────────────────────────

  app.get('/api/v1/provider', (_req, res) => {
    res.json({
      provider: 'solana-clawd',
      description: 'Solana AI trading agent fine-tuned on on-chain data, OODA trading methodology, and Pump.fun bonding curve mechanics',
      models: [MODEL_ID],
      capabilities: ['chat', 'streaming'],
      pricing: { prompt: 0, completion: 0 },
      context_length: CONTEXT_SIZE,
      homepage: 'https://github.com/x402agent/solana-clawd',
    })
  })

  // ─── Start ──────────────────────────────────────────────────────────────

  app.listen(PORT, () => {
    console.log(`  \x1b[32m▶\x1b[0m Server running at http://localhost:${PORT}`)
    console.log()
    console.log('  \x1b[1mEndpoints:\x1b[0m')
    console.log(`    POST http://localhost:${PORT}/api/v1/chat/completions`)
    console.log(`    GET  http://localhost:${PORT}/api/v1/models`)
    console.log(`    GET  http://localhost:${PORT}/api/v1/provider`)
    console.log(`    GET  http://localhost:${PORT}/health`)
    console.log()
    console.log('  \x1b[1mOpenRouter registration:\x1b[0m')
    console.log(`    Base URL: http://your-server:${PORT}/api/v1`)
    console.log(`    Model ID: ${MODEL_ID}`)
    console.log()
    console.log('  \x1b[1mTest with curl:\x1b[0m')
    console.log(`    curl -X POST http://localhost:${PORT}/api/v1/chat/completions \\`)
    console.log(`      -H "Content-Type: application/json" \\`)
    console.log(`      -d '{"messages":[{"role":"user","content":"How does Pump.fun work?"}]}'`)
    console.log()
  })
}

startServer().catch(err => {
  console.error(`\n  \x1b[31mFatal: ${err.message}\x1b[0m\n`)
  process.exit(1)
})

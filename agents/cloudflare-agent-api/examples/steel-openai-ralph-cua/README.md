# Steel + OpenAI CUA Ralph Orchestrator (Node/TypeScript)

This example wires an **OpenAI Responses** Ralph orchestrator to **Steel's Computer API** execution loop.

It demonstrates:

- Steel session creation/release
- screenshot → model decision → browser action loop
- OpenAI/GPT normalized coordinates (`0..1000`) mapped to Steel pixel coordinates
- actions: move/click/double-click/scroll/type/key/wait/screenshot

## Prerequisites

- Node.js 20+
- Steel API key
- OpenAI API key with access to the configured GPT model

## Setup

```bash
cd examples/steel-openai-ralph-cua
npm install
cp .env.example .env
```

Edit `.env`:

```env
STEEL_API_KEY=your_steel_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
TASK=Go to steel.dev and summarize the latest news
OPENAI_MODEL=gpt-5.5
```

## Run

```bash
npm run dev
```

You should see:

- Steel session viewer URL
- step-by-step action logs
- final task output
- session release confirmation

## Notes

- This implementation uses the OpenAI `/v1/responses` endpoint and expects a JSON action response each turn.
- If your model response format differs, adjust `parseActionFromText()` in `main.ts`.
- Coordinate conversion happens in `normalizedToPixel()`.

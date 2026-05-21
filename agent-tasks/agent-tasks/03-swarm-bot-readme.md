# Task 03: Write Comprehensive swarm-bot/ README.md

## Context

You are working in the `pump-fun-sdk` repository. The `swarm-bot/` directory contains a multi-bot swarm orchestrator with trading strategies, market analysis, and a dashboard UI. It currently has **no README.md**.

## Objective

Write a comprehensive `swarm-bot/README.md` that fully documents the swarm-bot application.

## Instructions

1. **Read** all source files in `swarm-bot/src/` to understand the architecture:
   - `index.ts` — entry point
   - `config.ts` — configuration
   - `logger.ts` — logging
   - `api/` — API layer
   - `dashboard/` — embedded HTML dashboard
   - `engine/` — trading/strategy engine
   - `market/` — market data
   - `store/` — state persistence
   - `strategies/` — trading strategies
2. **Read** `swarm-bot/package.json` for scripts, dependencies, and metadata
3. **Read** `swarm-bot/.env.example` for all environment variables
4. **Read** `swarm-bot/Dockerfile` for deployment details
5. **Read** `swarm-bot/src/dashboard/index.html` for dashboard features
6. **Reference** the sibling `swarm/README.md` for context on the swarm orchestration layer

## README Structure

Write the README with these sections:

1. **Title + badges** — Name, version, tech stack badges
2. **Overview** — What swarm-bot does, why it exists, how it fits in the ecosystem
3. **Architecture** — Directory structure, component diagram (Mermaid), data flow
4. **Features** — Bullet list of key features (strategies, market data, dashboard, API)
5. **Quick Start** — Prerequisites, install, configure .env, run
6. **Configuration** — Every env var from .env.example with description and defaults
7. **Strategies** — Document each trading strategy available
8. **Dashboard** — Screenshots placeholder, describe the embedded web UI
9. **API Reference** — Document all API endpoints
10. **Docker Deployment** — Docker build/run commands, Railway setup
11. **Development** — Dev mode, adding strategies, testing
12. **Related Components** — Links to swarm/, telegram-bot/, dashboard/

## Constraints

- Read the actual source code — don't hallucinate features that don't exist
- Use proper markdown formatting with code blocks for commands
- Keep it practical and developer-focused
- Match the documentation style of other READMEs in the project (e.g., `telegram-bot/README.md`, `websocket-server/README.md`)

## Verification

The README should be 200-400 lines and cover everything a new developer needs to understand, configure, and deploy swarm-bot.

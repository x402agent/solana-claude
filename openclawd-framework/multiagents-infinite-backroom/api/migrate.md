# CLAWD Backroom Migration Guide

This file is for another agent that needs to bring the current `api/` stack to life on a new site without breaking the running Fly-backed topology.

The goal is not just "deploy the same code somewhere else". The goal is:

- preserve the current FastAPI backroom behavior
- preserve connectivity to the existing Fly-hosted 3D / machine environment
- introduce a real control plane for users
- use Convex as the app backend for identity, API key issuance, and metadata storage
- keep secret material server-side only

## Current Reality

The current API is a FastAPI app in [main.py](/Users/8bit/bots/Cladwbot-solana/solana-clawd/openclawd-framework/multiagents-infinite-backroom/api/main.py:1).

It currently provides:

- static frontend shell from `api/static/`
- multi-agent chat / loop endpoints
- perps and prediction-market read/write simulation endpoints
- orchestration planning endpoints
- metadata and install-script style endpoints

Important current assumptions:

- public origin is hardcoded around `https://backrooms.x402.wtf`
- 3D frontend origin is currently allowed as `https://backroom-3d.fly.dev`
- the API assumes DeepSeek or OpenRouter env vars at process boot
- FastAPI now has an opt-in API key auth layer in [auth.py](/Users/8bit/bots/Cladwbot-solana/solana-clawd/openclawd-framework/multiagents-infinite-backroom/api/auth.py:1)
- API key issuance is proxied through Convex at `POST /v1/keys`
- no persistent app database exists inside `api/`

## Implemented In This Repo

The FastAPI side now includes:

- [auth.py](/Users/8bit/bots/Cladwbot-solana/solana-clawd/openclawd-framework/multiagents-infinite-backroom/api/auth.py:1) for bearer-token extraction, SHA-256 token hashing, Convex verification, admin bootstrap auth, and usage logging
- `GET /v1/auth/status` to inspect auth readiness
- `POST /v1/keys` to forward admin key creation to Convex
- `POST /v1/machines/handshake` for Fly or other machine clients
- scoped protection on chat, loop, perps, prediction, arena, and orchestration routes

Auth is intentionally opt-in for migration safety:

```bash
CLAWD_API_AUTH_REQUIRED=true
CONVEX_SITE_URL=https://your-convex-site.convex.site
CLAWD_ADMIN_API_KEY=use-a-long-random-bootstrap-secret
```

With `CLAWD_API_AUTH_REQUIRED=false`, the dependency still records intended scopes but does not reject unauthenticated calls. This lets the current demo behavior keep running while Convex and the new site are being built.

## Existing Touchpoints To Respect

### 1. Fly machine / 3D frontend

The API already treats Fly as a valid frontend origin:

- [main.py](/Users/8bit/bots/Cladwbot-solana/solana-clawd/openclawd-framework/multiagents-infinite-backroom/api/main.py:29)

The static HTML also links to the 3D site:

- [static/index.html](/Users/8bit/bots/Cladwbot-solana/solana-clawd/openclawd-framework/multiagents-infinite-backroom/api/static/index.html:81)

Migration implication:

- do not sever the Fly machine relationship
- the new site should treat the Fly app as either:
  - the immersive 3D client
  - a visualization companion
  - or a machine-side runtime shell

Recommended model:

- keep Fly for real-time / immersive / machine-facing UX
- move the canonical public API and account system to the new site
- let Fly consume the new API with a scoped machine key

### 2. Convex assumptions already in the ecosystem

The current Python API already fetches market context through a Convex endpoint fallback:

- [market_context.py](/Users/8bit/bots/Cladwbot-solana/solana-clawd/openclawd-framework/multiagents-infinite-backroom/api/market_context.py:16)

The TypeScript automaton already has a Convex HTTP client shape:

- [automaton-main/src/clawd/convex-client.ts](/Users/8bit/bots/Cladwbot-solana/solana-clawd/openclawd-framework/multiagents-infinite-backroom/automaton-main/src/clawd/convex-client.ts:1)

Migration implication:

- use Convex as the durable app backend
- do not make the FastAPI service the primary store of record for user accounts or API keys

## Target Architecture

Build toward this split:

1. `New Site`
Frontend app for onboarding, login, dashboard, key creation, usage views, and docs.

2. `Convex Backend`
System of record for users, projects, API keys, machine registrations, usage records, and allowed origins.

3. `FastAPI Service`
Execution and integration plane for:

- agent chat
- orchestration
- Solana market adapters
- Vulcan / Phoenix / DFlow wrappers

4. `Fly Machine`
Trusted machine client for immersive UI and machine-side operations. It should authenticate to the new API using a machine-scoped key.

## Recommended Connection Model

### Users

Users should not connect directly to raw agent providers.

Instead:

- users create an account on the new site
- users create a project or workspace
- users generate an API key from the site
- the frontend uses that key only from server-side routes or trusted backend actions
- browser clients should prefer session auth over raw long-lived API keys

### Fly machine

Fly should authenticate as a machine, not as a human user.

Recommended machine auth model:

- create a `machines` table in Convex
- create a machine-specific API key or signed token
- bind the Fly machine identity to:
  - `machine_id`
  - `environment`
  - `allowed_origins`
  - `allowed_routes`

Then the Fly app can call the FastAPI service with:

- `Authorization: Bearer <machine_key>`
- optional `X-CLAWD-Machine-ID: <machine_id>`

### FastAPI service

The FastAPI service should validate incoming keys against Convex before running sensitive routes.

That means adding a lightweight auth layer in Python:

- hash the presented key
- query Convex HTTP action for key lookup
- reject revoked, expired, or scope-mismatched keys

## Convex Data Model

Another agent should implement at least these tables.

### `users`

- `clerkId` or external auth subject
- `email`
- `walletAddress` optional
- `createdAt`
- `plan`
- `status`

### `projects`

- `userId`
- `name`
- `slug`
- `createdAt`
- `status`

### `apiKeys`

- `projectId`
- `name`
- `prefix`
- `keyHash`
- `scopes`
- `createdAt`
- `lastUsedAt`
- `revokedAt`
- `expiresAt` optional
- `createdBy`

Never store raw keys after initial creation.

### `machines`

- `projectId` optional
- `machineId`
- `label`
- `provider` (`fly`)
- `region`
- `createdAt`
- `lastSeenAt`
- `status`
- `allowedOrigins`
- `allowedScopes`

### `usageEvents`

- `projectId`
- `apiKeyId` optional
- `machineId` optional
- `route`
- `method`
- `statusCode`
- `latencyMs`
- `provider`
- `costEstimate`
- `createdAt`

### `secretsMetadata`

Only metadata, not raw third-party secrets if avoidable.

- `projectId`
- `kind`
- `label`
- `createdAt`
- `lastValidatedAt`
- `status`

## API Key Strategy

Use a standard split:

1. generate a random key like:
`clawd_live_xxxxxxxxx`

2. show it once to the user

3. store only:

- key prefix
- salted hash
- scope metadata

4. verify on each request by hashing the presented token

Scopes should at least include:

- `chat:read`
- `chat:write`
- `agents:loop`
- `perps:read`
- `perps:paper`
- `perps:live`
- `prediction:read`
- `prediction:trade`
- `machine:connect`
- `admin:keys`

## FastAPI Changes Already Started

### 1. Auth middleware / dependency

Implemented module:

- `api/auth.py`

It already:

- read bearer token
- support public routes separately
- call Convex to validate key
- attach auth context to request
- log usage to Convex when configured

Public routes can remain public:

- `/`
- `/healthz`
- `/v1/auth/status`
- metadata routes
- installer routes

Protected routes should require scopes:

- `/loop`: `agents:loop`
- `/enter`: `chat:write`
- `/conversation`: `chat:read`
- `/agent1`, `/agent2`, `/agent3`, `/reset`: `chat:write`
- `/perps/markets`, `/perps/ticker/*`, `/arena`: `perps:read`
- `/perps/paper/*`: `perps:paper`
- `/perps/order`: `perps:live`
- `/prediction/markets`: `prediction:read`
- `/prediction/order`: `prediction:trade`
- `/clawd/orchestrate`: `agents:loop`

### 2. Replace hardcoded external URLs

`main.py` currently hardcodes `backrooms.x402.wtf`.

Another agent should centralize:

- `PUBLIC_APP_URL`
- `PUBLIC_API_URL`
- `PUBLIC_3D_URL`
- `PUBLIC_FLY_URL`

Then update:

- metadata responses
- install scripts
- static frontend links
- agent profile endpoints

### 3. Separate machine trust from browser trust

CORS is not auth.

Current CORS is permissive for selected origins. Keep CORS, but add actual identity checks.

Recommended:

- browser session auth for dashboard/site
- bearer key auth for server-to-server and machine traffic

### 4. Add usage logging

Every authenticated request should emit a usage record to Convex.

At minimum log:

- key id
- machine id if present
- path
- status
- latency
- backend/provider used

## New Site Responsibilities

The new site should provide:

- sign up / sign in
- create project
- create / revoke API keys
- register Fly machine
- show API docs and curl examples
- show current API base URL
- show key last used / scopes
- optionally show live agent / perps health

Recommended frontend routes:

- `/login`
- `/dashboard`
- `/projects/[id]`
- `/projects/[id]/keys`
- `/projects/[id]/machines`
- `/docs`

## Fly Machine Guidance

Tell the next agent this clearly:

The Fly machine is not a deployment detail. Treat it as a product surface.

It should be able to:

- call the canonical API
- identify itself with a machine credential
- receive project-scoped configuration
- optionally stream telemetry back into Convex

Suggested boot flow:

1. Fly machine starts
2. reads `CLAWD_MACHINE_KEY`
3. calls something like `POST /machine/handshake`
4. FastAPI verifies key against Convex
5. returns machine config:
   - allowed API base
   - feature flags
   - associated project
   - websocket or polling URLs if needed

## Suggested New Endpoints

These do not all need to live in FastAPI. Some can be Convex HTTP actions or site server routes.

### Auth / keys

- `POST /v1/keys`
- `GET /v1/keys`
- `POST /v1/keys/{id}/revoke`

### Machine connectivity

- `POST /v1/machines/handshake`
- `POST /v1/machines/heartbeat`
- `GET /v1/machines/me`

### Usage

- `GET /v1/usage`

### Public service metadata

- `GET /v1/meta`

## Environment Variables To Standardize

For FastAPI:

- `PUBLIC_APP_URL`
- `PUBLIC_API_URL`
- `PUBLIC_3D_URL`
- `CORS_ORIGINS`
- `DEEPSEEK_API_KEY`
- `OPENROUTER_API_KEY`
- `SOLANA_RPC_URL`
- `DFLOW_API_KEY`
- `VULCAN_BIN`
- `CONVEX_SITE_URL`
- `CONVEX_DEPLOY_KEY` if server-side deploy hooks are used

For site frontend/backend:

- `NEXT_PUBLIC_APP_URL` or equivalent
- `NEXT_PUBLIC_API_URL`
- `CONVEX_URL`
- auth provider secrets

For Fly:

- `CLAWD_MACHINE_KEY`
- `CLAWD_MACHINE_ID`
- `PUBLIC_API_URL`

## Migration Order

Another agent should do the migration in this order:

1. stand up Convex schema and HTTP actions
2. add key validation path in FastAPI
3. centralize public URLs in env vars
4. build the new site dashboard for users
5. register the Fly machine as a first-class machine client
6. move browser clients to the new site
7. keep the Fly app connected through machine auth
8. cut traffic from old hardcoded domains only after health checks pass

## Minimum Convex HTTP Actions Needed

If the next agent wants a concrete minimum:

- `POST /clawd/keys/create`
- `POST /clawd/keys/verify`
- `POST /clawd/keys/revoke`
- `POST /clawd/machines/handshake`
- `POST /clawd/usage/log`
- `GET /clawd/projects/:id`

The FastAPI implementation expects:

### `POST /clawd/keys/verify`

Request:

```json
{
  "tokenHash": "sha256 hex",
  "tokenPrefix": "clawd_live_xxxx",
  "requiredScopes": ["chat:write"],
  "route": "/enter",
  "method": "GET",
  "machineId": "optional"
}
```

Response:

```json
{
  "valid": true,
  "subject": "user-or-project-id",
  "projectId": "project id",
  "apiKeyId": "key id",
  "machineId": "machine id if applicable",
  "scopes": ["chat:write", "agents:loop"]
}
```

### `POST /clawd/keys/create`

Called by `POST /v1/keys` after `admin:keys` auth. Convex should generate the raw key, store only its hash, and return the raw key exactly once.

### `POST /clawd/machines/handshake`

Called by `POST /v1/machines/handshake` after `machine:connect` auth. It should register or refresh the Fly machine record and return machine config for the client.

### `POST /clawd/usage/log`

Best-effort usage logging. It should never be required for request success.

## Hard Rules

- never store plaintext API keys after creation
- never trust CORS as authentication
- never expose DeepSeek/OpenRouter provider keys to browsers
- never let the browser call privileged live-trading routes without server-side authorization
- keep the Fly machine on scoped credentials separate from user credentials
- preserve readonly mode by default for market/trading surfaces until auth and audit are real

## Practical First Deliverable

If the next agent needs a first milestone, it should be:

1. create Convex-backed API key issuance
2. protect FastAPI with bearer-key validation
3. create a `/dashboard/keys` UI on the new site
4. add a machine handshake route for Fly

That is the minimum cut that turns this from a demo stack into a real service plane.

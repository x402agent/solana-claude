# Task 32: Swarm Dashboard Live Data

## Objective

Connect the new Swarm and Personas UI views to live data from the gateway WebSocket, enabling real-time bot monitoring and persona browsing.

## Acceptance Criteria

- [ ] Swarm tab (`/swarm`) displays live bot data
  - Bot health cards update every 10s from gateway
  - Event stream scrolls in real-time via WebSocket subscription
  - Metrics strip (active bots, agents, events/min) refreshes live
  - Agent table shows ScgVault memory stats (KNOWN/LEARNED/INFERRED counts)
- [ ] Personas tab (`/personas`) loads persona data from gateway
  - Fetch full persona list from `/api/personas` endpoint
  - Category filter pills work correctly
  - Search filters by name, tags, and description
  - Detail panel shows full persona info including system role preview
  - "Spawn" button sends `/spawn` command through chat
- [ ] Gateway API additions
  - `GET /api/swarm/status` — returns all bot health + metrics
  - `GET /api/swarm/events` — returns recent event buffer
  - `GET /api/personas` — returns all loaded personas
  - `GET /api/personas/:id` — returns single persona detail
  - WebSocket event: `swarm.event` — real-time event push
- [ ] Error states display correctly (disconnected, no bots, loading)
- [ ] Mobile responsive layout for both views

## Technical Notes

- UI uses Lit web components — follow existing `app-render.ts` pattern
- Gateway client is in `gateway.ts` — add new method types to request handler
- Swarm view state lives in `app.ts` as `@state()` properties
- Use `app-settings.ts` `setTab` pattern for navigation
- CSS is in `swarm-personas.css` (already created)

## Dependencies

- Navigation tabs (completed — `swarm` and `personas` added)
- View components (completed — `swarm.ts` and `personas.ts`)
- CSS (completed — `swarm-personas.css`)
- Event bus (completed — `event-bus.ts`)
- Bot manager (completed — `bot-manager.ts`)

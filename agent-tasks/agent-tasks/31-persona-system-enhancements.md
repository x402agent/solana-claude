# Task 31: Persona System Enhancements

## Objective

Enhance the 43-persona agent system with runtime persona customization, composite personas, and persona marketplace integration.

## Acceptance Criteria

- [ ] Runtime persona override: agents can modify their persona mid-session
  - New command: `/respec <agent-id> <persona-id>` — changes persona while preserving memory
  - Old persona identity moves to LEARNED memory as "past life"
- [ ] Composite personas: blend two personas for hybrid agents
  - `/spawn analyst --persona whale-watcher+rug-pull-detective`
  - System prompt merges expertise from both personas
- [ ] Custom persona creation via Telegram
  - `/persona create` — interactive wizard for name, avatar, description, tags
  - Saves to `src/claw/personas/custom/` directory
  - Custom personas persist across restarts
- [ ] Persona performance tracking
  - Track trade success rate per persona
  - Leaderboard: which persona archetype performs best
  - Accessible via `/personas stats`
- [ ] Persona recommendation engine
  - Based on current market conditions, suggest optimal persona
  - "Market is volatile → suggesting MEV Researcher persona"

## Technical Notes

- Persona loader already supports dynamic reloading via `clearPersonaCache()`
- ScgVault LEARNED tier should store persona transitions
- Consider storing persona performance in `db.ts` SQLite

## Dependencies

- Persona system (completed)
- ScgVault integration (completed)

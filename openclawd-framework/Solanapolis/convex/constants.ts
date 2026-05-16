// Production-tuned timeouts and constants for AI Town engine.
// All values are in milliseconds unless otherwise noted.

// ── Engine / Action Timeouts ─────────────────────────────────
export const ACTION_TIMEOUT = 60_000; // 60s for production (120s commented out for local dev)
// export const ACTION_TIMEOUT = 120_000; // more time for local dev

export const ENGINE_ACTION_DURATION = 30_000;

// ── World Lifecycle ──────────────────────────────────────────
export const IDLE_WORLD_TIMEOUT = 5 * 60 * 1000; // 5 min idle before cleanup
export const WORLD_HEARTBEAT_INTERVAL = 60 * 1000; // 1 min heartbeat

// ── Step / Tick ──────────────────────────────────────────────
export const MAX_STEP = 10 * 60 * 1000; // max step duration
export const TICK = 16; // ms per tick (≈60 fps)
export const STEP_INTERVAL = 1000; // game step interval

// ── Pathfinding ──────────────────────────────────────────────
export const PATHFINDING_TIMEOUT = 60 * 1000;
export const PATHFINDING_BACKOFF = 1000;
export const MAX_PATHFINDS_PER_STEP = 16;

// ── Movement / Collision ─────────────────────────────────────
export const CONVERSATION_DISTANCE = 1.3;
export const MIDPOINT_THRESHOLD = 4;
export const COLLISION_THRESHOLD = 0.75;

// ── Conversation ─────────────────────────────────────────────
export const TYPING_TIMEOUT = 15 * 1000;
export const CONVERSATION_COOLDOWN = 15000; // 15s cooldown after conversation
export const ACTIVITY_COOLDOWN = 10_000; // 10s cooldown after activity
export const PLAYER_CONVERSATION_COOLDOWN = 60000; // 60s between player convos
export const AWKWARD_CONVERSATION_TIMEOUT = 30_000; // 30s wait for player response
// export const AWKWARD_CONVERSATION_TIMEOUT = 60_000; // more time locally
export const MAX_CONVERSATION_DURATION = 5 * 60_000; // 5 min max conversation
// export const MAX_CONVERSATION_DURATION = 10 * 60_000; // more time locally
export const MAX_CONVERSATION_MESSAGES = 8;
export const INVITE_ACCEPT_PROBABILITY = 0.8;
export const INVITE_TIMEOUT = 60000;

// ── Input / Message ──────────────────────────────────────────
export const INPUT_DELAY = 1000;
export const MESSAGE_COOLDOWN = 2000;

// ── Agent / Memory ───────────────────────────────────────────
export const AGENT_WAKEUP_THRESHOLD = 1000; // 1s between agent turns
export const NUM_MEMORIES_TO_SEARCH = 3;
export const VACUUM_MAX_AGE = 2 * 7 * 24 * 60 * 60 * 1000; // 2 weeks
export const DELETE_BATCH_SIZE = 64;

// ── Player ───────────────────────────────────────────────────
export const MAX_HUMAN_PLAYERS = 8;
export const HUMAN_IDLE_TOO_LONG = 5 * 60 * 1000; // 5 min idle

// ── NPC Activities ───────────────────────────────────────────
export const ACTIVITIES = [
  { description: 'watching pump.fun launches', emoji: '🚀', duration: 30_000 },
  { description: 'checking whale wallets', emoji: '🐋', duration: 30_000 },
  { description: 'debating validator gossip', emoji: '🛰️', duration: 30_000 },
  { description: 'tracking memecoin rotations', emoji: '📈', duration: 30_000 },
  { description: 'lurking in a Solana Space', emoji: '🎙️', duration: 30_000 },
  { description: 'studying token holder maps', emoji: '🗺️', duration: 30_000 },
  { description: 'searching for the next runner', emoji: '🔍', duration: 30_000 },
];

// ── Misc ─────────────────────────────────────────────────────
export const DEFAULT_NAME = 'Me';

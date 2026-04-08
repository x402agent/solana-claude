export const MODELS = [
  { id: "claude-opus-4-6", label: "Clawd Opus 4.6", description: "Most capable" },
  { id: "claude-sonnet-4-6", label: "Clawd Sonnet 4.6", description: "Balanced" },
  { id: "claude-haiku-4-5-20251001", label: "Clawd Haiku 4.5", description: "Fastest" },
] as const;

export const DEFAULT_MODEL = "claude-sonnet-4-6";

export const API_ROUTES = {
  chat: "/api/chat",
  stream: "/api/stream",
} as const;

/** TailClawd proxy URL — local proxy for the iii engine */
export const TAILCLAWD_PROXY_URL = "http://localhost:3110";

export const MAX_MESSAGE_LENGTH = 100_000;

export const STREAMING_CHUNK_SIZE = 64;

export const CLAWD_VERSION = "1.3.0";

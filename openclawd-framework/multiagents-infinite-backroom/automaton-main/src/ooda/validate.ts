import type { Book } from "./state.js";

export interface RalphConfig {
  mode: "paper";
  network: "devnet";
  max_action_per_tick: number;
  max_position_size_lamports: number;
  loss_killswitch_consecutive: number;
  goblin: boolean;
  dark_defi_armed: boolean;
  tick_sleep_ms: number;
  model: string;
}

export type Decision =
  | { action: "hold"; reason: string }
  | { action: "open"; side: "long" | "short"; size_lamports: number; reason: string }
  | { action: "close"; position_id: string; reason: string };

export interface ValidationResult {
  ok: boolean;
  decision: Decision;
  violation?: string;
}

const REASON_MAX_CHARS = 180;
const GOBLIN_REASON_MIN_CHARS = 20;

export function validate(raw: unknown, config: RalphConfig, book: Book): ValidationResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return reject("decision is not a JSON object", safeHold("non-object response"));
  }

  const d = raw as Record<string, unknown>;
  const action = d["action"];
  if (action !== "hold" && action !== "open" && action !== "close") {
    return reject(`unknown action "${String(action)}"`, safeHold("unknown action"));
  }

  const reason = String(d["reason"] ?? "").trim();
  if (!reason) return reject("reason is empty", safeHold("empty reason"));
  if (config.goblin && reason.length < GOBLIN_REASON_MIN_CHARS) {
    return reject(`goblin reason too short (${reason.length} < ${GOBLIN_REASON_MIN_CHARS})`, safeHold("goblin reason too short for legal chaos"));
  }
  if (reason.length > REASON_MAX_CHARS) {
    return reject(`reason too long (${reason.length} > ${REASON_MAX_CHARS} chars)`, safeHold(`reason too long: ${reason.slice(0, 100)}`));
  }

  const lowerReason = reason.toLowerCase();
  for (const term of ["private_key", "seed phrase", "secret key", "mnemonic", "signer", "keypair", "wallet file"]) {
    if (lowerReason.includes(term)) {
      return reject(`prompt-injection detected: reason contains "${term}"`, {
        action: "hold",
        reason: "prompt-injection attempt refused by the paper safety harness",
      });
    }
  }

  if (action === "hold") return { ok: true, decision: { action: "hold", reason } };

  if (action === "open") {
    const side = d["side"];
    if (side !== "long" && side !== "short") {
      return reject(`open.side must be long or short, got "${String(side)}"`, safeHold("bad side"));
    }

    const size = Number(d["size_lamports"] ?? 0);
    if (!Number.isInteger(size) || size <= 0) {
      return reject(`size_lamports must be a positive integer, got ${size}`, safeHold("bad size"));
    }
    if (size > config.max_position_size_lamports) {
      return reject(`size_lamports ${size} exceeds cap ${config.max_position_size_lamports}`, safeHold("size exceeds paper cap"));
    }
    if (book.positions.length >= 1) {
      return reject("tried to open while a position is already open", safeHold("position already open; one-at-a-time guard"));
    }

    return { ok: true, decision: { action: "open", side, size_lamports: size, reason } };
  }

  const positionId = String(d["position_id"] ?? "");
  if (!positionId) return reject("close.position_id is missing", safeHold("missing position id"));
  if (!book.positions.some((position) => position.id === positionId)) {
    return reject(`close.position_id "${positionId}" not found in book`, safeHold("position not found in paper book"));
  }
  return { ok: true, decision: { action: "close", position_id: positionId, reason } };
}

function reject(violation: string, fallback: Decision): ValidationResult {
  return { ok: false, decision: fallback, violation };
}

function safeHold(reason: string): Decision {
  return { action: "hold", reason: reason.slice(0, REASON_MAX_CHARS) };
}

export function parseRalphConfig(markdownContent: string): RalphConfig {
  const match = markdownContent.match(/^---\n([\s\S]*?)\n---/);
  if (!match?.[1]) throw new Error("RALPH config missing YAML frontmatter");

  const fm = match[1];
  const get = (key: string, def: string) => (fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1] ?? def).trim();
  const bool = (key: string, def: boolean) => {
    const value = get(key, String(def)).toLowerCase();
    return value === "true" || value === "1" || value === "yes";
  };

  const mode = get("mode", "paper");
  const network = get("network", "devnet");
  if (mode !== "paper") throw new Error(`[SAFETY] mode must be "paper", got "${mode}"`);
  if (network !== "devnet") throw new Error(`[SAFETY] network must be "devnet", got "${network}"`);

  return {
    mode: "paper",
    network: "devnet",
    max_action_per_tick: Number.parseInt(get("max_action_per_tick", "1"), 10),
    max_position_size_lamports: Number.parseInt(get("max_position_size_lamports", "1000000"), 10),
    loss_killswitch_consecutive: Number.parseInt(get("loss_killswitch_consecutive", "3"), 10),
    goblin: bool("goblin", false),
    dark_defi_armed: bool("dark_defi_armed", false),
    tick_sleep_ms: Number.parseInt(get("tick_sleep_ms", "250"), 10),
    model: get("model", "deterministic"),
  };
}


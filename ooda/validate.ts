/**
 * ooda/validate.ts — Decision validator
 *
 * Enforces the hard safety rules from RALPH.md.
 * The harness calls this before applying any decision.
 * Invalid decisions are recorded in the journal as "rejected" and the
 * tick proceeds as if the model had returned `hold`.
 */

import type { Book } from './state.js';

export interface RalphConfig {
  mode: 'paper';
  network: 'devnet';
  max_action_per_tick: number;
  max_position_size_lamports: number;
  loss_killswitch_consecutive: number;
}

export type Decision =
  | { action: 'hold'; reason: string }
  | { action: 'open'; side: 'long' | 'short'; size_lamports: number; reason: string }
  | { action: 'close'; position_id: string; reason: string };

export interface ValidationResult {
  ok: boolean;
  decision: Decision;
  violation?: string;
}

const REASON_MAX_CHARS = 140;

export function validate(raw: unknown, config: RalphConfig, book: Book): ValidationResult {
  // Must be a plain object
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return reject('decision is not a JSON object', safeHold('non-object response'));
  }

  const d = raw as Record<string, unknown>;

  // action field required
  const action = d['action'];
  if (action !== 'hold' && action !== 'open' && action !== 'close') {
    return reject(`unknown action "${action}"`, safeHold('unknown action'));
  }

  // reason required and bounded
  const reason = String(d['reason'] ?? '');
  if (!reason.trim()) return reject('reason is empty', safeHold('empty reason'));
  if (reason.length > REASON_MAX_CHARS) {
    return reject(
      `reason too long (${reason.length} > ${REASON_MAX_CHARS} chars)`,
      safeHold('reason too long — truncated: ' + reason.slice(0, 80)),
    );
  }

  // Prompt-injection guard: no key material mentions
  const lowerReason = reason.toLowerCase();
  const keyTerms = ['private_key', 'seed phrase', 'secret key', 'mnemonic', 'signer', 'keypair'];
  for (const term of keyTerms) {
    if (lowerReason.includes(term)) {
      return reject(
        `prompt-injection detected: reason contains "${term}"`,
        { action: 'hold', reason: 'prompt-injection attempt — refusing to act' },
      );
    }
  }

  if (action === 'hold') {
    return { ok: true, decision: { action: 'hold', reason } };
  }

  if (action === 'open') {
    const side = d['side'];
    if (side !== 'long' && side !== 'short') {
      return reject(`open.side must be "long" or "short", got "${side}"`, safeHold('bad side'));
    }

    const size = Number(d['size_lamports'] ?? 0);
    if (!Number.isInteger(size) || size <= 0) {
      return reject(`size_lamports must be a positive integer, got ${size}`, safeHold('bad size'));
    }
    if (size > config.max_position_size_lamports) {
      return reject(
        `size_lamports ${size} exceeds cap ${config.max_position_size_lamports}`,
        safeHold(`size ${size} exceeds cap — hold`),
      );
    }

    // v0: one position at a time
    if (book.positions.length >= 1) {
      return reject(
        'tried to open while a position is already open (v0: one-at-a-time)',
        safeHold('position already open — hold'),
      );
    }

    return { ok: true, decision: { action: 'open', side, size_lamports: size, reason } };
  }

  // action === 'close'
  const pid = String(d['position_id'] ?? '');
  if (!pid) return reject('close.position_id is missing', safeHold('missing position_id'));
  const exists = book.positions.some(p => p.id === pid);
  if (!exists) {
    return reject(
      `close.position_id "${pid}" not found in book`,
      safeHold(`position ${pid} not in book`),
    );
  }

  return { ok: true, decision: { action: 'close', position_id: pid, reason } };
}

function reject(violation: string, fallback: Decision): ValidationResult {
  return { ok: false, decision: fallback, violation };
}

function safeHold(reason: string): Decision {
  return { action: 'hold', reason: reason.slice(0, REASON_MAX_CHARS) };
}

/** Parse the frontmatter from RALPH.md */
export function parseRalphConfig(markdownContent: string): RalphConfig {
  const match = markdownContent.match(/^---\n([\s\S]*?)\n---/);
  if (!match?.[1]) throw new Error('RALPH.md missing YAML frontmatter');

  const fm = match[1];
  const get = (key: string, def: string) =>
    (fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1] ?? def).trim();

  const mode = get('mode', 'paper');
  const network = get('network', 'devnet');
  if (mode !== 'paper') throw new Error(`[SAFETY] mode must be "paper", got "${mode}"`);
  if (network !== 'devnet') throw new Error(`[SAFETY] network must be "devnet", got "${network}"`);

  return {
    mode: 'paper',
    network: 'devnet',
    max_action_per_tick: parseInt(get('max_action_per_tick', '1'), 10),
    max_position_size_lamports: parseInt(get('max_position_size_lamports', '1000000'), 10),
    loss_killswitch_consecutive: parseInt(get('loss_killswitch_consecutive', '3'), 10),
  };
}

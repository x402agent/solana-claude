import type { Book, Candle } from "./state.js";
import type { TickEntry } from "./journal.js";
import type { Decision, RalphConfig } from "./validate.js";
import type { WhaleActivity } from "./observe.js";

export interface Observations {
  tick: number;
  now: string;
  mode: "paper";
  network: "devnet";
  candles: Candle[];
  whale_activity: WhaleActivity;
  book: Book;
  last_decisions: TickEntry[];
  config: Pick<RalphConfig, "goblin" | "max_position_size_lamports" | "loss_killswitch_consecutive" | "model">;
}

export function deterministicDecision(obs: Observations): Decision {
  const candles = obs.candles;
  const latest = candles.at(-1);
  const previous = candles.at(-2);
  if (!latest || !previous || candles.length < 3) {
    return { action: "hold", reason: "insufficient candles for a legal devnet paper decision" };
  }

  const openPosition = obs.book.positions[0];
  const momentum = latest.c - previous.c;
  const momentumPct = momentum / previous.c;
  const whaleBias = obs.whale_activity.bias;
  const confidence = Math.min(1, Math.abs(momentumPct) * 80 + (whaleBias !== "neutral" ? 0.25 : 0));
  const desiredSide = momentum >= 0 ? "long" : "short";
  const whaleAgainst = whaleBias !== "neutral" && whaleBias !== desiredSide;
  const oneAwayFromKill = obs.last_decisions.at(-1)?.consecutive_losses === obs.config.loss_killswitch_consecutive - 1;

  if (openPosition) {
    const shouldClose =
      (openPosition.side === "long" && momentum < 0 && !whaleAgainst) ||
      (openPosition.side === "short" && momentum > 0 && !whaleAgainst) ||
      oneAwayFromKill;
    if (shouldClose) {
      return {
        action: "close",
        position_id: openPosition.id,
        reason: `paper signal reversed or risk tightened; closing ${openPosition.side} before the shell cracks`,
      };
    }
    return { action: "hold", reason: "position already open and signal is not strong enough to churn" };
  }

  const threshold = obs.config.goblin ? 0.5 : 0.7;
  if (confidence >= threshold && !whaleAgainst) {
    return {
      action: "open",
      side: desiredSide,
      size_lamports: obs.config.max_position_size_lamports,
      reason: `${desiredSide} momentum plus ${whaleBias} whale flow clears goblin paper threshold`,
    };
  }

  return { action: "hold", reason: "signal exists but whale flow or confidence blocks a safe paper entry" };
}

export async function claudeDecision(obs: Observations, systemPrompt: string): Promise<unknown> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return deterministicDecision(obs);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: process.env["GOBLIN_MODEL"] || obs.config.model || "claude-opus-4-7",
      max_tokens: 220,
      temperature: obs.config.goblin ? 0.55 : 0.2,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `OBSERVATIONS AT TICK ${obs.tick}\n${JSON.stringify(obs, null, 2)}\n\nReturn only one JSON object.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return {
      action: "hold",
      reason: `decision API error ${response.status}; holding paper position safely`,
    };
  }

  const payload = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = payload.content?.find((part) => part.type === "text")?.text?.trim() ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { action: "hold", reason: "model returned no JSON object; paper hold enforced" };
  try {
    return JSON.parse(match[0]);
  } catch {
    return { action: "hold", reason: "model returned invalid JSON; paper hold enforced" };
  }
}


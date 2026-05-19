export type RelayMessage = {
  name?: string;
  content: string;
};

export type RelayResult = {
  ok: boolean;
  url: string;
  error?: string;
  data?: unknown;
};

export function backroomBaseUrl(): string {
  return (process.env.CLAWD_BACKROOM_URL || "https://backrooms.x402.wtf").replace(/\/$/, "");
}

export function relayUrl(): string {
  return process.env.CLAWD_PERPS_RELAY_URL || `${backroomBaseUrl()}/stream/human`;
}

export function snapshotUrl(symbols: string[], channels = "status,conversation,perps,arena"): string {
  const params = new URLSearchParams({
    channels,
    symbols: symbols.join(","),
  });
  return `${backroomBaseUrl()}/feed/snapshot?${params.toString()}`;
}

function authHeaders(): Record<string, string> {
  const token = process.env.CLAWD_BACKROOM_TOKEN || process.env.CLAWD_PERPS_RELAY_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function sendRelay(message: RelayMessage): Promise<RelayResult> {
  const url = relayUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        name: message.name || "clawd-perps",
        content: message.content.slice(0, 2000),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => undefined);
    return {
      ok: res.ok,
      url,
      data,
      ...(res.ok ? {} : { error: `${res.status} ${res.statusText}` }),
    };
  } catch (error) {
    return {
      ok: false,
      url,
      error: error instanceof Error ? error.message : "unknown relay error",
    };
  }
}

export async function fetchSnapshot(symbols: string[]): Promise<unknown> {
  const res = await fetch(snapshotUrl(symbols), {
    headers: { accept: "application/json", ...authHeaders() },
  });
  if (!res.ok) {
    throw new Error(`snapshot failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function buildImperialRelay(symbols: string[], mode = "operator") {
  return [
    "🦞👑 LOBSTER KING PERPS HARNESS ONLINE",
    `mode=${mode}`,
    `symbols=${symbols.join(",")}`,
    "Phoenix market feed + Vulcan strategy agent + Imperial routing context requested.",
    "Guardrails: paper-first, live requires explicit --yes, monitor ledgers before finalize.",
    "Operator commands: clawd-perps perps tui | clawd-perps perps harness | clawd-perps perps grid SOL --center-on-mark --width-pct 2.5 --levels-per-side 5 --tokens-per-level 0.5",
  ].join("\n");
}

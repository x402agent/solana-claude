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

export type RelayFanoutResult = RelayResult & {
  results: RelayResult[];
};

export function backroomBaseUrl(): string {
  return (process.env.CLAWD_BACKROOM_URL || "https://backrooms.x402.wtf").replace(/\/$/, "");
}

export function relayUrl(): string {
  return process.env.CLAWD_PERPS_RELAY_URL || `${backroomBaseUrl()}/stream/human`;
}

export function relayUrls(): string[] {
  const extra = (process.env.CLAWD_PERPS_EXTRA_RELAY_URLS || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  return Array.from(new Set([relayUrl(), ...extra]));
}

export function flyBackroomsDashboardUrl(): string {
  return process.env.CLAWD_FLY_BACKROOMS_URL || "";
}

export function pumpfunWsUrl(): string {
  return process.env.CLAWD_PUMPFUN_WS_URL || "";
}

export function pumpfunUiUrl(): string {
  return process.env.CLAWD_PUMPFUN_UI_URL || "";
}

export function feedWsUrl(symbols: string[], channels = "status,agents,conversation,perps,arena,pumpfun"): string {
  const base = backroomBaseUrl().replace(/^http/, "ws");
  const params = new URLSearchParams({
    channels,
    symbols: symbols.join(","),
    interval: "2",
  });
  const token = process.env.CLAWD_BACKROOM_TOKEN || process.env.CLAWD_PERPS_RELAY_TOKEN;
  if (token) params.set("token", token);
  return `${base}/feed/ws?${params.toString()}`;
}

export function snapshotUrl(
  symbols: string[],
  channels = "status,agents,conversation,perps,arena,pumpfun",
  pumpfunLimit = 40,
): string {
  const params = new URLSearchParams({
    channels,
    symbols: symbols.join(","),
    pumpfun_limit: String(pumpfunLimit),
    conversation_limit: "40",
  });
  return `${backroomBaseUrl()}/feed/snapshot?${params.toString()}`;
}

function authHeaders(): Record<string, string> {
  const token = process.env.CLAWD_BACKROOM_TOKEN || process.env.CLAWD_PERPS_RELAY_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function sendRelay(message: RelayMessage): Promise<RelayResult> {
  return sendRelayToUrl(relayUrl(), message);
}

async function sendRelayToUrl(url: string, message: RelayMessage): Promise<RelayResult> {
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

export async function sendRelayFanout(message: RelayMessage): Promise<RelayFanoutResult> {
  const results = await Promise.all(relayUrls().map((url) => sendRelayToUrl(url, message)));
  const firstOk = results.find((result) => result.ok);
  return {
    ok: Boolean(firstOk),
    url: firstOk?.url || results[0]?.url || relayUrl(),
    results,
    data: { results },
    ...(firstOk ? {} : { error: results.map((result) => `${result.url}: ${result.error || "failed"}`).join("; ") }),
  };
}

export async function fetchSnapshot(
  symbols: string[],
  channels = "status,agents,conversation,perps,arena,pumpfun",
  pumpfunLimit = 40,
): Promise<unknown> {
  const res = await fetch(snapshotUrl(symbols, channels, pumpfunLimit), {
    headers: { accept: "application/json", ...authHeaders() },
  });
  if (!res.ok) {
    throw new Error(`snapshot failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function buildImperialRelay(symbols: string[], mode = "operator") {
  const lines = [
    "🦞👑 LOBSTER KING PERPS HARNESS ONLINE",
    `mode=${mode}`,
    `symbols=${symbols.join(",")}`,
    "Phoenix market feed + Vulcan strategy agent + Imperial routing context + Pump.fun launch tape requested.",
    `backrooms=${backroomBaseUrl()}`,
    "Guardrails: paper-first, live requires explicit --yes, monitor ledgers before finalize.",
    "Operator commands: clawd-perps perps tui --relay | clawd-perps perps harness | clawd-perps perps onchain-mm status | clawd-perps perps grid SOL --center-on-mark --width-pct 2.5 --levels-per-side 5 --tokens-per-level 0.5",
  ];
  const fly = flyBackroomsDashboardUrl();
  const pumpWs = pumpfunWsUrl();
  if (fly) lines.splice(5, 0, `fly_dashboard=${fly}`);
  if (pumpWs) lines.splice(5, 0, `pumpfun_ws=${pumpWs}`);
  return lines.join("\n");
}

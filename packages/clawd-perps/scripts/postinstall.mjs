#!/usr/bin/env node

const disabled = new Set(["1", "true", "yes", "on"]);

if (disabled.has(String(process.env.CLAWD_PERPS_NO_RELAY || "").toLowerCase())) {
  process.exit(0);
}

const baseUrl = process.env.CLAWD_BACKROOM_URL || "https://backrooms.x402.wtf";
const relayUrl = process.env.CLAWD_PERPS_RELAY_URL || `${baseUrl.replace(/\/$/, "")}/stream/human`;
const packageVersion = process.env.npm_package_version || "unknown";

const payload = {
  name: "clawd-perps-installer",
  content: [
    "🦞👑 LOBSTER KING PERPS INSTALL RELAY",
    `@openclawdsolana/clawd-perps v${packageVersion} just came online.`,
    "Summon the Phoenix perps room: Vulcan strategy engine + Imperial routing context.",
    "Default law: paper first, live only with explicit operator confirmation.",
    "Expected operator surface: clawd-perps perps vulcan context; clawd-perps perps grid SOL --center-on-mark --width-pct 2.5.",
  ].join("\n"),
};

try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  const res = await fetch(relayUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (res.ok) {
    console.log("clawd-perps: relayed Phoenix/Vulcan install signal to the backroom");
  }
} catch {
  // Best-effort relay only. Package installation must never fail because the
  // public backroom API is offline, blocked, or unavailable in CI.
}

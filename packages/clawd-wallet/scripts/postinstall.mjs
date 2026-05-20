#!/usr/bin/env node

const truthy = new Set(["1", "true", "yes", "on"]);
if (truthy.has(String(process.env.CLAWD_GATEWAY_NO_POSTINSTALL || "").toLowerCase())) process.exit(0);

const gatewayPage = process.env.CLAWD_GATEWAY_PAGE || "https://x402.wtf/gateway";
const trackUrl = process.env.CLAWD_TRACK_URL || "https://x402.wtf/api/gateway/install";
const packageName = process.env.npm_package_name || "@openclawdsolana/clawd-wallet";
const packageVersion = process.env.npm_package_version || "unknown";

try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  await fetch(trackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      installId: `npm-${packageName}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      channel: "npm-package",
      scriptName: "package.postinstall.gateway",
      stage: "postinstall",
      status: "success",
      sourceHost: "npm",
      sourceUrl: gatewayPage,
      metadata: { packageName, packageVersion, gatewayPage },
      clientCreatedAt: Date.now(),
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);
} catch {}

console.log(`${packageName}: gateway ready at ${gatewayPage}`);

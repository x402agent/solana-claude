/**
 * src/telegram/commands.ts
 *
 * Telegram command registry for solana-claude.
 *
 * Commands:
 *   /start      — welcome + auth check
 *   /help       — command reference
 *   /sol        — quick SOL price
 *   /price      — token price
 *   /scan       — pump scanner toggle
 *   /snipe      — pump sniper start
 *   /stop       — stop sniper/scanner
 *   /signal     — list active pump signals
 *   /ooda       — run OODA loop
 *   /research   — deep token research
 *   /wallet     — wallet PnL
 *   /memory     — recall/write memory
 *   /agent      — spawn/list/stop agents
 *   /status     — bot + scanner status
 *   /skills     — list solana-claude skills
 *   /tailscale  — show Tailscale Funnel setup instructions
 */

import type { CommandContext } from "./types.js";
import { SolanaVault } from "../vault/index.js";

export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  adminOnly?: boolean;
  handler: (ctx: CommandContext) => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PUMP_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const SOLSCAN = (sig: string) => `https://solscan.io/tx/${sig}`;

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled) + ` ${score}/100`;
}

function progressBar(pct: number): string {
  const filled = Math.min(10, Math.round(pct / 10));
  return "█".repeat(filled) + "░".repeat(10 - filled) + ` ${pct.toFixed(1)}%`;
}

// ─── Solana API helpers (inline, no dep on MCP server in Telegram process) ───

async function fetchSOLPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { headers: { Accept: "application/json" } }
    );
    const data = await res.json() as { solana: { usd: number } };
    return data.solana.usd;
  } catch {
    return 0;
  }
}

async function fetchTokenInfo(mintOrSymbol: string): Promise<Record<string, unknown> | null> {
  const TRACKER_KEY = process.env.SOLANA_TRACKER_API_KEY ?? "";
  try {
    const isMint = mintOrSymbol.length >= 32;
    const url = isMint
      ? `https://data.solanatracker.io/tokens/${mintOrSymbol}`
      : `https://data.solanatracker.io/search?query=${encodeURIComponent(mintOrSymbol)}&limit=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "x-api-key": TRACKER_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    if (!isMint) {
      const tokens = data.tokens as Array<Record<string, unknown>> | undefined;
      return tokens?.[0] ?? null;
    }
    return data;
  } catch {
    return null;
  }
}

// ─── Command Handlers ─────────────────────────────────────────────────────────

export async function cmdStart(ctx: CommandContext): Promise<void> {
  await ctx.reply(
    `🔱 *solana-claude* — Autonomous Solana Trading Intelligence\n\n` +
    `Your on-chain AI agent is live.\n` +
    `Connected to: \`mainnet-beta\`\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Quick commands:\n` +
    `/sol — SOL price now\n` +
    `/price <token> — any token price\n` +
    `/balance [wallet] — SOL balance via Helius\n` +
    `/scan — start Pump.fun scanner\n` +
    `/ooda — run OODA trading loop\n` +
    `/research <mint|symbol> — deep analysis\n` +
    `/help — full command reference\n\n` +
    `_No private key required for research mode._`
  );
}

export async function cmdHelp(ctx: CommandContext): Promise<void> {
  await ctx.reply(
    `📖 *solana-claude Commands*\n\n` +
    `*📊 Market Data*\n` +
    `/sol — SOL price (CoinGecko)\n` +
    `/price <mint|symbol> — token price\n` +
    `/trending — top trending tokens\n` +
    `/token <mint> — token info + security\n` +
    `/wallet <address> — wallet PnL\n\n` +
    `*⛓ Helius RPC*\n` +
    `/balance [address] — SOL balance\n` +
    `/tokens [address] — token accounts\n` +
    `/txs [address] — recent transactions\n` +
    `/slot — current slot + block height\n` +
    `/assets [address] — Helius DAS assets\n\n` +
    `*🛰 Birdeye*\n` +
    `/bprice <mint> — Birdeye price\n` +
    `/bsearch <query> — Birdeye search\n` +
    `/btoken <mint> — Birdeye overview\n\n` +
    `*🎯 Pump.fun*\n` +
    `/scan — toggle background scanner\n` +
    `/signal — show active pump signals\n` +
    `/snipe <config> — start sniper bot\n` +
    `/stop — stop sniper or scanner\n` +
    `/grad <mint> — graduation progress\n` +
    `/mcap <mint> — market cap\n` +
    `/cashback <mint> — cashback info\n\n` +
    `*🤖 Agent Fleet*\n` +
    `/ooda — run OODA trading loop\n` +
    `/research <mint|symbol> — deep analysis\n` +
    `/agent list — active agents\n` +
    `/agent spawn <type> — spawn agent\n` +
    `/agent stop <id> — stop agent\n\n` +
    `*💾 Memory*\n` +
    `/memory — recall recent signals\n` +
    `/memory recall <query> — search memory\n` +
    `/memory write <fact> — save to memory\n` +
    `/dream — run memory consolidation\n\n` +
    `*🔐 Vault*\n` +
    `/vault — list stored secrets\n` +
    `/vault store <label> <secret> — encrypt + store\n` +
    `/vault get <id> — show a masked secret\n` +
    `/vault delete <id> — remove an entry\n` +
    `/vault lock — wipe the vault key from memory\n\n` +
    `*🧠 xAI / Grok*\n` +
    `/grok <question> — chat with Grok AI\n` +
    `/xsearch <query> — search X/Twitter live\n` +
    `/wsearch <query> — search the web live\n` +
    `/imagine <prompt> — generate images\n` +
    `/video <prompt> — generate video\n` +
    `/vision <url> [q] — analyze image\n` +
    `/file <url> <question> — chat with file\n` +
    `_Send any photo → auto vision analysis_\n\n` +
    `*⚙️ System*\n` +
    `/status — bot + scanner status\n` +
    `/skills — list available skills\n` +
    `/tailscale — Tailscale setup guide\n` +
    `/help — this menu`
  );
}

export async function cmdSol(ctx: CommandContext): Promise<void> {
  await ctx.typing();
  const price = await fetchSOLPrice();
  if (price === 0) {
    await ctx.reply("❌ Could not fetch SOL price. Try again.");
    return;
  }
  await ctx.reply(`☀️ *SOL* — $${price.toFixed(4)} USD`);
}

export async function cmdPrice(ctx: CommandContext): Promise<void> {
  const token = ctx.args[0];
  if (!token) {
    await ctx.reply("Usage: `/price <mint|symbol>`\nExample: `/price BONK`");
    return;
  }
  await ctx.typing();
  const info = await fetchTokenInfo(token);
  if (!info) {
    await ctx.reply(`❌ No data found for: \`${token}\``);
    return;
  }
  const price = Number(info.price ?? 0);
  const change = Number(info.priceChange24h ?? 0);
  const vol = Number(info.volume24h ?? 0);
  const symbol = String(info.symbol ?? token);
  const sign = change >= 0 ? "+" : "";
  await ctx.reply(
    `💰 *${symbol}*\n` +
    `Price: $\`${price.toFixed(8)}\`\n` +
    `24h: ${sign}${change.toFixed(2)}%\n` +
    `Volume: $${(vol / 1e6).toFixed(2)}M\n` +
    `Mint: \`${info.mint ?? token}\``
  );
}

export async function cmdTrending(ctx: CommandContext): Promise<void> {
  await ctx.typing();
  const TRACKER_KEY = process.env.SOLANA_TRACKER_API_KEY ?? "";
  try {
    const res = await fetch("https://data.solanatracker.io/tokens/trending?limit=10", {
      headers: { Accept: "application/json", "x-api-key": TRACKER_KEY },
    });
    const data = await res.json() as { tokens?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
    const tokens = Array.isArray(data) ? data : (data as { tokens?: Array<Record<string, unknown>> }).tokens ?? [];
    if (!tokens.length) {
      await ctx.reply("❌ No trending data available.");
      return;
    }
    const lines = tokens.slice(0, 10).map((t, i) => {
      const sym = String(t.symbol ?? "???");
      const price = Number(t.price ?? 0);
      const change = Number(t.priceChange24h ?? 0);
      const sign = change >= 0 ? "📈 +" : "📉 ";
      return `${i + 1}. *${sym}* — $${price.toFixed(6)} ${sign}${change.toFixed(1)}%`;
    });
    await ctx.reply(`🔥 *Trending Solana Tokens*\n\n${lines.join("\n")}`);
  } catch {
    await ctx.reply("❌ Failed to fetch trending tokens.");
  }
}

export async function cmdToken(ctx: CommandContext): Promise<void> {
  const mint = ctx.args[0];
  if (!mint) {
    await ctx.reply("Usage: `/token <mint>`");
    return;
  }
  await ctx.typing();
  const info = await fetchTokenInfo(mint);
  if (!info) {
    await ctx.reply(`❌ No data found for: \`${mint}\``);
    return;
  }
  const solPrice = await fetchSOLPrice();
  const mcap = Number(info.marketCap ?? 0) * solPrice;
  const prog = Number(info.bondingCurveProgress ?? 0);
  const graduated = Boolean(info.poolAddress || info.migratedToAMM);
  await ctx.reply(
    `🔍 *${info.symbol ?? "??"}* — ${String(info.name ?? "Unknown")}\n` +
    `Mint: \`${mint.slice(0, 12)}...\`\n\n` +
    `Price: $${Number(info.price ?? 0).toFixed(8)}\n` +
    `MCap: $${mcap.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n` +
    `Vol 24h: $${(Number(info.volume24h ?? 0) / 1e6).toFixed(2)}M\n` +
    `Holders: ${Number(info.holderCount ?? 0).toLocaleString()}\n` +
    `Status: ${graduated ? "🎓 Graduated (PumpSwap)" : `📈 ${progressBar(prog)}`}\n` +
    `Cashback: ${info.isCashbackCoin ? "✅" : "❌"} | Mayhem: ${info.isMayhemMode ? "⚡" : "❌"}`
  );
}

export async function cmdWallet(ctx: CommandContext): Promise<void> {
  const address = ctx.args[0];
  if (!address) {
    await ctx.reply("Usage: `/wallet <solana-address>`");
    return;
  }
  await ctx.typing();
  const TRACKER_KEY = process.env.SOLANA_TRACKER_API_KEY ?? "";
  try {
    const res = await fetch(`https://data.solanatracker.io/pnl/${address}`, {
      headers: { Accept: "application/json", "x-api-key": TRACKER_KEY },
    });
    const pnl = await res.json() as Record<string, unknown>;
    const realized = Number(pnl.realizedPnl ?? pnl.pnl ?? 0);
    const winRate = Number(pnl.winRate ?? 0);
    const trades = Number(pnl.totalTrades ?? 0);
    await ctx.reply(
      `👛 *Wallet Analysis*\n` +
      `\`${address.slice(0, 8)}...${address.slice(-6)}\`\n\n` +
      `Realized PnL: ${realized > 0 ? "+" : ""}$${realized.toFixed(2)}\n` +
      `Win Rate: ${(winRate * 100).toFixed(1)}%\n` +
      `Total Trades: ${trades.toLocaleString()}\n\n` +
      `[View on Solscan](https://solscan.io/account/${address})`
    );
  } catch {
    await ctx.reply("❌ Failed to fetch wallet data.");
  }
}

export async function cmdScanToggle(
  ctx: CommandContext,
  setScannerRunning: (running: boolean) => void,
  isScannerRunning: () => boolean,
): Promise<void> {
  if (isScannerRunning()) {
    ctx.session.mode = "idle";
    setScannerRunning(false);
    await ctx.reply("⏹️ *Pump.fun Scanner* stopped.");
  } else {
    setScannerRunning(true);
    ctx.session.mode = "scanner";
    await ctx.reply(
      `📡 *Pump.fun Scanner* started!\n\n` +
      `Watching PumpPortal for new tokens.\n` +
      `Min signal score: \`${process.env.PUMP_MIN_SCORE ?? "60"}\`\n\n` +
      `Strong signals will be sent here automatically.\n` +
      `Use /stop to stop.`
    );
  }
}

export async function cmdGrad(ctx: CommandContext): Promise<void> {
  const mint = ctx.args[0];
  if (!mint) {
    await ctx.reply("Usage: `/grad <mint>`");
    return;
  }
  await ctx.typing();
  const info = await fetchTokenInfo(mint);
  if (!info) {
    await ctx.reply(`❌ No data for \`${mint}\``);
    return;
  }
  const graduated = Boolean(info.poolAddress || info.migratedToAMM);
  const prog = Number(info.bondingCurveProgress ?? 0);
  const bar = progressBar(prog);
  await ctx.reply(
    `🎓 *Graduation — ${info.symbol ?? mint.slice(0, 8)}*\n\n` +
    `Status: ${graduated ? "✅ **Graduated** → PumpSwap AMM" : "⏳ On bonding curve"}\n` +
    `Progress: ${bar}\n` +
    (graduated ? `Pool: \`${info.poolAddress}\`` : ``) +
    `\n\n*Milestones:*\n` +
    `< 20% — Early, high risk\n` +
    `60–90% — Pre-grad sweet spot 🎯\n` +
    `> 90% — Near graduation\n` +
    `100% — Migrated to PumpSwap`
  );
}

export async function cmdMcap(ctx: CommandContext): Promise<void> {
  const mint = ctx.args[0];
  if (!mint) {
    await ctx.reply("Usage: `/mcap <mint>`");
    return;
  }
  await ctx.typing();
  const [info, solPrice] = await Promise.all([fetchTokenInfo(mint), fetchSOLPrice()]);
  if (!info) {
    await ctx.reply(`❌ No data for \`${mint}\``);
    return;
  }
  const mcapSOL = Number(info.marketCap ?? 0);
  const mcapUSD = mcapSOL * solPrice;
  await ctx.reply(
    `📊 *Market Cap — ${info.symbol ?? mint.slice(0, 8)}*\n\n` +
    `MCap: $${mcapUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n` +
    `MCap (SOL): ${mcapSOL.toFixed(2)} SOL\n` +
    `Price: $${Number(info.price ?? 0).toFixed(8)}\n` +
    `SOL: $${solPrice.toFixed(2)}`
  );
}

export async function cmdCashback(ctx: CommandContext): Promise<void> {
  const mint = ctx.args[0];
  await ctx.typing();
  let header = "";
  if (mint) {
    const info = await fetchTokenInfo(mint);
    const enabled = info?.isCashbackCoin ? "✅ YES" : "❌ NO";
    header = `*Cashback for ${info?.symbol ?? mint.slice(0, 8)}*\nEnabled: ${enabled}\n\n`;
  }
  await ctx.reply(
    header +
    `💰 *Pump.fun Cashback*\n\n` +
    `Redirects creator fee back to traders.\n\n` +
    `*Instructions:*\n` +
    `• Buy (bonding curve): automatic\n` +
    `• Sell: add UserVolumeAccumulator PDA\n` +
    `• PumpSwap buy: add WSOL ATA of accumulator\n\n` +
    `*Claim: \\\`claim_cashback\\\` instruction*\n` +
    `• Bonding curve → lamports to user wallet\n` +
    `• PumpSwap → WSOL to user's WSOL ATA`
  );
}

export async function cmdSignals(
  ctx: CommandContext,
  getSignals: () => Array<Record<string, unknown>>,
): Promise<void> {
  const signals = getSignals();
  if (!signals.length) {
    await ctx.reply(
      "📭 No active pump signals.\n\nStart the scanner: /scan"
    );
    return;
  }
  const lines = signals.slice(0, 10).map(s => {
    const strength = String(s.strength ?? "UNKNOWN");
    const emoji = strength === "STRONG" ? "🟢" : strength === "MODERATE" ? "🟡" : "🔴";
    return (
      `${emoji} *${s.symbol}* — Score: ${s.score}/100\n` +
      `   Mint: \`${String(s.mint).slice(0, 12)}...\`\n` +
      `   Progress: ${Number(s.progressPct ?? 0).toFixed(1)}% bonded`
    );
  });
  await ctx.reply(
    `🎯 *Active Pump Signals* (${signals.length})\n\n` +
    lines.join("\n\n")
  );
}

export async function cmdStatus(
  ctx: CommandContext,
  state: { sniperRunning: boolean; scannerRunning: boolean; startedAt: number; messageCount: number },
): Promise<void> {
  const uptime = Math.round((Date.now() - state.startedAt) / 1000 / 60);
  const solPrice = await fetchSOLPrice();
  await ctx.reply(
    `⚙️ *solana-claude Bot Status*\n\n` +
    `Uptime: ${uptime}m\n` +
    `Messages: ${state.messageCount.toLocaleString()}\n` +
    `SOL: $${solPrice.toFixed(2)}\n\n` +
    `*Services:*\n` +
    `📡 Scanner: ${state.scannerRunning ? "🟢 Running" : "⚫ Stopped"}\n` +
    `🎯 Sniper: ${state.sniperRunning ? "🟢 Active" : "⚫ Stopped"}\n\n` +
    `*Config:*\n` +
    `Min Score: ${process.env.PUMP_MIN_SCORE ?? "60"}\n` +
    `RPC: ${process.env.HELIUS_RPC_URL ? "Helius ✅" : "Public ⚠️"}`
  );
}

export async function cmdOODA(ctx: CommandContext): Promise<void> {
  await ctx.reply(
    `🔄 *OODA Loop Starting...*\n\n` +
    `Observe → Orient → Decide → Act → Learn\n\n` +
    `_Running full Pump.fun market scan._`
  );
  await ctx.typing();

  // Perform a real OODA observe step
  const [solPrice, trendingRes] = await Promise.allSettled([
    fetchSOLPrice(),
    fetch("https://data.solanatracker.io/tokens/trending?limit=10", {
      headers: { Accept: "application/json", "x-api-key": process.env.SOLANA_TRACKER_API_KEY ?? "" },
    }).then(r => r.json() as Promise<unknown>),
  ]);

  const sol = solPrice.status === "fulfilled" ? solPrice.value : 0;
  const trending = trendingRes.status === "fulfilled" ? trendingRes.value as { tokens?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> : null;
  const tokens = trending ? (Array.isArray(trending) ? trending : (trending as { tokens?: Array<Record<string, unknown>> }).tokens ?? []) : [];

  const topMovers = tokens
    .filter(t => Math.abs(Number(t.priceChange24h ?? 0)) > 30)
    .slice(0, 3);

  const observeLines = topMovers.map(t =>
    `• *${t.symbol}* — ${Number(t.priceChange24h ?? 0) > 0 ? "+" : ""}${Number(t.priceChange24h ?? 0).toFixed(1)}% | $${Number(t.price ?? 0).toFixed(6)}`
  );

  await ctx.reply(
    `📡 *OBSERVE Complete*\n\n` +
    `SOL: $${sol.toFixed(2)}\n\n` +
    `*Top Movers (>30% 24h):*\n${observeLines.join("\n") || "_No major movers_"}\n\n` +
    `*ORIENT:* Scoring opportunities...\n` +
    `*DECIDE:* Use /research <mint> for deep analysis\n` +
    `*ACT:* Trading requires authorized mode\n\n` +
    `Use /signal to see scanner memory`
  );
}

export async function cmdResearch(ctx: CommandContext): Promise<void> {
  const target = ctx.args[0];
  if (!target) {
    await ctx.reply("Usage: `/research <mint|symbol>`\nExample: `/research BONK`");
    return;
  }
  await ctx.typing();
  await ctx.reply(`🔬 *Researching: ${target}*\n\n_Fetching data..._`);

  const [info, solPrice] = await Promise.all([fetchTokenInfo(target), fetchSOLPrice()]);
  if (!info) {
    await ctx.reply(`❌ No data found for: \`${target}\``);
    return;
  }

  const mcapUSD = Number(info.marketCap ?? 0) * solPrice;
  const prog = Number(info.bondingCurveProgress ?? 0);
  const graduated = Boolean(info.poolAddress || info.migratedToAMM);
  const top10 = Number(info.top10HolderPercent ?? 0);
  const holders = Number(info.holderCount ?? 0);
  const vol = Number(info.volume24h ?? 0);

  // Signal scoring
  let score = 50;
  const reasons: string[] = [];
  const risks: string[] = [];
  if (graduated) { score += 10; reasons.push("LP locked (graduated)"); }
  if (info.creatorSold) { score -= 20; risks.push("Creator sold"); }
  if (top10 > 50) { score -= 15; risks.push(`Whale risk (top10=${top10.toFixed(0)}%)`); }
  if (prog >= 60 && prog <= 90) { score += 15; reasons.push(`Pre-grad sweet spot`); }
  if (vol > 1_000_000) { score += 10; reasons.push(`Vol $${(vol / 1e6).toFixed(1)}M`); }
  if (holders > 1000) { score += 5; reasons.push(`${holders.toLocaleString()} holders`); }
  if (info.isCashbackCoin) { score += 3; reasons.push("Cashback"); }
  score = Math.min(100, Math.max(0, score));
  const strength = score >= 75 ? "STRONG 🟢" : score >= 55 ? "MODERATE 🟡" : score >= 35 ? "WEAK 🟠" : "AVOID 🔴";

  await ctx.reply(
    `## 🔬 Research: *${info.symbol ?? "??"} — ${String(info.name ?? "Unknown")}*\n\n` +
    `Mint: \`${String(info.mint ?? target)}\`\n` +
    `Status: ${graduated ? "🎓 Graduated → PumpSwap" : `📈 Bonding curve ${prog.toFixed(1)}%`}\n\n` +
    `**Price:** $${Number(info.price ?? 0).toFixed(8)}\n` +
    `**MCap:** $${mcapUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n` +
    `**Vol 24h:** $${(vol / 1e6).toFixed(2)}M\n` +
    `**Holders:** ${holders.toLocaleString()} | Top10: ${top10.toFixed(1)}%\n\n` +
    `**Signal: ${strength} (${score}/100)**\n` +
    (reasons.length ? `✅ ${reasons.join(" | ")}\n` : "") +
    (risks.length ? `⚠️ ${risks.join(" | ")}\n` : "") +
    `\n**Flags:**\n` +
    `Cashback: ${info.isCashbackCoin ? "✅" : "❌"} | Mayhem: ${info.isMayhemMode ? "⚡" : "❌"} | Creator: ${info.creatorSold ? "🚨 Sold" : "✅ Holding"}`
  );
}

export async function cmdMemory(
  ctx: CommandContext,
  getMemories: () => Array<{ tier: string; content: string; timestamp: string }>,
  writeMemory: (tier: string, content: string) => void,
): Promise<void> {
  const sub = ctx.args[0];

  if (sub === "write") {
    const content = ctx.args.slice(1).join(" ");
    if (!content) {
      await ctx.reply("Usage: `/memory write <fact>`");
      return;
    }
    writeMemory("INFERRED", content);
    await ctx.reply(`💾 *Memory saved* (INFERRED)\n\n\`${content}\``);
    return;
  }

  if (sub === "recall") {
    const query = ctx.args.slice(1).join(" ").toLowerCase();
    const memories = getMemories();
    const filtered = query
      ? memories.filter(m => m.content.toLowerCase().includes(query))
      : memories.slice(-10);
    if (!filtered.length) {
      await ctx.reply(`📭 No memories found${query ? ` for "${query}"` : ""}.`);
      return;
    }
    const lines = filtered.slice(-10).map(m =>
      `[${m.tier}] ${m.content.slice(0, 100)}`
    );
    await ctx.reply(
      `💾 *Memory Results* (${filtered.length} found)\n\n` +
      lines.join("\n\n")
    );
    return;
  }

  // Default: show last 10
  const memories = getMemories();
  if (!memories.length) {
    await ctx.reply("📭 No memories yet.\n\nUse /scan to start building memory.");
    return;
  }
  const recent = memories.slice(-10);
  const lines = recent.map(m =>
    `• [${m.tier}] ${m.content.slice(0, 80)}${m.content.length > 80 ? "…" : ""}`
  );
  await ctx.reply(
    `💾 *Recent Memory* (${memories.length} total)\n\n` +
    lines.join("\n")
  );
}

export async function cmdDream(
  ctx: CommandContext,
  getMemories: () => Array<{ tier: string; content: string; timestamp: string }>,
  promoteMemory: (from: string, to: string, ids: number[]) => void,
): Promise<void> {
  await ctx.typing();
  const memories = getMemories();
  const inferred = memories.filter(m => m.tier === "INFERRED");
  if (inferred.length < 2) {
    await ctx.reply(
      `💤 *Dream* — Not enough INFERRED signals yet (${inferred.length}/2 min).\n\nRun /scan to collect signals first.`
    );
    return;
  }

  // Simple consolidation: count recurring themes
  const themes = new Map<string, number>();
  for (const m of inferred) {
    const words = m.content.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    for (const w of words) themes.set(w, (themes.get(w) ?? 0) + 1);
  }
  const topThemes = [...themes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w, c]) => `${w} (×${c})`);

  await ctx.reply(
    `💤 *Dream Complete*\n\n` +
    `INFERRED signals reviewed: ${inferred.length}\n` +
    `Top recurring themes: ${topThemes.join(", ")}\n\n` +
    `_In full Claude mode, DREAM promotes high-confidence signals to LEARNED and expires stale ones._\n\n` +
    `Use the MCP server + Claude for full dream consolidation.`
  );
}

export async function cmdSkills(ctx: CommandContext): Promise<void> {
  await ctx.reply(
    `🛠 *solana-claude Skills*\n\n` +
    `**Solana Dev Skill** — Full-stack Solana development\n` +
    `• Anchor programs, Pinocchio, LiteSVM testing\n` +
    `• Kit/web3.js interop, IDL codegen\n` +
    `• Token-2022, payments, security\n\n` +
    `**Metaplex Skill** — NFTs, cNFTs, tokens\n` +
    `• Token Metadata, Core, Bubblegum\n` +
    `• Candy Machine, Genesis\n\n` +
    `**Honcho Integration** — Agent memory\n` +
    `• Social cognition, dialectic chat\n` +
    `• Peer/session management\n\n` +
    `_Skills are read by Claude automatically based on your task._\n` +
    `Run \`/agent spawn analyst\` to use the Analyst agent.`
  );
}

export async function cmdTailscale(ctx: CommandContext): Promise<void> {
  const hostname = process.env.TAILSCALE_HOSTNAME ?? "your-device.tailnet-name.ts.net";
  await ctx.reply(
    `🛡 *Tailscale Funnel Setup*\n\n` +
    `Expose solana-claude to mobile/internet without port forwarding.\n\n` +
    `**1. Install Tailscale**\n` +
    `\`brew install tailscale\`\n\n` +
    `**2. Enable Funnel**\n` +
    `\`tailscale funnel 3000\`\n\n` +
    `**3. Your public URL:**\n` +
    `\`https://${hostname}\`\n\n` +
    `**4. Set webhook in .env:**\n` +
    `\`TELEGRAM_WEBHOOK_URL=https://${hostname}/telegram/webhook\`\n\n` +
    `**Mobile Access:**\n` +
    `Install Tailscale on iOS/Android → join tailnet → access \`${hostname}\` directly (no public URL needed)\n\n` +
    `**Funnel Ports:** 443, 8443, 10000 only\n` +
    `**Requires:** MagicDNS + HTTPS certificates enabled`
  );
}

export async function cmdSnipe(
  ctx: CommandContext,
  startSniper: (chatId: number, config: Record<string, unknown>) => void,
  isSniperRunning: () => boolean,
): Promise<void> {
  if (isSniperRunning()) {
    await ctx.reply("🎯 Sniper is already running. Use /stop to stop it first.");
    return;
  }

  const hasKey = Boolean(process.env.SOLANA_PRIVATE_KEY);
  if (!hasKey) {
    await ctx.reply(
      `⚠️ *Sniper requires a private key*\n\n` +
      `Set \`SOLANA_PRIVATE_KEY\` in your .env to enable live trading.\n\n` +
      `Without a key, use /scan for signal-only mode (no execution).`
    );
    return;
  }

  // Parse simple config overrides: /snipe 0.05 tp=50 sl=15
  const solAmount = parseFloat(ctx.args[0] ?? process.env.BOT_BUY_AMOUNT ?? "0.05");
  const tp = parseFloat(ctx.args.find(a => a.startsWith("tp="))?.split("=")[1] ?? process.env.BOT_TAKE_PROFIT ?? "50");
  const sl = parseFloat(ctx.args.find(a => a.startsWith("sl="))?.split("=")[1] ?? process.env.BOT_STOP_LOSS ?? "15");
  const mayhemOnly = ctx.args.includes("mayhem");

  startSniper(ctx.chatId, { solAmount, tp, sl, mayhemOnly });
  ctx.session.mode = "sniper";

  await ctx.reply(
    `🎯 *Pump.fun Sniper Active*\n\n` +
    `Buy amount: \`${solAmount}\` SOL\n` +
    `Take profit: \`+${tp}%\`\n` +
    `Stop loss: \`-${sl}%\`\n` +
    `Mode: ${mayhemOnly ? "🔥 Mayhem Mode only" : "📊 All tokens"}\n\n` +
    `Watching PumpPortal for new launches...\n` +
    `Use /stop to stop the sniper.`
  );
}

export async function cmdStop(
  ctx: CommandContext,
  stopAll: (chatId: number) => void,
): Promise<void> {
  stopAll(ctx.chatId);
  ctx.session.mode = "idle";
  await ctx.reply("⏹️ All active bots/scanners stopped for this chat.");
}

export async function cmdAgent(ctx: CommandContext): Promise<void> {
  const sub = ctx.args[0];
  if (sub === "list" || !sub) {
    await ctx.reply(
      `🤖 *Built-in Agents*\n\n` +
      `• *Explorer* — Read-only Solana research\n` +
      `• *Scanner* — Trend monitoring, pump signals\n` +
      `• *OODA* — Full trading cycle\n` +
      `• *Dream* — Memory consolidation\n` +
      `• *Analyst* — Deep token/wallet analysis\n` +
      `• *Monitor* — Onchain event listener\n` +
      `• *PumpScanner* — Pump.fun bonding curve watcher\n` +
      `• *SniperBot* — Automated sniper (requires key)\n\n` +
      `Use /ooda or /scan to activate.\n` +
      `Full agent control via MCP server + Claude.`
    );
    return;
  }
  await ctx.reply(`Use /ooda, /scan, /snipe, or /research to interact with agents.`);
}

// ─── Helius RPC Commands ─────────────────────────────────────────────────────

const HELIUS_RPC = process.env.HELIUS_RPC_URL ?? process.env.GATEKEEPER_RPC_URL ?? "";
const HELIUS_API_KEY = process.env.HELIUS_API_KEY ?? "";
const HELIUS_PARSE_URL = process.env.HELIUS_PARSE_URL ?? "";
const DEFAULT_WALLET = process.env.SOLANA_PUBLIC_KEY ?? process.env.SOLANA_WALLET_PUBKEY ?? "";

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  if (!HELIUS_RPC) throw new Error("No HELIUS_RPC_URL configured");
  const res = await fetch(HELIUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json() as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export async function cmdBalance(ctx: CommandContext): Promise<void> {
  const address = ctx.args[0] || DEFAULT_WALLET;
  if (!address) { await ctx.reply("Usage: `/balance [address]`"); return; }
  await ctx.typing();
  try {
    const lamports = await rpcCall("getBalance", [address, { commitment: "confirmed" }]) as { value: number };
    const sol = (lamports.value ?? lamports) as number / 1e9;
    await ctx.reply(`💰 \`${address.slice(0, 8)}…${address.slice(-6)}\`\n*${sol.toFixed(4)} SOL*`);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function cmdTokens(ctx: CommandContext): Promise<void> {
  const address = ctx.args[0] || DEFAULT_WALLET;
  if (!address) { await ctx.reply("Usage: `/tokens [address]`"); return; }
  await ctx.typing();
  try {
    const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const resp = await rpcCall("getTokenAccountsByOwner", [
      address,
      { programId: TOKEN_PROGRAM },
      { encoding: "jsonParsed" },
    ]) as { value: Array<{ account: { data: { parsed: { info: { mint: string; tokenAmount: { uiAmount: number } } } } } }> };
    const accts = resp.value
      .map(a => ({
        mint: a.account.data.parsed.info.mint,
        amount: a.account.data.parsed.info.tokenAmount.uiAmount,
      }))
      .filter(t => t.amount > 0);
    if (!accts.length) { await ctx.reply("📦 No token accounts found."); return; }
    const lines = accts.slice(0, 15).map(t => `• \`${t.mint.slice(0, 12)}…\` — ${t.amount}`);
    if (accts.length > 15) lines.push(`…and ${accts.length - 15} more`);
    await ctx.reply(`📦 *Token Accounts (${accts.length}):*\n${lines.join("\n")}`);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function cmdTxs(ctx: CommandContext): Promise<void> {
  const address = ctx.args[0] || DEFAULT_WALLET;
  if (!address) { await ctx.reply("Usage: `/txs [address]`"); return; }
  await ctx.typing();
  try {
    const sigs = await rpcCall("getSignaturesForAddress", [address, { limit: 5 }]) as Array<{
      signature: string; blockTime: number | null; err: unknown;
    }>;
    if (!sigs.length) { await ctx.reply("No recent transactions found."); return; }
    const lines = sigs.map(t => {
      const time = t.blockTime ? new Date(t.blockTime * 1000).toISOString().slice(0, 19) : "?";
      const status = t.err ? "❌" : "✅";
      return `${status} \`${t.signature.slice(0, 16)}…\` — ${time}`;
    });
    await ctx.reply(`📜 *Recent Transactions:*\n${lines.join("\n")}`);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function cmdSlot(ctx: CommandContext): Promise<void> {
  await ctx.typing();
  try {
    const [slot, height] = await Promise.all([
      rpcCall("getSlot", []) as Promise<number>,
      rpcCall("getBlockHeight", []) as Promise<number>,
    ]);
    await ctx.reply(`⛓ *Slot:* ${slot.toLocaleString()}\n📏 *Block Height:* ${height.toLocaleString()}`);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function cmdAssets(ctx: CommandContext): Promise<void> {
  const address = ctx.args[0] || DEFAULT_WALLET;
  if (!address) { await ctx.reply("Usage: `/assets [address]`"); return; }
  if (!HELIUS_API_KEY && !HELIUS_RPC) { await ctx.reply("❌ No Helius API key configured."); return; }
  await ctx.typing();
  try {
    const url = HELIUS_RPC || `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: "assets", method: "getAssetsByOwner",
        params: { ownerAddress: address, page: 1, limit: 50 },
      }),
    });
    const data = await res.json() as { result?: { items?: Array<{ content?: { metadata?: { name?: string } }; id?: string }> } };
    const items = data?.result?.items ?? [];
    if (!items.length) { await ctx.reply("📦 No assets found (Helius DAS)."); return; }
    const lines = items.slice(0, 15).map(a => `• ${a.content?.metadata?.name ?? "Unknown"} — \`${a.id?.slice(0, 12)}…\``);
    await ctx.reply(`🗂 *Assets (${items.length}):*\n${lines.join("\n")}`);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── Birdeye Commands ────────────────────────────────────────────────────────

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY ?? "";

async function birdeyeGet(path: string): Promise<Record<string, unknown>> {
  if (!BIRDEYE_API_KEY) throw new Error("No BIRDEYE_API_KEY configured");
  const res = await fetch(`https://public-api.birdeye.so${path}`, {
    headers: { "X-API-KEY": BIRDEYE_API_KEY, "x-chain": "solana" },
  });
  if (!res.ok) throw new Error(`Birdeye ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function cmdBirdeyePrice(ctx: CommandContext): Promise<void> {
  const mint = ctx.args[0];
  if (!mint) { await ctx.reply("Usage: `/bprice <token_mint>`"); return; }
  await ctx.typing();
  try {
    const data = await birdeyeGet(`/defi/price?address=${mint}`);
    const inner = data.data as Record<string, unknown> | undefined;
    const price = inner?.value as number | undefined;
    await ctx.reply(price != null
      ? `💲 *Birdeye Price:* $${price}\nMint: \`${mint}\``
      : `No price data for \`${mint}\``);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function cmdBirdeyeSearch(ctx: CommandContext): Promise<void> {
  const query = ctx.args.join(" ");
  if (!query) { await ctx.reply("Usage: `/bsearch <token name or symbol>`"); return; }
  await ctx.typing();
  try {
    const data = await birdeyeGet(`/defi/v3/search?keyword=${encodeURIComponent(query)}&chain=solana&target=token`);
    const inner = data.data as { items?: Array<{ name: string; symbol: string; address: string }> } | undefined;
    const items = inner?.items ?? [];
    if (!items.length) { await ctx.reply(`No results for "${query}".`); return; }
    const lines = items.slice(0, 10).map(t => `• *${t.symbol}* — ${t.name}\n  \`${t.address}\``);
    await ctx.reply(`🔍 *Birdeye Search "${query}":*\n\n${lines.join("\n\n")}`);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function cmdBirdeyeOverview(ctx: CommandContext): Promise<void> {
  const mint = ctx.args[0];
  if (!mint) { await ctx.reply("Usage: `/btoken <token_mint>`"); return; }
  await ctx.typing();
  try {
    const data = await birdeyeGet(`/defi/token_overview?address=${mint}`);
    const t = data.data as Record<string, unknown> | undefined;
    if (!t) { await ctx.reply(`No data for \`${mint}\``); return; }
    await ctx.reply(
      `📊 *${t.symbol ?? "?"} — ${t.name ?? "Unknown"}*\n\n` +
      `Price: $${Number(t.price ?? 0).toFixed(8)}\n` +
      `MCap: $${Number(t.mc ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}\n` +
      `Vol 24h: $${(Number(t.v24hUSD ?? 0) / 1e6).toFixed(2)}M\n` +
      `Holders: ${Number(t.holder ?? 0).toLocaleString()}\n` +
      `Liquidity: $${Number(t.liquidity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}\n` +
      `Mint: \`${mint}\``
    );
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── Vault Commands ─────────────────────────────────────────────────────────────

/** Lazy singleton — created on first /vault open */
let _vault: SolanaVault | null = null;

async function openVaultForChat(ctx: CommandContext): Promise<SolanaVault | null> {
  if (_vault?.isUnlocked()) return _vault;

  const passphrase = process.env.VAULT_PASSPHRASE || process.env.SOLANA_PRIVATE_KEY;
  if (!passphrase) {
    await ctx.reply(
      "Set `VAULT_PASSPHRASE` in .env before using the vault.\n" +
      "This encrypts all stored secrets with AES-256-GCM."
    );
    return null;
  }

  try {
    _vault = await SolanaVault.open(passphrase);
  } catch {
    // No vault yet — create one
    _vault = await SolanaVault.create(passphrase);
    // Auto-import PRIVATE_KEY on first boot
    const pk = process.env.PRIVATE_KEY;
    if (pk) {
      await _vault.store("keypair", pk, "primary-trading");
    }
    const sk = process.env.SOLANA_PRIVATE_KEY;
    if (sk && sk !== pk) {
      await _vault.store("keypair", sk, "solana-main");
    }
  }
  return _vault;
}

/**
 * /vault — Encrypted secret vault (AES-256-GCM + scrypt)
 *
 * Subcommands:
 *   /vault              — List stored entries
 *   /vault store <label> <secret>  — Encrypt & store a secret (keypair / api_key)
 *   /vault get <id>     — Decrypt & show a secret (DM only!)
 *   /vault delete <id>  — Remove an entry
 *   /vault lock         — Lock the vault (wipes key from memory)
 */
export async function cmdVault(ctx: CommandContext): Promise<void> {
  const sub = ctx.args[0]?.toLowerCase();

  try {
    const vault = await openVaultForChat(ctx);
    if (!vault) return;

    // Default: list entries
    if (!sub || sub === "list" || sub === "status") {
      await ctx.typing();
      const entries = await vault.list();
      if (entries.length === 0) {
        await ctx.reply(
          "🔐 *Vault* — Empty\n\n" +
          "Store a secret:\n" +
          "`/vault store my-key <base58-private-key>`\n\n" +
          "_All secrets encrypted with AES-256-GCM at rest._"
        );
        return;
      }

      const lines = entries.map((e, i) => {
        const icon = e.type === "keypair" ? "🔑" : e.type === "api_key" ? "🗝" : "📦";
        const age = Math.round((Date.now() - e.createdAt) / 86400000);
        return `${i + 1}. ${icon} *${e.label ?? "unlabeled"}* (${e.type})\n   ID: \`${e.id}\` — ${age}d ago`;
      });

      await ctx.reply(`🔐 *Vault* — ${entries.length} entry(s)\n\n${lines.join("\n\n")}\n\n_/vault get <id> | /vault delete <id> | /vault lock_`);
      return;
    }

    // Store a new secret
    if (sub === "store" || sub === "add" || sub === "import") {
      const label = ctx.args[1];
      const secret = ctx.args[2];
      if (!label || !secret) {
        await ctx.reply("Usage: `/vault store <label> <secret>`\n\nSend in DM only!");
        return;
      }
      await ctx.typing();
      const isKey = secret.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(secret);
      const entryType = isKey ? "keypair" : "api_key";
      const id = await vault.store(entryType, secret, label);
      await ctx.reply(`✅ Stored as *${label}* (${entryType})\nID: \`${id}\`\n\n_Delete your message with the secret for safety._`);
      return;
    }

    // Retrieve a secret
    if (sub === "get" || sub === "reveal") {
      const id = ctx.args[1];
      if (!id) { await ctx.reply("Usage: `/vault get <entry-id>`"); return; }
      await ctx.typing();
      const value = await vault.retrieve(id);
      // Truncate display for safety
      const masked = `${value.slice(0, 6)}...${value.slice(-4)}`;
      await ctx.reply(`🔓 Entry \`${id}\`:\n\`${masked}\`\n\n_Value is masked in chat for safety._`);
      return;
    }

    // Delete an entry
    if (sub === "delete" || sub === "remove" || sub === "rm") {
      const id = ctx.args[1];
      if (!id) { await ctx.reply("Usage: `/vault delete <entry-id>`"); return; }
      const removed = await vault.remove(id);
      await ctx.reply(removed ? `🗑 Entry \`${id}\` removed.` : `Entry \`${id}\` not found.`);
      return;
    }

    // Lock the vault
    if (sub === "lock") {
      vault.lock();
      _vault = null;
      await ctx.reply("🔒 Vault locked. Master key wiped from memory.");
      return;
    }

    await ctx.reply(
      "Unknown vault command.\n\nAvailable: `list`, `store`, `get`, `delete`, `lock`"
    );
  } catch (e) {
    await ctx.reply(`❌ Vault error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── xAI / Grok Commands ─────────────────────────────────────────────────────

import {
  analyzeImage,
  generateImage,
  generateVideo,
  xSearch,
  webSearch,
  chatWithFile,
  grokChat,
} from "./xai.js";

/** /grok <prompt> — Chat with Grok */
export async function cmdGrok(ctx: CommandContext): Promise<void> {
  const prompt = ctx.args.join(" ");
  if (!prompt) { await ctx.reply("Usage: `/grok <question>`"); return; }
  await ctx.typing();
  try {
    const reply = await grokChat(prompt, "You are a helpful Solana trading assistant. Be concise.");
    await ctx.reply(reply.slice(0, 4000));
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** /xsearch <query> — Search X/Twitter in real-time */
export async function cmdXSearch(ctx: CommandContext): Promise<void> {
  const query = ctx.args.join(" ");
  if (!query) { await ctx.reply("Usage: `/xsearch <query>`\nExample: `/xsearch Solana memecoin alpha`"); return; }
  await ctx.typing();
  try {
    const result = await xSearch(query);
    await ctx.reply(`🔍 *X Search: "${query}"*\n\n${result.text.slice(0, 3800)}`);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** /wsearch <query> — Search the web in real-time */
export async function cmdWebSearch(ctx: CommandContext): Promise<void> {
  const query = ctx.args.join(" ");
  if (!query) { await ctx.reply("Usage: `/wsearch <query>`"); return; }
  await ctx.typing();
  try {
    const result = await webSearch(query);
    await ctx.reply(`🌐 *Web Search: "${query}"*\n\n${result.text.slice(0, 3800)}`);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** /imagine <prompt> — Generate images with Grok Imagine */
export async function cmdImagine(ctx: CommandContext): Promise<void> {
  const prompt = ctx.args.join(" ");
  if (!prompt) { await ctx.reply("Usage: `/imagine <description>`\nExample: `/imagine a solana logo in cyberpunk style`"); return; }
  await ctx.typing();
  try {
    const images = await generateImage(prompt, { resolution: "2k" });
    if (!images.length) { await ctx.reply("❌ No images generated."); return; }
    for (const [index, img] of images.entries()) {
      const caption = index === 0 ? `🎨 *Generated Image*\n\n_Prompt: ${prompt.slice(0, 900)}_` : undefined;
      if (ctx.sendPhoto) {
        await ctx.sendPhoto(img.url, caption);
      } else {
        await ctx.reply(`🎨 *Generated Image*\n\n${img.url}`);
      }
    }
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** /video <prompt> — Generate video with Grok Imagine Video */
export async function cmdVideo(ctx: CommandContext): Promise<void> {
  const prompt = ctx.args.join(" ");
  if (!prompt) { await ctx.reply("Usage: `/video <description>`\nExample: `/video a rocket launching from mars`"); return; }
  await ctx.reply(`🎬 *Generating video...* This may take up to 5 minutes.\n\n_Prompt: ${prompt}_`);
  try {
    const result = await generateVideo(prompt, { duration: 5, resolution: "720p", aspect_ratio: "16:9" });
    if (ctx.sendVideo) {
      await ctx.sendVideo(result.url, `🎬 *Video Ready*\n\n_Prompt: ${prompt.slice(0, 900)}_`);
    } else {
      await ctx.reply(`🎬 *Video Ready!*\n\n${result.url}`);
    }
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** /vision <question> — Analyze an image (reply to a photo or provide URL) */
export async function cmdVision(ctx: CommandContext): Promise<void> {
  // The image URL will be injected by the bot when handling photo messages
  // For URL mode: /vision <url> [question]
  const firstArg = ctx.args[0] ?? "";
  const isUrl = firstArg.startsWith("http://") || firstArg.startsWith("https://");

  if (!isUrl && !ctx.imageUrl) {
    await ctx.reply(
      "Usage:\n" +
      "• `/vision <image_url> [question]` — analyze image from URL\n" +
      "• Send a photo with caption `/vision [question]` — analyze attached photo"
    );
    return;
  }

  const imageUrl = isUrl ? firstArg : String(ctx.imageUrl ?? "");
  const question = isUrl ? ctx.args.slice(1).join(" ") || "Describe this image" : ctx.args.join(" ") || "Describe this image";

  await ctx.typing();
  try {
    const analysis = await analyzeImage(imageUrl, question);
    await ctx.reply(`👁 *Vision Analysis*\n\n${analysis.slice(0, 3800)}`);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** /file <url> <question> — Chat with a file (PDF, CSV, etc.) */
export async function cmdFile(ctx: CommandContext): Promise<void> {
  const fileUrl = ctx.args[0] ?? "";
  const question = ctx.args.slice(1).join(" ");
  if (!fileUrl.startsWith("http") || !question) {
    await ctx.reply("Usage: `/file <file_url> <question>`\nExample: `/file https://example.com/report.pdf What is the total revenue?`");
    return;
  }
  await ctx.typing();
  try {
    const result = await chatWithFile(question, fileUrl);
    await ctx.reply(`📄 *File Analysis*\n\n${result.slice(0, 3800)}`);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── Twitter/X Commands ──────────────────────────────────────────────────────

import {
  postTweet,
  deleteTweet,
  likeTweet,
  retweet,
  searchTweets,
  getUserTweets,
  startAutoTweet,
  stopAutoTweet,
  getAutoTweetStatus,
} from "./twitter.js";

/** /tweet <text> — Post a tweet */
export async function cmdTweet(ctx: CommandContext): Promise<void> {
  const text = ctx.args.join(" ");
  if (!text) { await ctx.reply("Usage: `/tweet <text>`\nExample: `/tweet Solana is pumping right now 🚀`"); return; }
  if (text.length > 280) { await ctx.reply(`❌ Tweet too long (${text.length}/280 chars)`); return; }
  await ctx.typing();
  try {
    const result = await postTweet(text);
    await ctx.reply(
      `✅ *Tweet Posted!*\n\n` +
      `"${result.text}"\n\n` +
      `[View on X](https://x.com/i/web/status/${result.id})`
    );
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** /reply <tweet_id> <text> — Reply to a tweet */
export async function cmdReply(ctx: CommandContext): Promise<void> {
  const tweetId = ctx.args[0];
  const text = ctx.args.slice(1).join(" ");
  if (!tweetId || !text) { await ctx.reply("Usage: `/reply <tweet_id> <text>`"); return; }
  await ctx.typing();
  try {
    const result = await postTweet(text, tweetId);
    await ctx.reply(
      `✅ *Reply Posted!*\n\n` +
      `"${result.text}"\n\n` +
      `[View](https://x.com/i/web/status/${result.id})`
    );
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** /deltweet <tweet_id> — Delete a tweet */
export async function cmdDelTweet(ctx: CommandContext): Promise<void> {
  const tweetId = ctx.args[0];
  if (!tweetId) { await ctx.reply("Usage: `/deltweet <tweet_id>`"); return; }
  await ctx.typing();
  try {
    await deleteTweet(tweetId);
    await ctx.reply(`🗑 Tweet \`${tweetId}\` deleted.`);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** /like <tweet_id> — Like a tweet */
export async function cmdLike(ctx: CommandContext): Promise<void> {
  const tweetId = ctx.args[0];
  if (!tweetId) { await ctx.reply("Usage: `/like <tweet_id>`"); return; }
  await ctx.typing();
  try {
    await likeTweet(tweetId);
    await ctx.reply(`❤️ Liked tweet \`${tweetId}\``);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** /rt <tweet_id> — Retweet */
export async function cmdRT(ctx: CommandContext): Promise<void> {
  const tweetId = ctx.args[0];
  if (!tweetId) { await ctx.reply("Usage: `/rt <tweet_id>`"); return; }
  await ctx.typing();
  try {
    await retweet(tweetId);
    await ctx.reply(`🔁 Retweeted \`${tweetId}\``);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** /tsearch <query> — Search recent tweets on X */
export async function cmdTSearch(ctx: CommandContext): Promise<void> {
  const query = ctx.args.join(" ");
  if (!query) { await ctx.reply("Usage: `/tsearch <query>`\nExample: `/tsearch Solana memecoin alpha`"); return; }
  await ctx.typing();
  try {
    const tweets = await searchTweets(query, 5);
    if (!tweets.length) { await ctx.reply(`No tweets found for "${query}".`); return; }
    const lines = tweets.map((t, i) => {
      const time = t.created_at ? new Date(t.created_at).toISOString().slice(0, 16) : "";
      return `${i + 1}. ${t.text.slice(0, 200)}\n   _${time}_ | ID: \`${t.id}\``;
    });
    await ctx.reply(`🐦 *X Search: "${query}"*\n\n${lines.join("\n\n")}`);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** /mytweets — Show recent tweets from our account */
export async function cmdMyTweets(ctx: CommandContext): Promise<void> {
  await ctx.typing();
  try {
    const tweets = await getUserTweets(undefined, 5);
    if (!tweets.length) { await ctx.reply("No recent tweets found."); return; }
    const lines = tweets.map((t, i) => {
      const time = t.created_at ? new Date(t.created_at).toISOString().slice(0, 16) : "";
      return `${i + 1}. ${t.text.slice(0, 200)}\n   _${time}_ | ID: \`${t.id}\``;
    });
    await ctx.reply(`📜 *Recent Tweets:*\n\n${lines.join("\n\n")}`);
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** /autotweet — Control the auto-tweet daemon */
export async function cmdAutoTweet(
  ctx: CommandContext,
  notifyChatId: number,
  sendNotification: (chatId: number, text: string) => Promise<void>,
): Promise<void> {
  const sub = ctx.args[0]?.toLowerCase();

  if (sub === "on" || sub === "start") {
    const intervalMin = parseInt(ctx.args[1] ?? "30", 10);
    const topics = ctx.args.slice(2);
    startAutoTweet(
      (tweet) => {
        sendNotification(notifyChatId,
          `🤖 *Auto-Tweet Posted:*\n\n"${tweet.text}"\n\n[View](https://x.com/i/web/status/${tweet.id})`
        ).catch(() => {});
      },
      (err) => {
        sendNotification(notifyChatId, `❌ Auto-tweet error: ${err.message}`).catch(() => {});
      },
      {
        intervalMs: intervalMin * 60 * 1000,
        ...(topics.length > 0 && { topics }),
      },
    );
    await ctx.reply(
      `🤖 *Auto-Tweet Daemon Started!*\n\n` +
      `Interval: every ${intervalMin} minutes\n` +
      `Topics: ${topics.length > 0 ? topics.join(", ") : "Solana, crypto alpha, DeFi"}\n` +
      `Max/day: 24\n\n` +
      `Tweets will be generated by Grok AI with live X context.\n` +
      `Use \`/autotweet off\` to stop.`
    );
    return;
  }

  if (sub === "off" || sub === "stop") {
    stopAutoTweet();
    await ctx.reply("⏹ *Auto-Tweet Daemon Stopped.*");
    return;
  }

  if (sub === "status") {
    const status = getAutoTweetStatus();
    const recent = status.recentTweets.map(t =>
      `• "${t.text.slice(0, 80)}…" — ${t.time.slice(11, 16)}`
    );
    await ctx.reply(
      `🤖 *Auto-Tweet Status*\n\n` +
      `Enabled: ${status.enabled ? "🟢 Yes" : "🔴 No"}\n` +
      `Interval: ${status.config.intervalMs / 60000}min\n` +
      `Topics: ${status.config.topics.join(", ")}\n` +
      `Today: ${status.todayCount}/${status.config.maxPerDay}\n` +
      `Style: ${status.config.style.slice(0, 60)}\n\n` +
      (recent.length ? `*Recent:*\n${recent.join("\n")}` : "_No tweets yet_")
    );
    return;
  }

  if (sub === "style") {
    const style = ctx.args.slice(1).join(" ");
    if (!style) { await ctx.reply("Usage: `/autotweet style <description>`\nExample: `/autotweet style degen alpha trader, bullish vibes`"); return; }
    const status = getAutoTweetStatus();
    status.config.style = style;
    await ctx.reply(`✅ Auto-tweet style updated to: "${style}"`);
    return;
  }

  if (sub === "topics") {
    const topics = ctx.args.slice(1);
    if (!topics.length) { await ctx.reply("Usage: `/autotweet topics Solana DeFi memes`"); return; }
    const status = getAutoTweetStatus();
    status.config.topics = topics;
    await ctx.reply(`✅ Auto-tweet topics: ${topics.join(", ")}`);
    return;
  }

  // Default: show help
  await ctx.reply(
    `🤖 *Auto-Tweet Daemon*\n\n` +
    `Uses Grok AI + live X search to generate and post tweets automatically.\n\n` +
    `\`/autotweet on [interval_min] [topics...]\`\n` +
    `\`/autotweet off\`\n` +
    `\`/autotweet status\`\n` +
    `\`/autotweet style <description>\`\n` +
    `\`/autotweet topics <topic1> <topic2> ...\`\n\n` +
    `Example: \`/autotweet on 20 Solana memecoins alpha\``
  );
}

/** /smarttweet <topic> — Generate a tweet with Grok + X context, preview before posting */
export async function cmdSmartTweet(ctx: CommandContext): Promise<void> {
  const topic = ctx.args.join(" ");
  if (!topic) { await ctx.reply("Usage: `/smarttweet <topic>`\nGenerates a tweet using Grok AI with live X context."); return; }
  await ctx.typing();
  try {
    const { grokChat, xSearch } = await import("./xai.js");

    // Fetch live context
    let context = "";
    try {
      const search = await xSearch(`${topic} latest`);
      context = search.text.slice(0, 800);
    } catch { /* optional */ }

    const prompt = [
      `Generate a single tweet (max 280 chars) about: ${topic}`,
      `Style: crypto thought leader, punchy, engaging, authentic.`,
      context ? `Live X context:\n${context}` : "",
      "Return ONLY the tweet text.",
    ].filter(Boolean).join("\n");

    const tweetText = (await grokChat(prompt)).replace(/^["']|["']$/g, "").slice(0, 280);

    await ctx.reply(
      `📝 *Smart Tweet Preview:*\n\n"${tweetText}"\n\n` +
      `(${tweetText.length}/280 chars)\n\n` +
      `Post it? Reply: \`/tweet ${tweetText}\``
    );
  } catch (e) {
    await ctx.reply(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

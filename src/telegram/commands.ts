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

import type { CommandContext, TelegramSession } from "./types.js";

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
    `*Claim: \\`claim_cashback\\` instruction*\n` +
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

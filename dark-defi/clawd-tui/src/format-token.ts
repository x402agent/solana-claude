// Pretty-printers for Birdeye responses, tuned for the Clawd TUI palette.
import type {
  TokenOverview,
  TrendingResponseItem,
  WalletPortfolioItem,
  SearchTokenItem,
} from './birdeye.js';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const ORANGE = '\x1b[38;5;215m';
const GRAY = '\x1b[90m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';

function compactUsd(n: number | undefined | null): string {
  if (n == null || !isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  if (abs >= 1) return `$${n.toFixed(2)}`;
  if (abs >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toPrecision(3)}`;
}

function compactNum(n: number | undefined | null): string {
  if (n == null || !isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pct(n: number | undefined | null): string {
  if (n == null || !isFinite(n)) return `${GRAY}—${RESET}`;
  const v = `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
  return `${n >= 0 ? GREEN : RED}${v}${RESET}`;
}

function shortAddr(a: string): string {
  if (!a) return '';
  return a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function row(label: string, value: string): string {
  return `  ${DIM}${label.padEnd(11)}${RESET}${value}`;
}

export function formatTokenOverview(t: TokenOverview): string {
  const lines: string[] = [];
  const symbol = t.symbol ? `${BOLD}${ORANGE}$${t.symbol}${RESET}` : '';
  const name = t.name ? ` ${DIM}${t.name}${RESET}` : '';
  lines.push(`\n  ${symbol}${name}  ${GRAY}${shortAddr(t.address)}${RESET}`);

  lines.push(row('price', `${BOLD}${compactUsd(t.price)}${RESET}  1h ${pct(t.priceChange1hPercent)}  24h ${pct(t.priceChange24hPercent)}`));
  lines.push(row('mcap', `${compactUsd(t.marketCap)}${t.fdv ? `   ${DIM}fdv${RESET} ${compactUsd(t.fdv)}` : ''}`));
  lines.push(row('liquidity', compactUsd(t.liquidity)));
  lines.push(row('volume 24h', `${compactUsd(t.v24hUSD)}   ${DIM}buy${RESET} ${GREEN}${compactUsd(t.vBuy24hUSD)}${RESET}  ${DIM}sell${RESET} ${RED}${compactUsd(t.vSell24hUSD)}${RESET}`));
  lines.push(row('holders', compactNum(t.holder)));
  lines.push(row('trades 24h', `${compactNum(t.trade24h)}   ${DIM}wallets${RESET} ${compactNum(t.uniqueWallet24h)}`));

  const ext = t.extensions ?? {};
  const links: string[] = [];
  if (ext.website) links.push(`${CYAN}site${RESET}`);
  if (ext.twitter) links.push(`${CYAN}x${RESET}`);
  if (ext.telegram) links.push(`${CYAN}tg${RESET}`);
  if (ext.discord) links.push(`${CYAN}discord${RESET}`);
  if (links.length) lines.push(row('links', links.join(' · ')));
  if (ext.description) {
    const d = String(ext.description).slice(0, 140);
    lines.push(`  ${DIM}${d}${RESET}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function formatTrending(items: TrendingResponseItem[], limit = 15): string {
  const lines: string[] = [];
  lines.push(`\n  ${BOLD}Trending Solana Tokens${RESET}  ${DIM}(via Birdeye)${RESET}`);
  lines.push(`  ${DIM}${'#'.padStart(3)}  ${'token'.padEnd(14)}  ${'price'.padStart(10)}  ${'24h'.padStart(8)}  ${'liq'.padStart(9)}  ${'vol24h'.padStart(9)}${RESET}`);
  for (const t of items.slice(0, limit)) {
    const sym = `$${t.symbol ?? ''}`.padEnd(14).slice(0, 14);
    const change = pct(t.price24hChangePercent).padStart(8 + 9);
    lines.push(
      `  ${YELLOW}${String(t.rank ?? '·').padStart(3)}${RESET}  ${ORANGE}${sym}${RESET}  ${compactUsd(t.price).padStart(10)}  ${change}  ${compactUsd(t.liquidity).padStart(9)}  ${compactUsd(t.volume24hUSD).padStart(9)}`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

export function formatSearch(items: SearchTokenItem[], keyword: string, limit = 10): string {
  const lines: string[] = [];
  lines.push(`\n  ${BOLD}Search:${RESET} ${ORANGE}${keyword}${RESET}  ${DIM}(via Birdeye)${RESET}`);
  if (items.length === 0) {
    lines.push(`  ${DIM}no results${RESET}\n`);
    return lines.join('\n');
  }
  for (const t of items.slice(0, limit)) {
    const head = `${ORANGE}$${t.symbol ?? ''}${RESET} ${DIM}${t.name ?? ''}${RESET}`;
    lines.push(`  ${head}  ${GRAY}${shortAddr(t.address)}${RESET}`);
    lines.push(
      `    ${compactUsd(t.price)}  ${pct(t.price_change_24h_percent)}  ${DIM}liq${RESET} ${compactUsd(t.liquidity)}  ${DIM}vol24h${RESET} ${compactUsd(t.volume_24h_usd)}`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

export interface PortfolioSummary {
  wallet: string;
  totalUsd: number;
  items: WalletPortfolioItem[];
}

export function summarizePortfolio(wallet: string, items: WalletPortfolioItem[]): PortfolioSummary {
  const filtered = items.filter((i) => (i.valueUsd ?? 0) > 0);
  filtered.sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
  const totalUsd = filtered.reduce((s, i) => s + (i.valueUsd ?? 0), 0);
  return { wallet, totalUsd, items: filtered };
}

export function formatPortfolio(summary: PortfolioSummary, limit = 20): string {
  const lines: string[] = [];
  lines.push(`\n  ${BOLD}Portfolio${RESET}  ${GRAY}${shortAddr(summary.wallet)}${RESET}`);
  lines.push(row('net worth', `${BOLD}${compactUsd(summary.totalUsd)}${RESET}  ${DIM}${summary.items.length} tokens${RESET}`));
  if (summary.items.length === 0) {
    lines.push(`  ${DIM}no tokens with USD value${RESET}\n`);
    return lines.join('\n');
  }
  lines.push(`  ${DIM}${'token'.padEnd(12)}  ${'amount'.padStart(12)}  ${'price'.padStart(10)}  ${'value'.padStart(11)}${RESET}`);
  for (const i of summary.items.slice(0, limit)) {
    const sym = `$${i.symbol ?? '?'}`.padEnd(12).slice(0, 12);
    lines.push(
      `  ${ORANGE}${sym}${RESET}  ${compactNum(i.uiAmount).padStart(12)}  ${compactUsd(i.priceUsd).padStart(10)}  ${BOLD}${compactUsd(i.valueUsd).padStart(11)}${RESET}`,
    );
  }
  if (summary.items.length > limit) {
    const rest = summary.items.slice(limit).reduce((s, i) => s + (i.valueUsd ?? 0), 0);
    lines.push(`  ${DIM}…${summary.items.length - limit} more  ·  ${compactUsd(rest)}${RESET}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function formatNetworth(summary: PortfolioSummary): string {
  const lines: string[] = [];
  lines.push(`\n  ${BOLD}Net Worth${RESET}  ${GRAY}${shortAddr(summary.wallet)}${RESET}`);
  lines.push(`  ${BOLD}${ORANGE}${compactUsd(summary.totalUsd)}${RESET}  ${DIM}across ${summary.items.length} tokens${RESET}`);
  const top = summary.items.slice(0, 5);
  for (const i of top) {
    const w = summary.totalUsd > 0 ? ((i.valueUsd ?? 0) / summary.totalUsd) * 100 : 0;
    lines.push(`  ${ORANGE}$${(i.symbol ?? '?').padEnd(8)}${RESET} ${compactUsd(i.valueUsd).padStart(10)}  ${DIM}${w.toFixed(1)}%${RESET}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function formatError(prefix: string, message: string): string {
  return `\n  ${RED}error${RESET} ${DIM}${prefix}: ${message}${RESET}\n`;
}

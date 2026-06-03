// TUI formatters for Helius DAS responses.
import type { DasAsset, DasAssetList, DasSignatures, RpcTokenAmountResult, RpcLargestAccountsResult } from './helius.js';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const ORANGE = '\x1b[38;5;215m';
const GRAY = '\x1b[90m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

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
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function shortAddr(a: string): string {
  if (!a) return '';
  return a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function row(label: string, value: string): string {
  return `  ${DIM}${label.padEnd(11)}${RESET}${value}`;
}

export function formatAsset(a: DasAsset): string {
  const lines: string[] = [];
  const meta = a.content?.metadata ?? {};
  const tok = a.token_info;
  const head = tok?.symbol
    ? `${BOLD}${ORANGE}$${tok.symbol}${RESET}`
    : meta.name
      ? `${BOLD}${ORANGE}${meta.name}${RESET}`
      : `${BOLD}${ORANGE}Asset${RESET}`;
  lines.push(`\n  ${head}  ${GRAY}${shortAddr(a.id)}${RESET}`);
  if (meta.name && tok?.symbol) lines.push(row('name', meta.name));
  if (a.interface) lines.push(row('type', a.interface));
  if (a.compression?.compressed) {
    lines.push(row('compressed', `${YELLOW}yes${RESET}  ${DIM}tree${RESET} ${GRAY}${shortAddr(a.compression.tree ?? '')}${RESET}`));
  }
  if (tok) {
    if (tok.supply != null && tok.decimals != null) {
      const adjusted = tok.supply / Math.pow(10, tok.decimals);
      lines.push(row('supply', `${compactNum(adjusted)}  ${DIM}dec${RESET} ${tok.decimals}`));
      if (tok.price_info?.price_per_token != null) {
        const px = tok.price_info.price_per_token;
        const mcap = px * adjusted;
        lines.push(row('price', `${compactUsd(px)}  ${DIM}mcap${RESET} ${BOLD}${compactUsd(mcap)}${RESET}`));
      }
    }
    if (tok.token_program) lines.push(row('program', GRAY + shortAddr(tok.token_program) + RESET));
  }
  if (a.ownership?.owner) lines.push(row('owner', GRAY + shortAddr(a.ownership.owner) + RESET));
  if (a.creators && a.creators.length) {
    const c = a.creators
      .slice(0, 3)
      .map((cr) => `${shortAddr(cr.address)}${cr.verified ? GREEN + '✓' + RESET : ''}`)
      .join(' · ');
    lines.push(row('creators', GRAY + c + RESET));
  }
  if (a.grouping && a.grouping.length) {
    const collection = a.grouping.find((g) => g.group_key === 'collection');
    if (collection) lines.push(row('collection', GRAY + shortAddr(collection.group_value) + RESET));
  }
  if (a.royalty?.percent != null) lines.push(row('royalty', `${a.royalty.percent.toFixed(2)}%`));
  if (meta.description) {
    const d = meta.description.replace(/\s+/g, ' ').slice(0, 140);
    lines.push(`  ${DIM}${d}${RESET}`);
  }
  if (a.content?.links?.image) lines.push(`  ${CYAN}image${RESET} ${DIM}${a.content.links.image}${RESET}`);
  lines.push('');
  return lines.join('\n');
}

export function formatAssetsByOwner(owner: string, list: DasAssetList, limit = 15): string {
  const lines: string[] = [];
  const total = list.total ?? list.items.length;
  const native = list.nativeBalance;
  lines.push(`\n  ${BOLD}DAS Assets${RESET}  ${GRAY}${shortAddr(owner)}${RESET}  ${DIM}(via Helius)${RESET}`);
  if (native?.lamports != null) {
    const sol = native.lamports / 1e9;
    const usd = native.total_price;
    lines.push(row('native', `${BOLD}${compactNum(sol)} SOL${RESET}${usd ? `  ${DIM}≈${RESET} ${compactUsd(usd)}` : ''}`));
  }
  lines.push(row('total', `${total} assets  ${DIM}page${RESET} ${list.page ?? 1}  ${DIM}limit${RESET} ${list.limit ?? list.items.length}`));

  const fungible = list.items.filter((i) => i.interface === 'FungibleToken' || i.interface === 'FungibleAsset' || i.token_info?.price_info);
  const nfts = list.items.filter((i) => !fungible.includes(i));

  if (fungible.length) {
    lines.push(`\n  ${BOLD}Fungible (${fungible.length})${RESET}`);
    lines.push(`  ${DIM}${'token'.padEnd(12)}  ${'amount'.padStart(14)}  ${'price'.padStart(10)}  ${'value'.padStart(11)}${RESET}`);
    const ranked = [...fungible].sort((a, b) => valueOf(b) - valueOf(a));
    for (const a of ranked.slice(0, limit)) {
      const sym = `$${a.token_info?.symbol ?? '?'}`.padEnd(12).slice(0, 12);
      const tok = a.token_info ?? {};
      const amount = tok.balance != null && tok.decimals != null ? tok.balance / Math.pow(10, tok.decimals) : tok.balance ?? null;
      const px = tok.price_info?.price_per_token;
      const value = px != null && amount != null ? px * amount : tok.price_info?.total_price;
      lines.push(
        `  ${ORANGE}${sym}${RESET}  ${compactNum(amount).padStart(14)}  ${compactUsd(px).padStart(10)}  ${BOLD}${compactUsd(value).padStart(11)}${RESET}`,
      );
    }
    if (ranked.length > limit) lines.push(`  ${DIM}…${ranked.length - limit} more${RESET}`);
  }

  if (nfts.length) {
    lines.push(`\n  ${BOLD}NFTs / Assets (${nfts.length})${RESET}`);
    for (const a of nfts.slice(0, limit)) {
      const name = a.content?.metadata?.name ?? '(unnamed)';
      const tag = a.compression?.compressed ? `${YELLOW}cnft${RESET}` : `${CYAN}nft${RESET}`;
      lines.push(`  ${tag}  ${name.padEnd(28).slice(0, 28)}  ${GRAY}${shortAddr(a.id)}${RESET}`);
    }
    if (nfts.length > limit) lines.push(`  ${DIM}…${nfts.length - limit} more${RESET}`);
  }
  lines.push('');
  return lines.join('\n');
}

function valueOf(a: DasAsset): number {
  const tok = a.token_info;
  if (!tok) return 0;
  const px = tok.price_info?.price_per_token;
  if (px == null) return tok.price_info?.total_price ?? 0;
  const amount = tok.balance != null && tok.decimals != null ? tok.balance / Math.pow(10, tok.decimals) : tok.balance ?? 0;
  return px * (amount ?? 0);
}

export function formatNftsByOwner(owner: string, list: DasAssetList, limit = 25): string {
  const lines: string[] = [];
  lines.push(`\n  ${BOLD}NFTs${RESET}  ${GRAY}${shortAddr(owner)}${RESET}  ${DIM}(via Helius)${RESET}`);
  lines.push(row('total', `${list.total ?? list.items.length}  ${DIM}page${RESET} ${list.page ?? 1}`));
  for (const a of list.items.slice(0, limit)) {
    const name = a.content?.metadata?.name ?? '(unnamed)';
    const tag = a.compression?.compressed ? `${YELLOW}cnft${RESET}` : `${CYAN}nft ${RESET}`;
    const collection = a.grouping?.find((g) => g.group_key === 'collection')?.group_value;
    const tail = collection ? `  ${DIM}coll${RESET} ${GRAY}${shortAddr(collection)}${RESET}` : '';
    lines.push(`  ${tag}  ${name.padEnd(30).slice(0, 30)}  ${GRAY}${shortAddr(a.id)}${RESET}${tail}`);
  }
  if (list.items.length > limit) lines.push(`  ${DIM}…${list.items.length - limit} more${RESET}`);
  lines.push('');
  return lines.join('\n');
}

export function formatSignatures(id: string, sigs: DasSignatures, limit = 10): string {
  const lines: string[] = [];
  lines.push(`\n  ${BOLD}Asset Signatures${RESET}  ${GRAY}${shortAddr(id)}${RESET}  ${DIM}(via Helius)${RESET}`);
  if (!sigs.items?.length) {
    lines.push(`  ${DIM}no transactions${RESET}\n`);
    return lines.join('\n');
  }
  for (const [sig, label] of sigs.items.slice(0, limit)) {
    lines.push(`  ${YELLOW}${(label ?? '').padEnd(14).slice(0, 14)}${RESET}  ${GRAY}${shortAddr(sig)}${RESET}`);
  }
  if (sigs.items.length > limit) lines.push(`  ${DIM}…${sigs.items.length - limit} more${RESET}`);
  lines.push('');
  return lines.join('\n');
}

export function formatHolders(mint: string, supply: RpcTokenAmountResult, accounts: RpcLargestAccountsResult, limit = 10): string {
  const lines: string[] = [];
  const total = supply.value.uiAmount;
  lines.push(`\n  ${BOLD}Holders${RESET}  ${GRAY}${shortAddr(mint)}${RESET}  ${DIM}(via Helius)${RESET}`);
  lines.push(row('supply', `${compactNum(total)}  ${DIM}dec${RESET} ${supply.value.decimals}`));
  lines.push(`  ${DIM}${'#'.padStart(3)}  ${'address'.padEnd(14)}  ${'balance'.padStart(16)}  ${'%'.padStart(7)}${RESET}`);
  for (let i = 0; i < Math.min(limit, accounts.value.length); i++) {
    const h = accounts.value[i];
    const pct = total > 0 ? (h.uiAmount / total) * 100 : 0;
    const color = pct > 10 ? RED : pct > 1 ? YELLOW : GREEN;
    lines.push(
      `  ${YELLOW}${String(i + 1).padStart(3)}${RESET}  ${GRAY}${shortAddr(h.address).padEnd(14)}${RESET}  ${compactNum(h.uiAmount).padStart(16)}  ${color}${pct.toFixed(2)}%${RESET}`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

export function formatBalance(address: string, lamports: number): string {
  const sol = lamports / 1e9;
  return `\n  ${BOLD}SOL Balance${RESET}  ${GRAY}${shortAddr(address)}${RESET}\n  ${BOLD}${ORANGE}${compactNum(sol)} SOL${RESET}  ${DIM}(${lamports.toLocaleString()} lamports)${RESET}\n`;
}

export function formatError(prefix: string, message: string): string {
  return `\n  ${RED}error${RESET} ${DIM}${prefix}: ${message}${RESET}\n`;
}

/**
 * src/buddy/index.ts
 *
 * Blockchain Buddies — Solana-native trading companions.
 *
 * Each buddy has a unique wallet, personality, species, and trading style.
 * Inspired by the blockchain-buddies-demo.ts example.
 */

import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

// ── Species ────────────────────────────────────────────────────────────────

export type BlockchainSpecies =
  | "soldog"
  | "bonk"
  | "wif"
  | "jupiter"
  | "whale"
  | "sniper"
  | "degen"
  | "crab"
  | "lobster"
  | "shrimp";

export const BLOCKCHAIN_SPECIES: BlockchainSpecies[] = [
  "soldog",
  "bonk",
  "wif",
  "jupiter",
  "whale",
  "sniper",
  "degen",
  "crab",
  "lobster",
  "shrimp",
];

export const SPECIES_DISPLAY_NAMES: Record<BlockchainSpecies, string> = {
  soldog: "🐕 SolDog",
  bonk: "🪓 BONK Hitter",
  wif: "🐶 WIF Bro",
  jupiter: "🪐 Jupiter Trader",
  whale: "🐋 Whale",
  sniper: "🎯 Sniper",
  degen: "🎰 Degen",
  crab: "🦀 Crab",
  lobster: "🦞 Lobster",
  shrimp: "🦐 Shrimp",
};

// ── Personalities & trading styles ─────────────────────────────────────────

type Personality = "aggressive" | "conservative" | "chaotic" | "patient" | "strategic";
type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface WalletState {
  address: string;
  solBalance: number;
  isSimulated: boolean;
  tradeCount: number;
  winRate: number;
  totalPnlUsd: number;
}

interface BuddyStats {
  speed: number;
  luck: number;
  wisdom: number;
  aggression: number;
  diamond_hands: number;
}

export interface BlockchainBuddy {
  id: string;
  name: string;
  species: BlockchainSpecies;
  rarity: Rarity;
  level: number;
  shiny: boolean;
  personality: Personality;
  tradingStyle: string;
  catchphrase: string;
  eye: string;
  hat: string;
  stats: BuddyStats;
  wallet: WalletState;
  portfolio: Map<string, { amount: number; avgPrice: number }>;
  createdAt: number;
}

// ── Name generation ─────────────────────────────────────────────────────────

const PREFIXES = ["Alpha", "Chad", "Degen", "Diamond", "Diamond-Paw", "Fren", "Gigabrain", "Moon", "Sigma", "Ultra"];
const SUFFIXES: Record<BlockchainSpecies, string[]> = {
  soldog: ["Rex", "Bark", "Woof", "Bork", "Paws"],
  bonk: ["Slapper", "Hammer", "Crusher", "Bonker", "Thwacker"],
  wif: ["Hat", "Beret", "Cap", "Lid", "Crown"],
  jupiter: ["Orb", "Swap", "Route", "Agg", "Prime"],
  whale: ["Maxi", "Dump", "Accumulator", "Hodler", "Pod"],
  sniper: ["Eye", "Shot", "Scope", "Trigger", "Aim"],
  degen: ["Ape", "Chad", "Yolo", "Rekt", "Giga"],
  crab: ["Claw", "Shell", "Sideways", "Lateral", "Pinch"],
  lobster: ["Leviathan", "Molt", "Claw", "Reef", "Deep"],
  shrimp: ["Baby", "Nano", "Tiny", "Micro", "Mini"],
};

function generateName(species: BlockchainSpecies): string {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)]!;
  const suffixes = SUFFIXES[species];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]!;
  return `${prefix} ${suffix}`;
}

// ── Personality / trading style assignment ──────────────────────────────────

const SPECIES_PERSONALITY: Record<BlockchainSpecies, Personality> = {
  soldog: "chaotic",
  bonk: "aggressive",
  wif: "chaotic",
  jupiter: "strategic",
  whale: "patient",
  sniper: "strategic",
  degen: "aggressive",
  crab: "conservative",
  lobster: "patient",
  shrimp: "conservative",
};

const TRADING_STYLES: Record<BlockchainSpecies, string> = {
  soldog: "BONK or REKT — buys anything with dog art",
  bonk: "Smashes into new launches, exits fast",
  wif: "Vibes-based momentum — follows Twitter alpha",
  jupiter: "Routes through aggregators for best price",
  whale: "Accumulates quietly, dumps on retail",
  sniper: "Watches launch timers, front-runs listings",
  degen: "100x or bust — full port into memes",
  crab: "Ranges sideways, sells pumps, buys dips",
  lobster: "Depth-aware survival trading — OODA loop",
  shrimp: "Micro-positions, strict stop losses",
};

const CATCHPHRASES: Record<BlockchainSpecies, string> = {
  soldog: "wen moon ser? 🐕",
  bonk: "BONK BONK BONK 🪓",
  wif: "hat on, bags packed 🐶",
  jupiter: "best route, always 🪐",
  whale: "accumulate in silence 🐋",
  sniper: "patience is the edge 🎯",
  degen: "ngmi if you dont ape 🎰",
  crab: "slow and steady wins 🦀",
  lobster: "the shell molts, laws do not 🦞",
  shrimp: "small but scrappy 🦐",
};

// ── Rarity rolling ─────────────────────────────────────────────────────────

function rollRarity(): Rarity {
  const r = Math.random();
  if (r < 0.01) return "legendary";
  if (r < 0.05) return "epic";
  if (r < 0.20) return "rare";
  if (r < 0.50) return "uncommon";
  return "common";
}

const RARITY_STAT_BONUS: Record<Rarity, number> = {
  common: 0,
  uncommon: 5,
  rare: 10,
  epic: 20,
  legendary: 30,
};

// ── ASCII sprites ───────────────────────────────────────────────────────────

const SPRITE_EYES: Record<BlockchainSpecies, string> = {
  soldog: "^.^",
  bonk: ">.<",
  wif: "o.o",
  jupiter: "*.* ",
  whale: "•.•",
  sniper: "-.-",
  degen: "x.x",
  crab: "o.O",
  lobster: ">.>",
  shrimp: "^.^",
};

const SPRITES: Record<BlockchainSpecies, string[]> = {
  soldog: [
    "  /\\_/\\  ",
    " ( ^.^ ) ",
    " / >🐾< \\",
    "(_/   \\_)",
  ],
  bonk: [
    "  (╯°□°）╯",
    "   ┻━┻   ",
    "  🪓BONK  ",
    "          ",
  ],
  wif: [
    "  /\\_/\\  ",
    " ( o.o ) ",
    " ( >🎩< )",
    "(_/   \\_)",
  ],
  jupiter: [
    "   🪐🌀   ",
    " ≋ SWAP ≋ ",
    "  ↗️  ↘️  ",
    "  ↙️  ↗️  ",
  ],
  whale: [
    "   🐋     ",
    "  \\___/  ",
    " /  ·  \\ ",
    "/____|___\\",
  ],
  sniper: [
    "  👁️ 🔭  ",
    " [  🎯  ]",
    "  |||||  ",
    "  _____  ",
  ],
  degen: [
    "  🎰🎲🎰  ",
    " (x . x) ",
    "  YOLO!  ",
    "  100x🚀  ",
  ],
  crab: [
    " /\\   /\\ ",
    "(  🦀  ) ",
    " \\____/ ",
    "  ||||  ",
  ],
  lobster: [
    " /\\_🦞_/\\",
    "( > . <) ",
    " \\|===|/ ",
    "  |   |  ",
  ],
  shrimp: [
    "   🦐     ",
    " (~·~)   ",
    "  ||||   ",
    "  ~~~~   ",
  ],
};

export function renderBlockchainSprite(
  species: BlockchainSpecies,
  _eye: string,
  _hat: string,
  _frame: number,
): string[] {
  return SPRITES[species] ?? SPRITES.lobster;
}

// ── Factory ─────────────────────────────────────────────────────────────────

interface CreateBuddyOpts {
  initialSolBalance?: number;
  name?: string;
  rarity?: Rarity;
}

export function createBlockchainBuddy(
  species: BlockchainSpecies,
  opts: CreateBuddyOpts = {},
): BlockchainBuddy {
  const kp = Keypair.generate();
  const rarity = opts.rarity ?? rollRarity();
  const bonus = RARITY_STAT_BONUS[rarity];

  const rand = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const stats: BuddyStats = {
    speed: Math.min(100, rand(20, 80) + bonus),
    luck: Math.min(100, rand(10, 90) + bonus),
    wisdom: Math.min(100, rand(20, 80) + bonus),
    aggression: Math.min(100, rand(10, 90) + bonus),
    diamond_hands: Math.min(100, rand(10, 90) + bonus),
  };

  return {
    id: `buddy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: opts.name ?? generateName(species),
    species,
    rarity,
    level: 1,
    shiny: Math.random() < 0.05,
    personality: SPECIES_PERSONALITY[species],
    tradingStyle: TRADING_STYLES[species],
    catchphrase: CATCHPHRASES[species],
    eye: SPRITE_EYES[species],
    hat: species === "wif" ? "🎩" : "",
    stats,
    wallet: {
      address: bs58.encode(kp.publicKey.toBytes()),
      solBalance: opts.initialSolBalance ?? 1.0,
      isSimulated: true,
      tradeCount: 0,
      winRate: 0,
      totalPnlUsd: 0,
    },
    portfolio: new Map(),
    createdAt: Date.now(),
  };
}

// ── Trade simulation ────────────────────────────────────────────────────────

export interface TradeInput {
  type: "buy" | "sell";
  tokenMint: string;
  tokenSymbol: string;
  amountSol: number;
  amountTokens: number;
  priceUsd: number;
}

export interface TradeResult {
  success: boolean;
  pnlUsd?: number;
  reason?: string;
}

export function simulateTrade(buddy: BlockchainBuddy, trade: TradeInput): TradeResult {
  if (trade.type === "buy") {
    if (buddy.wallet.solBalance < trade.amountSol) {
      return { success: false, reason: "Insufficient SOL balance" };
    }
    buddy.wallet.solBalance -= trade.amountSol;
    buddy.wallet.tradeCount++;

    const existing = buddy.portfolio.get(trade.tokenMint);
    if (existing) {
      const totalTokens = existing.amount + trade.amountTokens;
      const totalCost = existing.amount * existing.avgPrice + trade.amountTokens * trade.priceUsd;
      buddy.portfolio.set(trade.tokenMint, {
        amount: totalTokens,
        avgPrice: totalCost / totalTokens,
      });
    } else {
      buddy.portfolio.set(trade.tokenMint, {
        amount: trade.amountTokens,
        avgPrice: trade.priceUsd,
      });
    }

    return { success: true };
  }

  if (trade.type === "sell") {
    const held = buddy.portfolio.get(trade.tokenMint);
    if (!held || held.amount < trade.amountTokens) {
      return { success: false, reason: "Insufficient token balance" };
    }

    const costBasis = held.avgPrice * trade.amountTokens;
    const proceeds = trade.priceUsd * trade.amountTokens;
    const pnlUsd = proceeds - costBasis;

    held.amount -= trade.amountTokens;
    if (held.amount <= 0) buddy.portfolio.delete(trade.tokenMint);

    buddy.wallet.solBalance += trade.amountSol;
    buddy.wallet.totalPnlUsd += pnlUsd;
    buddy.wallet.tradeCount++;

    const wins = Math.round(buddy.wallet.winRate * (buddy.wallet.tradeCount - 1));
    const newWins = wins + (pnlUsd >= 0 ? 1 : 0);
    buddy.wallet.winRate = newWins / buddy.wallet.tradeCount;

    return { success: true, pnlUsd };
  }

  return { success: false, reason: "Unknown trade type" };
}

// ── Display helpers ─────────────────────────────────────────────────────────

const RARITY_COLORS: Record<Rarity, string> = {
  common: "\x1b[37m",
  uncommon: "\x1b[32m",
  rare: "\x1b[34m",
  epic: "\x1b[35m",
  legendary: "\x1b[33m",
};
const RESET = "\x1b[0m";

export function formatBuddyCard(buddy: BlockchainBuddy): string {
  const color = RARITY_COLORS[buddy.rarity];
  const shiny = buddy.shiny ? " ✨" : "";
  const lines = [
    `${color}╔══════════════════════════════════════╗${RESET}`,
    `${color}║${RESET} ${SPECIES_DISPLAY_NAMES[buddy.species].padEnd(36)} ${color}║${RESET}`,
    `${color}║${RESET} ${("\"" + buddy.name + "\"").padEnd(36)} ${color}║${RESET}`,
    `${color}║${RESET} Rarity: ${(buddy.rarity.toUpperCase() + shiny).padEnd(28)} ${color}║${RESET}`,
    `${color}║${RESET} Level:  ${String(buddy.level).padEnd(28)} ${color}║${RESET}`,
    `${color}║${RESET} Style:  ${buddy.tradingStyle.slice(0, 28).padEnd(28)} ${color}║${RESET}`,
    `${color}║${RESET} Quote:  ${buddy.catchphrase.slice(0, 28).padEnd(28)} ${color}║${RESET}`,
    `${color}╚══════════════════════════════════════╝${RESET}`,
  ];
  return lines.join("\n");
}

export function formatBuddyCompact(buddy: BlockchainBuddy): string {
  const pnl =
    buddy.wallet.totalPnlUsd >= 0
      ? `+$${buddy.wallet.totalPnlUsd.toFixed(2)}`
      : `-$${Math.abs(buddy.wallet.totalPnlUsd).toFixed(2)}`;
  return (
    `${SPECIES_DISPLAY_NAMES[buddy.species]} "${buddy.name}" ` +
    `[${buddy.rarity}] ` +
    `${buddy.wallet.solBalance.toFixed(3)} SOL | PnL: ${pnl}`
  );
}

// ── BuddyCollection ────────────────────────────────────────────────────────

export class BuddyCollection {
  private buddies: BlockchainBuddy[] = [];

  add(buddy: BlockchainBuddy): void {
    this.buddies.push(buddy);
  }

  remove(id: string): void {
    this.buddies = this.buddies.filter((b) => b.id !== id);
  }

  get(id: string): BlockchainBuddy | undefined {
    return this.buddies.find((b) => b.id === id);
  }

  getAll(): BlockchainBuddy[] {
    return [...this.buddies];
  }

  getTopTraders(n = 5): BlockchainBuddy[] {
    return [...this.buddies]
      .sort((a, b) => b.wallet.totalPnlUsd - a.wallet.totalPnlUsd)
      .slice(0, n);
  }

  getBySpecies(species: BlockchainSpecies): BlockchainBuddy[] {
    return this.buddies.filter((b) => b.species === species);
  }

  getTotalPnl(): number {
    return this.buddies.reduce((sum, b) => sum + b.wallet.totalPnlUsd, 0);
  }

  getTotalSol(): number {
    return this.buddies.reduce((sum, b) => sum + b.wallet.solBalance, 0);
  }

  size(): number {
    return this.buddies.length;
  }
}

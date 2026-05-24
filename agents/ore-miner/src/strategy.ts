/**
 * strategy.ts — ORE mining strategy analysis.
 *
 * The ORE game has 25 squares. Each round, one winning square is chosen by
 * on-chain RNG (XOR of slot hash chunks). Miners who deployed SOL to the
 * winning square share the losing squares' deployments proportionally.
 *
 * EV per square = (total_deployed_on_losing_squares / deployed_on_winning_square)
 * weighted by each square's share of the winning square's deployment.
 *
 * This module computes strategy analytics to help Claude make decisions.
 */

import type { RoundState } from './rpc.js';
import { solAmount } from './constants.js';

export interface SquareAnalysis {
  index: number;
  deployed: bigint;         // SOL in lamports on this square
  miners: bigint;           // number of miners on this square
  shareOfTotal: number;     // fraction of total deployed
  expectedValue: number;    // EV multiplier if this is the winning square
  isUnderbet: boolean;      // true if EV > 1 (underrepresented)
  label: string;
}

export interface BoardAnalysis {
  totalDeployed: bigint;
  totalMiners: bigint;
  squares: SquareAnalysis[];
  topSquares: number[];     // indices sorted by EV descending
  bottomSquares: number[];  // indices with zero deployment
  avgDeployedPerSquare: bigint;
  roundProgress: number;    // 0..1 fraction of round elapsed
  slotsRemaining: bigint;
  secondsRemaining: number;
  summary: string;
}

export function analyzeBoard(round: RoundState, currentSlot: bigint): BoardAnalysis {
  const total = round.totalDeployed;

  const squares: SquareAnalysis[] = round.deployed.map((dep, i) => {
    const others = total - dep;
    const miners = round.count[i] ?? 0n;

    // EV = how much you'd win per lamport deployed if this square wins
    // = (sum of other squares) / dep    (simplified, ignores vault cut)
    let ev = 1.0;
    if (dep > 0n && total > 0n) {
      ev = Number(others) / Number(dep);
    } else if (dep === 0n) {
      ev = 99.0; // effectively infinite — free square
    }

    const shareOfTotal = total > 0n ? Number(dep) / Number(total) : 0;

    return {
      index: i,
      deployed: dep,
      miners,
      shareOfTotal,
      expectedValue: ev,
      isUnderbet: ev > 1.0,
      label: dep === 0n
        ? `sq${i}: EMPTY (EV=∞)`
        : `sq${i}: ${solAmount(dep)} SOL / ${miners} miners (EV=${ev.toFixed(2)}x)`,
    };
  });

  const topSquares = squares
    .slice()
    .sort((a, b) => b.expectedValue - a.expectedValue)
    .map(s => s.index)
    .slice(0, 5);

  const bottomSquares = squares
    .filter(s => s.deployed === 0n)
    .map(s => s.index);

  const avgDeployedPerSquare = total > 0n ? total / 25n : 0n;

  // Slot timing (~400ms per slot on Solana)
  const slotsRemaining = round.expiresAt > currentSlot
    ? round.expiresAt - currentSlot
    : 0n;
  const secondsRemaining = Number(slotsRemaining) * 0.4;
  const roundDuration = round.expiresAt - (round.expiresAt - slotsRemaining > 0n ? 0n : round.expiresAt);
  const roundProgress = roundDuration > 0n
    ? 1 - Number(slotsRemaining) / Number(round.expiresAt)
    : 1.0;

  const emptyCount = bottomSquares.length;
  const summary = [
    `Round ${round.id}: ${secondsRemaining.toFixed(0)}s remaining (${slotsRemaining} slots)`,
    `Total deployed: ${solAmount(total)} SOL across ${round.totalMiners} miners`,
    `Empty squares: ${emptyCount}/25 | Top 5 EV squares: [${topSquares.join(', ')}]`,
    `ORE motherlode: ${round.motherlode} grams`,
    round.slotHashRevealed
      ? `ROUND SETTLED — winning square: ${round.winningSquare}`
      : 'Round still open',
  ].join('\n');

  return {
    totalDeployed: total,
    totalMiners: round.totalMiners,
    squares,
    topSquares,
    bottomSquares,
    avgDeployedPerSquare,
    roundProgress,
    slotsRemaining,
    secondsRemaining,
    summary,
  };
}

export function formatBoardForClaude(analysis: BoardAnalysis): string {
  const lines = [
    '=== ORE BOARD ANALYSIS ===',
    analysis.summary,
    '',
    '--- Square Detail (sorted by EV) ---',
  ];

  const sorted = [...analysis.squares].sort((a, b) => b.expectedValue - a.expectedValue);
  for (const sq of sorted.slice(0, 10)) {
    lines.push(`  ${sq.label}`);
  }
  if (sorted.length > 10) {
    lines.push(`  ... ${sorted.length - 10} more squares`);
  }

  lines.push('', `Top EV squares: [${analysis.topSquares.join(', ')}]`);
  lines.push(`Empty squares: [${analysis.bottomSquares.join(', ')}]`);

  return lines.join('\n');
}

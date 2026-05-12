/**
 * ooda/state.ts — Position book + paper PnL accounting
 *
 * This is the authoritative in-memory state for one loop run.
 * Persistence lives in journal/ticks.jsonl (append-only).
 * State is reconstructed from scratch on restart by replaying the journal.
 */

export type Side = 'long' | 'short';

export interface Position {
  id: string;
  side: Side;
  /** Entry price in lamports-per-unit */
  entry_price: number;
  /** Size in lamports */
  size_lamports: number;
  /** Tick number when opened */
  opened_at_tick: number;
  /** ISO timestamp when opened */
  opened_at: string;
}

export interface Book {
  positions: Position[];
  cash_lamports: number;
}

export interface Candle {
  t: string;   // ISO-8601
  o: number;   // open price (lamports per unit, normalised)
  h: number;
  l: number;
  c: number;   // close price
  v: number;   // volume
}

export interface State {
  tick: number;
  book: Book;
  candles: Candle[];
  consecutive_losses: number;
  total_pnl_lamports: number;
  total_trades: number;
}

export function createState(startingCash = 10_000_000): State {
  return {
    tick: 0,
    book: { positions: [], cash_lamports: startingCash },
    candles: [],
    consecutive_losses: 0,
    total_pnl_lamports: 0,
    total_trades: 0,
  };
}

export function openPosition(state: State, side: Side, size_lamports: number, currentPrice: number): Position {
  const id = `pos-${state.tick}-${Date.now()}`;
  const pos: Position = {
    id,
    side,
    entry_price: currentPrice,
    size_lamports,
    opened_at_tick: state.tick,
    opened_at: new Date().toISOString(),
  };
  state.book.positions.push(pos);
  state.book.cash_lamports -= size_lamports;
  return pos;
}

export function closePosition(state: State, positionId: string, currentPrice: number): number {
  const idx = state.book.positions.findIndex(p => p.id === positionId);
  if (idx === -1) throw new Error(`position ${positionId} not found`);
  const pos = state.book.positions[idx]!;

  // PnL: for long, profit if price rose; for short, profit if price fell
  const priceDelta = currentPrice - pos.entry_price;
  const units = pos.size_lamports / pos.entry_price;
  const rawPnl = pos.side === 'long'
    ? units * priceDelta
    : units * -priceDelta;
  const pnl = Math.round(rawPnl);

  state.book.positions.splice(idx, 1);
  state.book.cash_lamports += pos.size_lamports + pnl;
  state.total_pnl_lamports += pnl;
  state.total_trades += 1;

  if (pnl < 0) {
    state.consecutive_losses += 1;
  } else {
    state.consecutive_losses = 0;
  }

  return pnl;
}

/** Unrealised PnL for open positions at current price */
export function unrealisedPnl(state: State, currentPrice: number): number {
  return state.book.positions.reduce((sum, pos) => {
    const units = pos.size_lamports / pos.entry_price;
    const delta = currentPrice - pos.entry_price;
    const pnl = pos.side === 'long' ? units * delta : units * -delta;
    return sum + pnl;
  }, 0);
}

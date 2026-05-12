import chalk from 'chalk';
import type {
  AgentMessage,
  DashboardState,
  FeedItem,
  HeatCell,
  LogEntry,
  OrderBookLevel,
  TrendingToken,
  ViewMode,
} from './state.js';

const CLEAR_SCREEN = '\x1b[2J\x1b[H';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const SPARK = '▁▂▃▄▅▆▇█';
const LOBSTER = chalk.hex('#ff3e3e');
const CYAN = chalk.hex('#00e5ff');
const MAGENTA = chalk.hex('#ff00ff');
const GREEN = chalk.hex('#00ffaa');
const VIOLET = chalk.hex('#a040ff');
const DIM = chalk.hex('#8a8a8a');
const PANEL = chalk.hex('#5e1d1d');
const WHITE = chalk.hex('#f5f5f5');

export function enableRawMode(): void {
  process.stdout.write(HIDE_CURSOR);
  if (process.stdin.setRawMode) process.stdin.setRawMode(true);
}

export function disableRawMode(): void {
  process.stdout.write(SHOW_CURSOR);
  if (process.stdin.setRawMode) process.stdin.setRawMode(false);
}

function visLen(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function padRight(s: string, width: number): string {
  return s + ' '.repeat(Math.max(0, width - visLen(s)));
}

function truncate(s: string, width: number): string {
  return s.length > width ? `${s.slice(0, width - 1)}…` : s;
}

function box(title: string, width: number, body: string[]): string[] {
  const top = `┌${'─'.repeat(Math.max(0, width - 2))}┐`;
  const bottom = `└${'─'.repeat(Math.max(0, width - 2))}┘`;
  const lines = [PANEL(top)];
  lines.push(PANEL('│') + padRight(` ${LOBSTER.bold(title)}`, width - 2) + PANEL('│'));
  for (const row of body) {
    lines.push(PANEL('│') + padRight(` ${row}`, width - 2) + PANEL('│'));
  }
  lines.push(PANEL(bottom));
  return lines;
}

function joinHorizontal(columns: { width: number; lines: string[] }[], gap = 2): string[] {
  const maxHeight = Math.max(...columns.map((col) => col.lines.length));
  const out: string[] = [];
  for (let row = 0; row < maxHeight; row++) {
    out.push(
      columns
        .map((col) => padRight(col.lines[row] ?? '', col.width))
        .join(' '.repeat(gap)),
    );
  }
  return out;
}

function sectionHeader(left: string, width: number, right = ''): string {
  const available = Math.max(0, width - 4 - visLen(left) - visLen(right));
  return `${PANEL('└─')}${left}${LOBSTER('─'.repeat(available))}${right}${PANEL('─┘')}`;
}

function pct(n: number): string {
  const value = `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
  return n >= 0 ? GREEN(value) : LOBSTER(value);
}

function sparkline(values: number[], width: number): string {
  if (values.length === 0) return '';
  const view = values.slice(-width);
  const lo = Math.min(...view);
  const hi = Math.max(...view);
  if (hi - lo < 1e-9) return SPARK[0]!.repeat(view.length);
  return view.map((v) => {
    const idx = Math.floor(((v - lo) / (hi - lo)) * (SPARK.length - 1));
    return SPARK[idx]!;
  }).join('');
}

function volumeLine(values: number[], width: number): string {
  return sparkline(values, width);
}

function renderTickerTape(state: DashboardState, width: number): string {
  const items = state.tickerTape.length > 0 ? state.tickerTape : state.trending.slice(0, 4);
  const text = items.map((item) => {
    const price = item.price ? `$${item.price.toFixed(item.price < 1 ? 6 : 2)}` : '';
    return `${WHITE.bold(item.symbol)} ${CYAN(price)} ${pct(item.change)}`;
  }).join(DIM(' │ '));
  return `${PANEL('└─')}${padRight(text, Math.max(0, width - 4))}${PANEL('─┘')}`;
}

function renderPriceChart(state: DashboardState, width: number): string[] {
  const candles = state.candles;
  const closes = candles.map((c) => c.c);
  const vols = candles.map((c) => c.v);
  const last = candles[candles.length - 1];
  const header = `${WHITE.bold('SOL/USDC')} ${DIM('│ 1H')} ${CYAN(`$${state.solPrice.toFixed(2)}`)} ${pct(state.solChange24h)}`;
  const body = [
    header,
    `${LOBSTER('▒')} ${CYAN(sparkline(closes, Math.max(24, width - 10)))}`,
    `${DIM('VOL')} ${MAGENTA(volumeLine(vols, Math.max(24, width - 12)))}`,
    last
      ? `${DIM('O:')} ${WHITE(last.o.toFixed(2))}   ${DIM('H:')} ${WHITE(last.h.toFixed(2))}   ${DIM('L:')} ${WHITE(last.l.toFixed(2))}`
      : DIM('No candles'),
  ];
  return box('PRICE CHART', width, body);
}

function renderOrderBook(levels: OrderBookLevel[], width: number): string[] {
  const asks = levels.filter((level) => level.side === 'ask').slice(0, 5);
  const bids = levels.filter((level) => level.side === 'bid').slice(0, 5);
  const spread = asks[asks.length - 1] && bids[0]
    ? (asks[asks.length - 1]!.price - bids[0]!.price).toFixed(4)
    : '0.0000';
  const rows = ['DEPTH      PRICE      SIZE'];
  for (const ask of asks) {
    rows.push(`${LOBSTER('██████')}  ${WHITE(ask.price.toFixed(3).padStart(7))}  ${DIM(ask.size.toFixed(2).padStart(7))}`);
  }
  rows.push(DIM(`─── SPREAD: ${spread} ───`));
  for (const bid of bids) {
    rows.push(`${GREEN('██████')}  ${WHITE(bid.price.toFixed(3).padStart(7))}  ${DIM(bid.size.toFixed(2).padStart(7))}`);
  }
  return box('ORDER BOOK', width, rows);
}

function renderHeatmap(cells: HeatCell[], width: number): string[] {
  const rows: string[] = [];
  const line = cells.map((cell) => {
    const label = `${cell.label} ${cell.change >= 0 ? '+' : ''}${cell.change.toFixed(1)}`;
    const tone = cell.change >= 0 ? chalk.bgHex('#00ffaa').black : chalk.bgHex('#ff3e3e').white;
    return tone(` ${label} `);
  }).join(' ');
  rows.push(line);
  return box('MARKET HEATMAP', width, rows);
}

function renderMovers(tokens: TrendingToken[], width: number): string[] {
  const rows = tokens.slice(0, 5).map((token) => {
    const arrow = token.change >= 0 ? GREEN('▲') : LOBSTER('▼');
    return `${arrow} ${token.symbol.padEnd(6)} ${pct(token.change)}`;
  });
  return box('TOP MOVERS', width, rows);
}

function renderFeed(feed: FeedItem[], width: number): string[] {
  const rows = feed.slice(0, 5).map((item) => {
    const color = item.tone === 'bull' ? GREEN : item.tone === 'bear' ? LOBSTER : item.tone === 'whale' ? MAGENTA : CYAN;
    return `${color(item.icon)} ${truncate(item.text, width - 8)}`;
  });
  return box('LIVE FEED          ● LIVE', width, rows);
}

function renderNetwork(state: DashboardState, width: number): string[] {
  const rows = [
    `TPS ${CYAN(state.network.tps.toFixed(0))}  slot ${WHITE(state.network.slot.toLocaleString())}`,
    `ping ${GREEN(state.network.pingMs.toFixed(0) + 'ms')}  validators ${VIOLET(String(state.network.validators))}`,
    `OODA ${LOBSTER.bold(state.oodaPhase.toUpperCase())}  cycles ${CYAN(String(state.cycleCount))}`,
  ];
  return box('NETWORK STATS', width, rows);
}

function renderActivity(log: LogEntry[], width: number): string[] {
  const rows = log.slice(0, 6).map((entry) => {
    const ts = new Date(entry.ts).toTimeString().slice(0, 8);
    return `${DIM(ts)} ${LOBSTER(entry.phase.padEnd(7))} ${truncate(entry.msg, width - 22)}`;
  });
  return box('ACTIVITY', width, rows);
}

function renderTradingView(state: DashboardState, width: number): string[] {
  const signal = state.lastSignal;
  const rows = [
    `Mode        ${state.autoMode ? GREEN('AUTO') : CYAN('INTERACTIVE')}`,
    `Confidential ${state.confidentialMode ? GREEN('ON') : LOBSTER('OFF')}`,
    `Dark DeFi   ${state.darkDefiArmed ? LOBSTER('ARMED') : DIM('DISARMED')}`,
    `pay.sh      ${state.payshStatus === 'online' ? GREEN('READY') : LOBSTER(state.payshStatus.toUpperCase())}`,
    signal
      ? `Signal      ${signal.symbol} ${signal.side.toUpperCase()} ${signal.score}/100 ${signal.size}`
      : 'Signal      PASS',
    `Paper PnL   ${state.paperPnl >= 0 ? GREEN(`+$${state.paperPnl.toFixed(2)}`) : LOBSTER(`-$${Math.abs(state.paperPnl).toFixed(2)}`)}`,
    `Last pay    ${state.lastPayment ? `${state.lastPayment.amount.toFixed(2)} ${state.lastPayment.asset}` : 'none'}`,
  ];
  return box('TRADING PANEL', width, rows);
}

function renderPortfolioView(state: DashboardState, width: number): string[] {
  const rows = [
    `Wallet      ${state.wallet.address}`,
    `SOL         ${state.wallet.solBalance.toFixed(2)}`,
    `Value       $${state.wallet.totalValueUsd.toFixed(2)}`,
    `Daily PnL   ${state.wallet.dailyPnlUsd >= 0 ? GREEN(`+$${state.wallet.dailyPnlUsd.toFixed(2)}`) : LOBSTER(`-$${Math.abs(state.wallet.dailyPnlUsd).toFixed(2)}`)}`,
    ...state.wallet.positions.slice(0, 4).map((position) =>
      `${position.symbol.padEnd(8)} $${position.valueUsd.toFixed(0).padStart(6)}  ${pct(position.change24h).padStart(8)}`),
  ];
  return box('PORTFOLIO', width, rows);
}

function renderAnalyticsView(state: DashboardState, width: number): string[] {
  const rows = [
    `Model       ${state.activeModel}`,
    `Memory      K:${state.memory.known} L:${state.memory.learned} I:${state.memory.inferred}`,
    `Win rate    ${(state.winRate * 100).toFixed(1)}%`,
    `Trades      ${state.totalTrades}`,
    `A2A peers   ${state.a2aConnections.filter((peer) => peer.status === 'connected').length}/${state.a2aConnections.length}`,
    `Research    ${state.nousOnline ? GREEN('online') : LOBSTER('offline')}`,
  ];
  return box('ANALYTICS', width, rows);
}

function renderAgentView(messages: AgentMessage[], width: number): string[] {
  const rows = messages.slice(0, 6).map((message) => {
    const who = message.role === 'agent'
      ? CYAN('agent')
      : message.role === 'user'
        ? MAGENTA('user ')
        : DIM('system');
    return `${who} ${truncate(message.text, width - 10)}`;
  });
  return box('AGENT CONSOLE', width, rows);
}

function renderHelp(width: number): string[] {
  const rows = [
    '[1] Market  [2] Trading  [3] Portfolio  [4] Analytics  [5] Agent',
    '[Tab] Cycle view  [R] Refresh  [D] Dark DeFi  [C] Confidential  [P] Payment',
    '[/] Command mode  /help  /analyze  /trending  /wallet  /news  /clear',
    '[A] Auto mode  [I] Interactive  [H] Toggle help  [Q] Quit',
  ];
  return box('HELP', width, rows);
}

function navigation(state: DashboardState, width: number): string {
  const tabs: Array<{ key: string; label: string; view: ViewMode }> = [
    { key: '1', label: 'MARKET', view: 'market' },
    { key: '2', label: 'TRADING', view: 'trading' },
    { key: '3', label: 'PORTFOLIO', view: 'portfolio' },
    { key: '4', label: 'ANALYTICS', view: 'analytics' },
    { key: '5', label: 'AGENT', view: 'agent' },
  ];
  const text = tabs.map((tab) => {
    const body = `[${tab.key}] ${tab.label}`;
    return tab.view === state.view ? chalk.bgHex('#ff3e3e').black(` ${body} `) : DIM(body);
  }).join(DIM(' │ '));
  return sectionHeader(text, width, '');
}

function renderMainView(state: DashboardState, width: number): string[] {
  if (state.showHelp) {
    return renderHelp(width);
  }

  if (state.view === 'market') {
    const leftW = Math.max(30, Math.floor(width * 0.58));
    const rightW = Math.max(24, width - leftW - 2);
    const upper = joinHorizontal([
      { width: leftW, lines: renderPriceChart(state, leftW) },
      { width: rightW, lines: renderOrderBook(state.orderBook, rightW) },
    ]);
    const lowerThird = Math.max(22, Math.floor((width - 4) / 3));
    const lower = joinHorizontal([
      { width: lowerThird, lines: renderHeatmap(state.heatmap, lowerThird) },
      { width: lowerThird, lines: renderMovers(state.topMovers, lowerThird) },
      { width: width - lowerThird * 2 - 4, lines: renderFeed(state.liveFeed, width - lowerThird * 2 - 4) },
    ]);
    return [...upper, '', ...lower];
  }

  const leftW = Math.max(30, Math.floor(width * 0.5));
  const rightW = Math.max(26, width - leftW - 2);
  const leftPanels =
    state.view === 'trading'
      ? renderTradingView(state, leftW)
      : state.view === 'portfolio'
        ? renderPortfolioView(state, leftW)
        : state.view === 'analytics'
          ? renderAnalyticsView(state, leftW)
          : renderAgentView(state.agentMessages, leftW);
  const rightPanels = joinHorizontal([
    { width: rightW, lines: renderNetwork(state, rightW) },
  ], 0);
  return [...joinHorizontal([{ width: leftW, lines: leftPanels }, { width: rightW, lines: rightPanels }]), '', ...renderActivity(state.log, width)];
}

export function renderFrame(state: DashboardState): void {
  const termWidth = Math.max(100, (process.stdout.columns ?? 120) - 2);
  const clock = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const uptimeSec = Math.floor((Date.now() - state.startedAt) / 1000);
  const hh = String(Math.floor(uptimeSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((uptimeSec % 3600) / 60)).padStart(2, '0');
  const ss = String(uptimeSec % 60).padStart(2, '0');
  const modeLabel = state.autoMode ? 'AUTO' : 'INTERACTIVE';

  const topBorder = chalk.gray(`┌${'─'.repeat(termWidth - 2)}┐`);
  const title = `${LOBSTER.bold('🦞 CLAWD')} ${WHITE.bold('MARKET VIEW')} ${DIM(`mode:${modeLabel}`)}`;
  const topStatus = `${DIM('Uptime:')} ${hh}:${mm}:${ss} ${DIM('│')} ${clock}`;

  const lines = [
    PANEL(topBorder),
    sectionHeader(title, termWidth, topStatus),
    PANEL(`┌${'─'.repeat(termWidth - 2)}┐`),
    renderTickerTape(state, termWidth),
    `${DIM('░'.repeat(Math.max(40, termWidth - 2)))}`,
    '',
    ...renderMainView(state, termWidth),
    '',
    navigation(state, termWidth),
  ];

  if (state.commandBuffer) {
    lines.push(`${LOBSTER('>')} ${MAGENTA(state.commandBuffer)}`);
  }
  if (state.error) {
    lines.push(LOBSTER(`error: ${state.error}`));
  }

  process.stdout.write(CLEAR_SCREEN + `${lines.join('\n')}\n`);
}

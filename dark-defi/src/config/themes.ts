// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Theme System (Bloomberg/Hacker Style)
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  text: string;
  textDim: string;
  textMuted: string;
  border: string;
  borderFocus: string;
  background: string;
  backgroundAlt: string;
}

export interface Theme {
  name: string;
  colors: ColorPalette;
  borderStyle: 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic';
  icons: {
    success: string;
    error: string;
    warning: string;
    info: string;
    loading: string;
    arrow: {
      up: string;
      down: string;
      left: string;
      right: string;
    };
    bullet: string;
    check: string;
    cross: string;
    star: string;
  };
  charts: {
    upColor: string;
    downColor: string;
    neutralColor: string;
    gridColor: string;
    candleUp: string;
    candleDown: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DARK RALPH THEME (Default - Hacker/Matrix style)
// ─────────────────────────────────────────────────────────────────────────────

export const darkRalphTheme: Theme = {
  name: 'Dark Ralph',
  colors: {
    primary: 'green',
    secondary: 'cyan',
    accent: 'magenta',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'cyan',
    text: 'white',
    textDim: 'gray',
    textMuted: 'gray',
    border: 'green',
    borderFocus: 'greenBright',
    background: 'black',
    backgroundAlt: 'gray',
  },
  borderStyle: 'single',
  icons: {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
    loading: '◌',
    arrow: {
      up: '▲',
      down: '▼',
      left: '◄',
      right: '►',
    },
    bullet: '•',
    check: '✓',
    cross: '✗',
    star: '★',
  },
  charts: {
    upColor: 'green',
    downColor: 'red',
    neutralColor: 'yellow',
    gridColor: 'gray',
    candleUp: '█',
    candleDown: '▒',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOOMBERG THEME (Classic Bloomberg Terminal)
// ─────────────────────────────────────────────────────────────────────────────

export const bloombergTheme: Theme = {
  name: 'Bloomberg',
  colors: {
    primary: 'yellow',
    secondary: 'white',
    accent: 'magenta',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'cyan',
    text: 'yellow',
    textDim: 'gray',
    textMuted: 'gray',
    border: 'yellow',
    borderFocus: 'yellowBright',
    background: 'black',
    backgroundAlt: 'gray',
  },
  borderStyle: 'double',
  icons: {
    success: '+',
    error: '-',
    warning: '!',
    info: '*',
    loading: '.',
    arrow: {
      up: '^',
      down: 'v',
      left: '<',
      right: '>',
    },
    bullet: '-',
    check: '+',
    cross: '-',
    star: '*',
  },
  charts: {
    upColor: 'green',
    downColor: 'red',
    neutralColor: 'white',
    gridColor: 'gray',
    candleUp: '#',
    candleDown: '=',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CYBERPUNK THEME
// ─────────────────────────────────────────────────────────────────────────────

export const cyberpunkTheme: Theme = {
  name: 'Cyberpunk',
  colors: {
    primary: 'magenta',
    secondary: 'cyan',
    accent: 'yellow',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'cyan',
    text: 'white',
    textDim: 'gray',
    textMuted: 'gray',
    border: 'magenta',
    borderFocus: 'magentaBright',
    background: 'black',
    backgroundAlt: 'gray',
  },
  borderStyle: 'bold',
  icons: {
    success: '◆',
    error: '◇',
    warning: '◈',
    info: '◉',
    loading: '◎',
    arrow: {
      up: '↑',
      down: '↓',
      left: '←',
      right: '→',
    },
    bullet: '›',
    check: '◆',
    cross: '◇',
    star: '✦',
  },
  charts: {
    upColor: 'cyan',
    downColor: 'magenta',
    neutralColor: 'yellow',
    gridColor: 'gray',
    candleUp: '▓',
    candleDown: '░',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MINIMAL THEME
// ─────────────────────────────────────────────────────────────────────────────

export const minimalTheme: Theme = {
  name: 'Minimal',
  colors: {
    primary: 'white',
    secondary: 'gray',
    accent: 'cyan',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue',
    text: 'white',
    textDim: 'gray',
    textMuted: 'gray',
    border: 'gray',
    borderFocus: 'white',
    background: 'black',
    backgroundAlt: 'gray',
  },
  borderStyle: 'round',
  icons: {
    success: '●',
    error: '○',
    warning: '◐',
    info: '◑',
    loading: '◒',
    arrow: {
      up: '↑',
      down: '↓',
      left: '←',
      right: '→',
    },
    bullet: '·',
    check: '●',
    cross: '○',
    star: '◆',
  },
  charts: {
    upColor: 'white',
    downColor: 'gray',
    neutralColor: 'gray',
    gridColor: 'gray',
    candleUp: '│',
    candleDown: '┊',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SOLANA THEME
// ─────────────────────────────────────────────────────────────────────────────

export const solanaTheme: Theme = {
  name: 'Solana',
  colors: {
    primary: 'magenta',
    secondary: 'cyan',
    accent: 'green',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'cyan',
    text: 'white',
    textDim: 'gray',
    textMuted: 'gray',
    border: 'magenta',
    borderFocus: 'cyan',
    background: 'black',
    backgroundAlt: 'gray',
  },
  borderStyle: 'single',
  icons: {
    success: '◉',
    error: '◎',
    warning: '◐',
    info: '◑',
    loading: '◌',
    arrow: {
      up: '▴',
      down: '▾',
      left: '◂',
      right: '▸',
    },
    bullet: '◦',
    check: '◉',
    cross: '◎',
    star: '✧',
  },
  charts: {
    upColor: 'green',
    downColor: 'red',
    neutralColor: 'cyan',
    gridColor: 'gray',
    candleUp: '█',
    candleDown: '▒',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DARK LOBSTER CYPHERPUNK THEME (Default - Crimson hacker aesthetic)
// ─────────────────────────────────────────────────────────────────────────────
//
// Palette philosophy:
//   - Blood crimson primary, acid green secondary, ember orange accent
//   - Dim oxblood borders that bloom to neon crimson on focus
//   - Mostly black void backgrounds — no warmth, no comfort
//
//   "The lobster remembers. The chain forgets nothing. The void watches back."
//
export const lobsterCypherpunkTheme: Theme = {
  name: 'Dark Lobster Cypherpunk',
  colors: {
    primary: '#FF003C',       // neon arterial crimson
    secondary: '#39FF14',     // acid green (hacker terminal)
    accent: '#FF6B1A',        // boiled-shell ember
    success: '#39FF14',
    warning: '#FFB000',       // amber CRT
    error: '#FF003C',
    info: '#00FFD1',          // cypher teal
    text: '#E8E0DD',          // bone white, slightly warm
    textDim: '#8B0019',       // dried blood
    textMuted: '#3D0710',     // shadow crimson
    border: '#8B0000',        // oxblood
    borderFocus: '#FF003C',
    background: '#080000',    // void with crimson undertone
    backgroundAlt: '#1A0507',
  },
  borderStyle: 'bold',
  icons: {
    success: '◢',
    error: '◣',
    warning: '◤',
    info: '◥',
    loading: '◈',
    arrow: {
      up: '▲',
      down: '▼',
      left: '◄',
      right: '►',
    },
    bullet: '▰',
    check: '◆',
    cross: '✕',
    star: '✺',
  },
  charts: {
    upColor: '#39FF14',
    downColor: '#FF003C',
    neutralColor: '#FFB000',
    gridColor: '#3D0710',
    candleUp: '█',
    candleDown: '▓',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// THEME REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const themes: Record<string, Theme> = {
  'dark-lobster': lobsterCypherpunkTheme,
  'dark-ralph': darkRalphTheme,
  bloomberg: bloombergTheme,
  cyberpunk: cyberpunkTheme,
  minimal: minimalTheme,
  solana: solanaTheme,
};

export const defaultTheme = lobsterCypherpunkTheme;

// ─────────────────────────────────────────────────────────────────────────────
// THEME HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function getTheme(name: string): Theme {
  return themes[name] || defaultTheme;
}

export function getThemeNames(): string[] {
  return Object.keys(themes);
}

// ─────────────────────────────────────────────────────────────────────────────
// ASCII ART ELEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const ASCII_BORDERS = {
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    teeLeft: '├',
    teeRight: '┤',
    teeTop: '┬',
    teeBottom: '┴',
    cross: '┼',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    teeLeft: '╠',
    teeRight: '╣',
    teeTop: '╦',
    teeBottom: '╩',
    cross: '╬',
  },
  bold: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    horizontal: '━',
    vertical: '┃',
    teeLeft: '┣',
    teeRight: '┫',
    teeTop: '┳',
    teeBottom: '┻',
    cross: '╋',
  },
  round: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
    teeLeft: '├',
    teeRight: '┤',
    teeTop: '┬',
    teeBottom: '┴',
    cross: '┼',
  },
};

export const ASCII_PROGRESS = {
  filled: ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'],
  blocks: ['░', '▒', '▓', '█'],
  dots: ['⣀', '⣄', '⣤', '⣦', '⣶', '⣷', '⣿'],
  bars: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'],
};

export const ASCII_SPINNERS = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['-', '\\', '|', '/'],
  circle: ['◐', '◓', '◑', '◒'],
  square: ['◰', '◳', '◲', '◱'],
  bounce: ['⠁', '⠂', '⠄', '⠂'],
  pulse: ['◯', '◔', '◑', '◕', '●', '◕', '◑', '◔'],
  // Lobster-cypherpunk specific frames
  claw: ['╱', '╳', '╲', '╳'],
  scan: ['▱▱▱▱', '▰▱▱▱', '▰▰▱▱', '▰▰▰▱', '▰▰▰▰', '▱▰▰▰', '▱▱▰▰', '▱▱▱▰'],
  glitch: ['▓░░', '░▓░', '░░▓', '░▓░'],
  bloodMoon: ['◜', '◝', '◞', '◟'],
};

// ─────────────────────────────────────────────────────────────────────────────
// CYPHERPUNK GRADIENT PRESETS (custom, not from ink-gradient defaults)
// ─────────────────────────────────────────────────────────────────────────────

export const GRADIENT_PRESETS = {
  blood:    ['#2A0000', '#8B0000', '#FF003C', '#8B0000', '#2A0000'],
  ember:    ['#3D0710', '#8B0000', '#FF6B1A', '#FFB000', '#FF6B1A'],
  cypher:   ['#FF003C', '#FF6B1A', '#FFB000', '#39FF14', '#00FFD1'],
  oxblood:  ['#0A0000', '#3D0710', '#8B0000', '#FF003C'],
  decay:    ['#39FF14', '#00FFD1', '#FF003C', '#8B0000'],
};

// ─────────────────────────────────────────────────────────────────────────────
// CHART CHARACTERS
// ─────────────────────────────────────────────────────────────────────────────

export const CHART_CHARS = {
  sparkline: '▁▂▃▄▅▆▇█',
  braille: {
    empty: '⠀',
    dots: ['⠁', '⠂', '⠄', '⡀', '⠈', '⠐', '⠠', '⢀'],
  },
  box: {
    light: '░',
    medium: '▒',
    dark: '▓',
    full: '█',
    empty: ' ',
  },
  candle: {
    body: {
      up: '█',
      down: '▒',
      doji: '│',
    },
    wick: '│',
  },
};

export default themes;

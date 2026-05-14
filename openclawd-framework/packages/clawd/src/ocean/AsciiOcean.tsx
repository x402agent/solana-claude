import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { LOBSTER_RED, SOLANA_GREEN, SOLANA_PURPLE } from '../theme/colors.js';

interface Lob { x: number; y: number; vx: number; tier: 'deep' | 'shallow' | 'shoreline' | 'beached'; glyph: string; hue: number }

const W = 56;
const H = 7;

function makeLob(): Lob {
  const tiers = ['deep', 'shallow', 'shoreline'] as const;
  const t = tiers[Math.floor(Math.random() * tiers.length)];
  return {
    x: Math.random() * W,
    y: Math.floor(Math.random() * H),
    vx: (Math.random() - 0.4) * 0.5,
    tier: t,
    glyph: ['🦞', '🦐', '🦀', 'Y◕Y', '>=<'][Math.floor(Math.random() * 5)],
    hue: Math.random(),
  };
}

const TIER_COLOR = {
  deep: SOLANA_GREEN,
  shallow: '#FFD700',
  shoreline: '#FFA500',
  beached: '#6B7280',
} as const;

export function AsciiOcean({ count = 6 }: { count?: number }) {
  const [lobs, setLobs] = useState<Lob[]>(() => Array.from({ length: count }, makeLob));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setLobs((arr) => arr.map((l) => {
        let nx = l.x + l.vx;
        if (nx < 0) nx = W; else if (nx > W) nx = 0;
        return { ...l, x: nx };
      }));
      setTick((t) => t + 1);
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Build rows
  const rows: string[][] = Array.from({ length: H }, () => Array(W).fill(' '));
  const colors: string[][] = Array.from({ length: H }, () => Array(W).fill('gray'));

  for (const l of lobs) {
    const xi = Math.floor(l.x) % W;
    if (l.y >= 0 && l.y < H && xi >= 0 && xi < W) {
      rows[l.y][xi] = '🦞';
      colors[l.y][xi] = TIER_COLOR[l.tier];
    }
  }

  // $CLAWD core in the middle
  const cx = Math.floor(W / 2);
  const cy = Math.floor(H / 2);
  rows[cy][cx] = (tick % 2 === 0 ? '◉' : '◎');
  colors[cy][cx] = SOLANA_PURPLE;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={SOLANA_PURPLE} paddingX={1}>
      <Text color={SOLANA_GREEN}>🌊 the deep — {lobs.length} leviathans drifting</Text>
      {rows.map((row, ri) => (
        <Box key={ri}>
          {row.map((ch, ci) => (
            <Text key={ci} color={colors[ri][ci]}>{ch}</Text>
          ))}
        </Box>
      ))}
      <Text color={LOBSTER_RED}>$CLAWD · 8cHzQ…pump · hotline 909-413-5567</Text>
    </Box>
  );
}

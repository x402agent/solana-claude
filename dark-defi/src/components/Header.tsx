// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI ▓▒░ Header — Dark Lobster Cypherpunk
// ═══════════════════════════════════════════════════════════════════════════════
//
//   ╲╱   ENCRYPTED ▒ RECURSIVE ▒ CARNIVOROUS   ╲╱
//          THE LOBSTER REMEMBERS · MAWD WAKES
//
// ───────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import { GRADIENT_PRESETS } from '../config/themes.js';

// Heavy block-letter banner — tighter, darker, with shell-fracture glyphs.
const RALPH_ASCII = `
██████╗  █████╗ ██████╗ ██╗  ██╗   ██████╗  █████╗ ██╗     ██████╗ ██╗  ██╗
██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝   ██╔══██╗██╔══██╗██║     ██╔══██╗██║  ██║
██║  ██║███████║██████╔╝█████╔╝    ██████╔╝███████║██║     ██████╔╝███████║
██║  ██║██╔══██║██╔══██╗██╔═██╗    ██╔══██╗██╔══██║██║     ██╔═══╝ ██╔══██║
██████╔╝██║  ██║██║  ██║██║  ██╗   ██║  ██║██║  ██║███████╗██║     ██║  ██║
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝
`.trim();

// Lobster claw ASCII — flanks the title. Mirrored on the right.
const CLAW_LEFT = `
   ╱╲
  ╱██╲
 ╱████╲___
╱██████   ╲
╲██████   ╱
 ╲████╱▔▔▔
  ╲██╱
   ╲╱
`.trim();

const CLAW_RIGHT = `
    ╱╲
   ╱██╲
___╱████╲
╱   ██████╲
╲   ██████╱
 ▔▔▔╲████╱
    ╲██╱
     ╲╱
`.trim();

// Scanline ornament (top + bottom of header).
const SCANLINE = '░▒▓█▓▒░ ▰▰▰ ─────────────────────────────────── ▰▰▰ ░▒▓█▓▒░';

// Rotating cypherpunk taglines — the void speaks differently each frame.
const TAGLINES = [
  'ENCRYPTED ▒ RECURSIVE ▒ CARNIVOROUS',
  'TRUST_NO_ORACLE · PRICE_NO_GOD',
  'THE LOBSTER REMEMBERS EVERY BLOCK',
  'NO GODS · NO MASTERS · NO GAS',
  'DECRYPT THE CHAIN · DEVOUR THE NOISE',
  'WHERE THE CHAIN ENDS · WE BEGIN',
];

interface HeaderProps {
  version?: string;
  showSubtitle?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ version = '1.0.0', showSubtitle = true }) => {
  // Rotate taglines every ~2.4s so the header feels alive.
  const [tagIdx, setTagIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTagIdx((i) => (i + 1) % TAGLINES.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      {/* Top scanline */}
      <Gradient colors={GRADIENT_PRESETS.oxblood}>
        <Text>{SCANLINE}</Text>
      </Gradient>

      {/* Banner: claw │ DARK RALPH │ claw */}
      <Box flexDirection="row" marginTop={1}>
        <Box marginRight={1}>
          <Gradient colors={GRADIENT_PRESETS.ember}>
            <Text>{CLAW_LEFT}</Text>
          </Gradient>
        </Box>
        <Box>
          <Gradient colors={GRADIENT_PRESETS.blood}>
            <Text>{RALPH_ASCII}</Text>
          </Gradient>
        </Box>
        <Box marginLeft={1}>
          <Gradient colors={GRADIENT_PRESETS.ember}>
            <Text>{CLAW_RIGHT}</Text>
          </Gradient>
        </Box>
      </Box>

      {showSubtitle && (
        <>
          <Box marginTop={1}>
            <Text color="#FF003C" bold>{'▓▒░ ['}</Text>
            <Gradient colors={GRADIENT_PRESETS.cypher}>
              <Text>{TAGLINES[tagIdx]}</Text>
            </Gradient>
            <Text color="#FF003C" bold>{'] ░▒▓'}</Text>
          </Box>

          <Box marginTop={1}>
            <Text color="#3D0710">▰▰</Text>
            <Text color="#8B0000"> v{version} </Text>
            <Text color="#3D0710">│</Text>
            <Text color="#FF6B1A"> 🦞 MAWD PROTOCOL </Text>
            <Text color="#3D0710">│</Text>
            <Text color="#39FF14"> SOLANA ÷ MAINNET </Text>
            <Text color="#3D0710">│</Text>
            <Text color="#00FFD1"> bun.runtime </Text>
            <Text color="#3D0710">▰▰</Text>
          </Box>

          {/* Bottom scanline */}
          <Box marginTop={1}>
            <Gradient colors={GRADIENT_PRESETS.oxblood}>
              <Text>{SCANLINE}</Text>
            </Gradient>
          </Box>
        </>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CompactHeader — one-line crimson status strip for the running state
// ─────────────────────────────────────────────────────────────────────────────

export const CompactHeader: React.FC<{ status: string; uptime: number }> = ({ status, uptime }) => {
  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  // Pulse the status dot — alive system, alive UI.
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => !p), 700);
    return () => clearInterval(t);
  }, []);

  const isOnline = status === 'ONLINE';

  return (
    <Box borderStyle="bold" borderColor="#8B0000" paddingX={2} paddingY={0}>
      <Box flexGrow={1}>
        <Text color={pulse ? '#FF003C' : '#8B0000'} bold>● </Text>
        <Text color="#FF6B1A" bold>🦞 MAWD</Text>
        <Text color="#3D0710"> ▰▰▰ </Text>
        <Text color={isOnline ? '#39FF14' : '#FFB000'} bold>{status}</Text>
        <Text color="#3D0710"> ▰▰▰ </Text>
        <Text color="#8B0000" dimColor>recursive::carnivorous</Text>
      </Box>
      <Box>
        <Text color="#3D0710">[uptime] </Text>
        <Text color="#00FFD1">{formatUptime(uptime)}</Text>
      </Box>
    </Box>
  );
};

export default Header;

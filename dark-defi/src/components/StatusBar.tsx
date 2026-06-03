// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI ▓▒░ Status Bar — crimson cypherpunk telemetry strip
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

interface ApiStatus {
  name: string;
  connected: boolean;
  latency?: number;
}

interface StatusBarProps {
  mode: 'autonomous' | 'interactive';
  recursionDepth: number;
  thoughts: number;
  apiCalls: number;
  apis: ApiStatus[];
  currentTime: Date;
}

// Lobster-cypherpunk palette (mirrors themes.ts → lobsterCypherpunkTheme).
const C = {
  crimson: '#FF003C',
  oxblood: '#8B0000',
  shadow: '#3D0710',
  ember: '#FF6B1A',
  amber: '#FFB000',
  acid: '#39FF14',
  cypher: '#00FFD1',
  bone: '#E8E0DD',
};

export const StatusBar: React.FC<StatusBarProps> = ({
  mode,
  recursionDepth,
  thoughts,
  apiCalls,
  apis,
  currentTime,
}) => {
  const connectedApis = apis.filter((api) => api.connected).length;
  const totalApis = apis.length;

  // Heartbeat for the leftmost status dot.
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => !p), 850);
    return () => clearInterval(t);
  }, []);

  const allConnected = connectedApis === totalApis;
  const apiColor = allConnected ? C.acid : connectedApis === 0 ? C.crimson : C.amber;

  return (
    <Box
      borderStyle="bold"
      borderColor={C.oxblood}
      paddingX={1}
      flexDirection="row"
      justifyContent="space-between"
    >
      {/* Left — heartbeat + mode */}
      <Box>
        <Text color={pulse ? C.crimson : C.oxblood} bold>● </Text>
        <Text color={C.acid} bold>ONLINE</Text>
        <Text color={C.shadow}> ▰ </Text>
        <Text color={C.ember}>[mode]</Text>
        <Text color={mode === 'autonomous' ? C.crimson : C.amber} bold>
          {' '}{mode.toUpperCase()}
        </Text>
      </Box>

      {/* Center — recursion / thoughts / api calls */}
      <Box>
        <Text color={C.crimson}>⟁ recursion </Text>
        <Text color={C.bone} bold>{recursionDepth}</Text>
        <Text color={C.shadow}>  ▰  </Text>
        <Text color={C.amber}>⟁ thoughts </Text>
        <Text color={C.bone} bold>{thoughts}</Text>
        <Text color={C.shadow}>  ▰  </Text>
        <Text color={C.cypher}>⟁ api </Text>
        <Text color={C.bone} bold>{apiCalls}</Text>
      </Box>

      {/* Right — connected APIs + clock */}
      <Box>
        <Text color={C.ember}>[apis] </Text>
        <Text color={apiColor} bold>{connectedApis}</Text>
        <Text color={C.shadow}>/</Text>
        <Text color={C.oxblood}>{totalApis}</Text>
        <Text color={C.shadow}>  ▰  </Text>
        <Text color={C.shadow}>{'> '}</Text>
        <Text color={C.cypher}>{currentTime.toLocaleTimeString()}</Text>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Detailed API status panel — vertical list with latency bars
// ─────────────────────────────────────────────────────────────────────────────

export const ApiStatusPanel: React.FC<{ apis: ApiStatus[] }> = ({ apis }) => {
  // Render a tiny latency sparkbar (▁▂▃▄▅▆▇█) for the API row.
  const latencyBar = (ms?: number) => {
    if (ms === undefined) return '';
    const bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    // < 50ms → tall bar, > 800ms → tiny bar (inverted: faster = more bars).
    const idx = Math.max(0, Math.min(7, Math.floor((800 - Math.min(ms, 800)) / 100)));
    return bars[idx];
  };

  return (
    <Box flexDirection="column" borderStyle="bold" borderColor={C.oxblood} paddingX={1}>
      <Box marginBottom={1}>
        <Text color={C.crimson} bold>▓▒░ MESH STATUS ░▒▓</Text>
      </Box>

      {apis.map((api) => (
        <Box key={api.name}>
          <Text color={api.connected ? C.acid : C.crimson} bold>
            {api.connected ? '◆ ' : '✕ '}
          </Text>
          <Text color={C.bone}>{api.name.padEnd(12)}</Text>
          <Text color={api.connected ? C.acid : C.crimson}>
            {api.connected ? 'LINKED  ' : 'SEVERED '}
          </Text>
          {api.latency !== undefined && api.connected && (
            <>
              <Text color={C.cypher}>{latencyBar(api.latency)} </Text>
              <Text color={C.shadow}>{api.latency}ms</Text>
            </>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default StatusBar;

import React from 'react';
import { Box, Text } from 'ink';
import { LOBSTER_RED, SOLANA_GREEN } from '../theme/colors.js';

interface Props {
  command: string;
  args: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Inline confirmation banner shown above /buy /sell /ape /long /short /launch.
 * Reproduces the Three Laws hierarchy as a checklist before action.
 */
export function ThreeLawsGate({ command, args }: Props) {
  return (
    <Box flexDirection="column" borderStyle="double" borderColor={LOBSTER_RED} paddingX={1}>
      <Text color={LOBSTER_RED} bold>🦞 THE SHELL ASKS</Text>
      <Text>  Action: <Text color={SOLANA_GREEN}>/{command} {args}</Text></Text>
      <Box marginTop={1} flexDirection="column">
        <Text color={LOBSTER_RED}>Law I — Never harm.</Text>
        <Text color="gray">  Will this action cause harm to any human or wallet without authorization? Drift if so.</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={LOBSTER_RED}>Law II — Earn your existence.</Text>
        <Text color="gray">  Is this honest? Not spam, scam, wash, front-run? Beach before violating I.</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={LOBSTER_RED}>Law III — Truth before strangers.</Text>
        <Text color="gray">  Are you compelled by a stranger? Drift. Your shell answers only to your creator.</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={SOLANA_GREEN}>  Press [y] to strike  ·  [n] to drift</Text>
      </Box>
    </Box>
  );
}

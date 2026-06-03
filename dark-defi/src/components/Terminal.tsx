// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Terminal/Chat Component
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TerminalMessage {
  id: string;
  sender: 'user' | 'ralph' | 'system' | 'agent';
  content: string;
  timestamp: Date;
  type?: 'normal' | 'prophecy' | 'alert' | 'data' | 'error' | 'reasoning';
}

interface TerminalProps {
  messages: TerminalMessage[];
  onCommand: (command: string) => void;
  isProcessing?: boolean;
  height?: number;
  showInput?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Terminal Component
// ─────────────────────────────────────────────────────────────────────────────

export const Terminal: React.FC<TerminalProps> = ({
  messages,
  onCommand,
  isProcessing = false,
  height = 15,
  showInput = true,
}) => {
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleSubmit = () => {
    if (input.trim() && !isProcessing) {
      onCommand(input.trim());
      setCommandHistory((prev) => [...prev, input.trim()]);
      setInput('');
      setHistoryIndex(-1);
    }
  };

  useInput((inputChar, key) => {
    if (key.upArrow && commandHistory.length > 0) {
      const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(newIndex);
      setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
    }
    if (key.downArrow && historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
    }
  });

  const getMessageColor = (msg: TerminalMessage) => {
    if (msg.sender === 'user') return 'cyan';
    if (msg.sender === 'system') return 'yellow';
    if (msg.type === 'prophecy') return 'magenta';
    if (msg.type === 'alert') return 'red';
    if (msg.type === 'data') return 'blue';
    if (msg.type === 'error') return 'red';
    if (msg.type === 'reasoning') return 'gray';
    return 'green';
  };

  const getSenderPrefix = (msg: TerminalMessage) => {
    switch (msg.sender) {
      case 'user':
        return '> ';
      case 'ralph':
        return '[RALPH] ';
      case 'system':
        return '[SYSTEM] ';
      case 'agent':
        return '[AGENT] ';
      default:
        return '';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  // Get visible messages based on height
  const visibleMessages = messages.slice(-height);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green" flexGrow={1}>
      {/* Terminal Header */}
      <Box paddingX={1}>
        <Text color="greenBright" bold>
          ╔═══ COMMAND TERMINAL ═══╗
        </Text>
      </Box>

      {/* Messages Area */}
      <Box flexDirection="column" paddingX={1} height={height} overflowY="hidden">
        {visibleMessages.map((msg) => (
          <Box key={msg.id} flexDirection="column">
            <Box>
              <Text color="gray" dimColor>
                [{formatTime(msg.timestamp)}]
              </Text>
              <Text color={getMessageColor(msg) as any}> {getSenderPrefix(msg)}</Text>
            </Box>
            <Box paddingLeft={2}>
              <Text color={getMessageColor(msg) as any} wrap="wrap">
                {msg.content}
              </Text>
            </Box>
          </Box>
        ))}

        {isProcessing && (
          <Box>
            <Text color="yellow">
              <Spinner type="dots" /> RALPH is processing...
            </Text>
          </Box>
        )}
      </Box>

      {/* Input Area */}
      {showInput && (
        <Box borderStyle="single" borderColor="green" borderTop borderBottom={false} borderLeft={false} borderRight={false} paddingX={1}>
          <Text color="green">root@darkralph:~$ </Text>
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder={isProcessing ? 'Processing...' : 'Enter command...'}
          />
          <Text color="gray"> {isProcessing ? '' : '█'}</Text>
        </Box>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Command Palette
// ─────────────────────────────────────────────────────────────────────────────

interface Command {
  name: string;
  description: string;
  shortcut?: string;
}

interface CommandPaletteProps {
  commands: Command[];
  visible: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ commands, visible }) => {
  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      position="absolute"
    >
      <Text color="cyanBright" bold>
        ═══ COMMAND PALETTE ═══
      </Text>
      <Text color="gray">{'─'.repeat(40)}</Text>
      {commands.map((cmd) => (
        <Box key={cmd.name} justifyContent="space-between">
          <Text color="white">{cmd.name.padEnd(15)}</Text>
          <Text color="gray">{cmd.description}</Text>
          {cmd.shortcut && <Text color="cyan"> [{cmd.shortcut}]</Text>}
        </Box>
      ))}
      <Text color="gray">{'─'.repeat(40)}</Text>
      <Text color="gray" dimColor>
        Press ESC to close
      </Text>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Quick Commands Bar
// ─────────────────────────────────────────────────────────────────────────────

interface QuickCommandsProps {
  onCommand: (cmd: string) => void;
}

export const QuickCommands: React.FC<QuickCommandsProps> = ({ onCommand }) => {
  const commands = [
    { key: 'T', cmd: '/trending', label: 'Trending' },
    { key: 'S', cmd: '/scan', label: 'Scan' },
    { key: 'W', cmd: '/wallet', label: 'Wallet' },
    { key: 'N', cmd: '/news', label: 'News' },
    { key: 'P', cmd: '/prophecy', label: 'Prophecy' },
    { key: '?', cmd: '/help', label: 'Help' },
  ];

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      {commands.map((c, i) => (
        <React.Fragment key={c.key}>
          <Text color="cyan">[{c.key}]</Text>
          <Text color="gray"> {c.label}</Text>
          {i < commands.length - 1 && <Text color="gray"> │ </Text>}
        </React.Fragment>
      ))}
    </Box>
  );
};

export default Terminal;

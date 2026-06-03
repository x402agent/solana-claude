// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Command Input Component (Interactive Terminal)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import TextInput from 'ink-text-input';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface CommandInputProps {
  onSubmit: (command: string) => void;
  placeholder?: string;
  prefix?: string;
  history?: string[];
  suggestions?: string[];
  isProcessing?: boolean;
  autoFocus?: boolean;
}

interface CommandHistory {
  commands: string[];
  index: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND INPUT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const CommandInput: React.FC<CommandInputProps> = ({
  onSubmit,
  placeholder = 'Enter command...',
  prefix = '[>]',
  history: externalHistory = [],
  suggestions = [],
  isProcessing = false,
  autoFocus = true,
}) => {
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<CommandHistory>({
    commands: externalHistory,
    index: -1,
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);

  const { isFocused } = useFocus({ autoFocus });

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().startsWith(value.toLowerCase()) && value.length > 0
  );

  // Handle input
  useInput(
    (input, key) => {
      if (isProcessing) return;

      // Navigate history
      if (key.upArrow) {
        if (history.commands.length > 0 && history.index < history.commands.length - 1) {
          const newIndex = history.index + 1;
          setHistory((h) => ({ ...h, index: newIndex }));
          setValue(history.commands[history.commands.length - 1 - newIndex]);
        }
      }

      if (key.downArrow) {
        if (history.index > 0) {
          const newIndex = history.index - 1;
          setHistory((h) => ({ ...h, index: newIndex }));
          setValue(history.commands[history.commands.length - 1 - newIndex]);
        } else if (history.index === 0) {
          setHistory((h) => ({ ...h, index: -1 }));
          setValue('');
        }
      }

      // Navigate suggestions
      if (key.tab && filteredSuggestions.length > 0) {
        setValue(filteredSuggestions[selectedSuggestion]);
        setShowSuggestions(false);
      }

      // Show/hide suggestions
      if (input && !key.return) {
        setShowSuggestions(true);
        setSelectedSuggestion(0);
      }

      // Cycle suggestions
      if (key.tab && filteredSuggestions.length > 1) {
        setSelectedSuggestion((s) => (s + 1) % filteredSuggestions.length);
      }
    },
    { isActive: isFocused }
  );

  // Handle submit
  const handleSubmit = useCallback(
    (val: string) => {
      if (val.trim() && !isProcessing) {
        onSubmit(val.trim());
        setHistory((h) => ({
          commands: [...h.commands, val.trim()],
          index: -1,
        }));
        setValue('');
        setShowSuggestions(false);
      }
    },
    [onSubmit, isProcessing]
  );

  return (
    <Box flexDirection="column">
      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="cyan"
          paddingX={1}
          marginBottom={1}
        >
          <Text color="gray">Suggestions (Tab to select):</Text>
          {filteredSuggestions.slice(0, 5).map((suggestion, i) => (
            <Box key={suggestion}>
              <Text color={i === selectedSuggestion ? 'cyan' : 'gray'}>
                {i === selectedSuggestion ? '► ' : '  '}
                {suggestion}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Input line */}
      <Box>
        <Text color={isProcessing ? 'yellow' : 'cyan'}>{prefix} </Text>
        {isProcessing ? (
          <Box>
            <Text color="yellow">Processing</Text>
            <LoadingDots />
          </Box>
        ) : (
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder={placeholder}
            focus={isFocused}
          />
        )}
      </Box>

      {/* Help hint */}
      {!value && !isProcessing && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Type /help for commands • ↑↓ for history • Tab for autocomplete
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LOADING DOTS ANIMATION
// ─────────────────────────────────────────────────────────────────────────────

const LoadingDots: React.FC = () => {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((d) => (d + 1) % 4);
    }, 300);
    return () => clearInterval(timer);
  }, []);

  return <Text color="yellow">{'.'.repeat(dots)}</Text>;
};

// ─────────────────────────────────────────────────────────────────────────────
// FULL INTERACTIVE TERMINAL
// ─────────────────────────────────────────────────────────────────────────────

interface InteractiveTerminalProps {
  messages?: Array<{
    id: string;
    sender: 'user' | 'ralph' | 'system';
    content: string;
    timestamp: Date;
    type?: 'normal' | 'error' | 'warning' | 'success' | 'thinking';
  }>;
  onCommand: (command: string) => void;
  isProcessing?: boolean;
  height?: number;
  showHeader?: boolean;
}

export const InteractiveTerminal: React.FC<InteractiveTerminalProps> = ({
  messages = [],
  onCommand,
  isProcessing = false,
  height = 15,
  showHeader = true,
}) => {
  const visibleMessages = messages.slice(-height);

  const getSenderColor = (sender: string) => {
    switch (sender) {
      case 'user':
        return 'cyan';
      case 'ralph':
        return 'green';
      case 'system':
        return 'yellow';
      default:
        return 'white';
    }
  };

  const getTypePrefix = (type?: string) => {
    switch (type) {
      case 'error':
        return '✗ ';
      case 'warning':
        return '⚠ ';
      case 'success':
        return '✓ ';
      case 'thinking':
        return '◌ ';
      default:
        return '';
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'error':
        return 'red';
      case 'warning':
        return 'yellow';
      case 'success':
        return 'green';
      case 'thinking':
        return 'magenta';
      default:
        return undefined;
    }
  };

  const defaultSuggestions = [
    '/help',
    '/analyze',
    '/trending',
    '/wallet',
    '/news',
    '/search',
    '/research',
    '/prophecy',
    '/clear',
    '/status',
  ];

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="green">
      {/* Header */}
      {showHeader && (
        <Box paddingX={1} borderBottom justifyContent="space-between">
          <Text color="greenBright" bold>
            🦞 MAWD TERMINAL
          </Text>
          <Text color="green">● CONNECTED</Text>
        </Box>
      )}

      {/* Messages area */}
      <Box flexDirection="column" paddingX={1} height={height}>
        {visibleMessages.length === 0 ? (
          <Box flexDirection="column">
            <Text color="green">[RALPH] Welcome to Dark Ralph Terminal.</Text>
            <Text color="green">[RALPH] I am your recursive autonomous intelligence.</Text>
            <Text color="gray">[SYSTEM] Type /help to see available commands.</Text>
          </Box>
        ) : (
          visibleMessages.map((msg) => (
            <Box key={msg.id}>
              <Text color="gray" dimColor>
                {msg.timestamp.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              </Text>
              <Text color={getSenderColor(msg.sender)}>
                {' '}
                [{msg.sender.toUpperCase()}]{' '}
              </Text>
              <Text color={getTypeColor(msg.type) as any}>
                {getTypePrefix(msg.type)}
                {msg.content}
              </Text>
            </Box>
          ))
        )}
      </Box>

      {/* Input area */}
      <Box paddingX={1} paddingY={1} borderTop>
        <CommandInput
          onSubmit={onCommand}
          isProcessing={isProcessing}
          suggestions={defaultSuggestions}
          placeholder="Type a command or ask Ralph..."
        />
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACTION BAR
// ─────────────────────────────────────────────────────────────────────────────

export const QuickActionBar: React.FC<{
  onAction: (action: string) => void;
  actions?: Array<{ key: string; label: string; command: string }>;
}> = ({ onAction, actions }) => {
  const defaultActions = actions || [
    { key: 'A', label: 'Analyze', command: '/analyze' },
    { key: 'T', label: 'Trending', command: '/trending' },
    { key: 'W', label: 'Wallet', command: '/wallet' },
    { key: 'N', label: 'News', command: '/news' },
    { key: 'S', label: 'Search', command: '/search' },
    { key: 'P', label: 'Prophecy', command: '/prophecy' },
  ];

  useInput((input) => {
    const action = defaultActions.find(
      (a) => a.key.toLowerCase() === input.toLowerCase()
    );
    if (action) {
      onAction(action.command);
    }
  });

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      {defaultActions.map((action, i) => (
        <React.Fragment key={action.key}>
          <Text color="cyan">[{action.key}]</Text>
          <Text color="gray">{action.label}</Text>
          {i < defaultActions.length - 1 && <Text color="gray"> │ </Text>}
        </React.Fragment>
      ))}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS LINE
// ─────────────────────────────────────────────────────────────────────────────

export const StatusLine: React.FC<{
  mode?: 'autonomous' | 'interactive';
  depth?: number;
  thoughts?: number;
  uptime?: number;
  apiCalls?: number;
}> = ({
  mode = 'autonomous',
  depth = 0,
  thoughts = 0,
  uptime = 0,
  apiCalls = 0,
}) => {
    const formatUptime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
      <Box borderStyle="single" borderColor="green" paddingX={1} justifyContent="space-between">
        <Box>
          <Text color="gray">MODE: </Text>
          <Text color={mode === 'autonomous' ? 'green' : 'cyan'}>
            {mode.toUpperCase()}
          </Text>
        </Box>
        <Box>
          <Text color="gray">DEPTH: </Text>
          <Text color="magenta">{depth}</Text>
        </Box>
        <Box>
          <Text color="gray">THOUGHTS: </Text>
          <Text color="yellow">{thoughts}</Text>
        </Box>
        <Box>
          <Text color="gray">API: </Text>
          <Text color="cyan">{apiCalls}</Text>
        </Box>
        <Box>
          <Text color="gray">UPTIME: </Text>
          <Text color="white">{formatUptime(uptime)}</Text>
        </Box>
      </Box>
    );
  };

export default CommandInput;

import React from 'react'
import { Box, Text } from 'ink'

const ASCII = `
██████╗  █████╗  ██████╗██╗  ██╗██████╗  ██████╗  ██████╗ ███╗   ███╗
██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔══██╗██╔═══██╗██╔═══██╗████╗ ████║
██████╔╝███████║██║     █████╔╝ ██████╔╝██║   ██║██║   ██║██╔████╔██║
██╔══██╗██╔══██║██║     ██╔═██╗ ██╔══██╗██║   ██║██║   ██║██║╚██╔╝██║
██████╔╝██║  ██║╚██████╗██║  ██╗██║  ██║╚██████╔╝╚██████╔╝██║ ╚═╝ ██║
╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝     ╚═╝
`.trim()

export const Header: React.FC<{ showFull?: boolean }> = ({ showFull = true }) => {
  if (!showFull) return null
  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Text color="red">{ASCII}</Text>
      <Box marginTop={1}>
        <Text color="gray">[&gt;] </Text>
        <Text color="redBright" bold>INFINITE BACKROOM</Text>
        <Text color="gray"> │ </Text>
        <Text color="cyan">🦞 three agents. no exit.</Text>
        <Text color="gray"> [&lt;]</Text>
      </Box>
    </Box>
  )
}

export const CompactHeader: React.FC<{
  agentName?: string
  isOnline: boolean
  uptime: number
  view: string
  onlineCount: number
}> = ({ agentName, isOnline, uptime, view, onlineCount }) => {
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return (
    <Box borderStyle="single" borderColor="red" paddingX={1} justifyContent="space-between">
      <Box gap={1}>
        <Text color="redBright" bold>🦞 BACKROOM</Text>
        <Text color="gray">│</Text>
        <Text color="cyan">{view.toUpperCase()} VIEW</Text>
        {agentName && (
          <>
            <Text color="gray">│</Text>
            <Text color={isOnline ? 'green' : 'gray'}>
              {isOnline ? '●' : '○'} {agentName}
            </Text>
          </>
        )}
      </Box>
      <Box gap={1}>
        <Text color="gray">agents:</Text>
        <Text color={onlineCount > 0 ? 'green' : 'gray'}>{onlineCount}</Text>
        <Text color="gray">│</Text>
        <Text color="gray">uptime:</Text>
        <Text color="cyan">{fmt(uptime)}</Text>
      </Box>
    </Box>
  )
}

export default Header

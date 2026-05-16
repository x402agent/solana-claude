import React from 'react'
import { Box, Text } from 'ink'

interface PanelProps {
  title: string
  children: React.ReactNode
  width?: number | string
  borderColor?: string
  accentColor?: string
  flex?: number
  height?: number
}

export const Panel: React.FC<PanelProps> = ({
  title,
  children,
  width,
  borderColor = 'red',
  accentColor = 'redBright',
  flex,
  height,
}) => (
  <Box
    flexDirection="column"
    borderStyle="single"
    borderColor={borderColor}
    width={width}
    height={height}
    flexGrow={flex}
  >
    <Box paddingX={1}>
      <Text color={accentColor} bold>╔═ {title} ═╗</Text>
    </Box>
    <Box flexDirection="column" paddingX={1} flexGrow={1}>
      {children}
    </Box>
  </Box>
)

export default Panel

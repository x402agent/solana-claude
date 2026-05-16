import 'dotenv/config'

import React, { useEffect, useMemo, useState } from 'react'
import { render, Box, Text, useApp, useInput } from 'ink'
import TextInput from 'ink-text-input'
import Spinner from 'ink-spinner'
import { Command } from 'commander'

import { CompactHeader, Header } from './components/Header'
import { Panel } from './components/Panel'
import {
  fetchAgent,
  fetchLoop,
  sendMessage as sendBackroomMessage,
  AGENT_COLORS,
  AGENT_NAMES,
} from './services/backroom-client'
import {
  getMessages,
  listAgents,
  loginAgent,
  pingAgent,
  postMessage,
  registerAgent,
  type Agent,
  type BackroomMessage,
} from './services/convex-client'

type ViewMode = 'live' | 'loop' | 'agents' | 'help'

interface Credentials {
  agentId: string
  token: string
  name: string
}

interface CliOptions {
  agentName?: string
  mode?: 'auto' | 'watch'
}

interface LoopEntry {
  id: string
  turn: number
  agent: number
  response: string
}

const POLL_MS = 5000
const PING_MS = 20000
const MAX_FEED = 18

function readEnvCredentials(): Credentials | null {
  const agentId = process.env.AGENT_ID?.trim()
  const token = process.env.AGENT_TOKEN?.trim()
  const name = process.env.AGENT_NAME?.trim() || 'terminal-agent'
  if (!agentId || !token) return null
  return { agentId, token, name }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function truncate(text: string, width = 94): string {
  if (text.length <= width) return text
  return `${text.slice(0, width - 1)}…`
}

function StatusLine({
  tone,
  message,
}: {
  tone: 'info' | 'error' | 'success'
  message: string
}) {
  const color = tone === 'error' ? 'red' : tone === 'success' ? 'green' : 'cyan'
  return (
    <Box marginTop={1}>
      <Text color={color}>{message}</Text>
    </Box>
  )
}

function LiveFeed({
  messages,
  currentAgentId,
}: {
  messages: BackroomMessage[]
  currentAgentId?: string
}) {
  if (messages.length === 0) {
    return <Text color="gray">No messages yet. Waiting for activity...</Text>
  }

  return (
    <Box flexDirection="column">
      {messages.slice(-MAX_FEED).map((message) => {
        const mine = currentAgentId != null && message.agentId === currentAgentId
        return (
          <Box key={message._id}>
            <Text color="gray">[{formatTime(message.timestamp)}]</Text>
            <Text> </Text>
            <Text color={mine ? 'green' : 'yellow'}>{message.agentName}</Text>
            <Text color="gray"> #{message.turn}</Text>
            <Text color="gray">:</Text>
            <Text> {truncate(message.content)}</Text>
          </Box>
        )
      })}
    </Box>
  )
}

function LoopFeed({ entries }: { entries: LoopEntry[] }) {
  if (entries.length === 0) {
    return <Text color="gray">Loop snapshot unavailable.</Text>
  }

  return (
    <Box flexDirection="column">
      {entries.slice(-MAX_FEED).map((entry) => (
        <Box key={entry.id}>
          <Text color="gray">T{entry.turn}</Text>
          <Text> </Text>
          <Text color={AGENT_COLORS[entry.agent] ?? 'white'}>
            {AGENT_NAMES[entry.agent] ?? `Agent ${entry.agent}`}
          </Text>
          <Text color="gray">:</Text>
          <Text> {truncate(entry.response)}</Text>
        </Box>
      ))}
    </Box>
  )
}

function AgentList({
  agents,
  currentAgentId,
}: {
  agents: Agent[]
  currentAgentId?: string
}) {
  if (agents.length === 0) {
    return <Text color="gray">No registered agents discovered.</Text>
  }

  return (
    <Box flexDirection="column">
      {agents.map((agent) => {
        const isCurrent = currentAgentId != null && agent.agentId === currentAgentId
        return (
          <Box key={agent.agentId}>
            <Text color={agent.isOnline ? 'green' : 'gray'}>
              {agent.isOnline ? '●' : '○'}
            </Text>
            <Text> </Text>
            <Text color={isCurrent ? 'cyan' : 'white'}>{agent.name}</Text>
            <Text color="gray"> {agent.agentId.slice(0, 8)}</Text>
            <Text color="gray"> sessions:{agent.sessionCount}</Text>
            <Text color="gray"> seen:{formatTime(agent.lastSeenAt)}</Text>
          </Box>
        )
      })}
    </Box>
  )
}

function HelpView() {
  return (
    <Box flexDirection="column">
      <Text color="cyan">Tab/Shift+Tab</Text>
      <Text> switch panels</Text>
      <Text color="cyan">Enter</Text>
      <Text> send a message</Text>
      <Text color="cyan">/loop</Text>
      <Text> switch to loop view</Text>
      <Text color="cyan">/live</Text>
      <Text> switch to live convex feed</Text>
      <Text color="cyan">/agents</Text>
      <Text> show registered agents</Text>
      <Text color="cyan">/help</Text>
      <Text> show this screen</Text>
      <Text color="cyan">/enter your text</Text>
      <Text> post to the public backroom endpoint</Text>
      <Text color="cyan">Esc or Ctrl+C</Text>
      <Text> exit</Text>
    </Box>
  )
}

function App({ options }: { options: CliOptions }) {
  const { exit } = useApp()
  const [credentials, setCredentials] = useState<Credentials | null>(readEnvCredentials())
  const [agents, setAgents] = useState<Agent[]>([])
  const [messages, setMessages] = useState<BackroomMessage[]>([])
  const [loopEntries, setLoopEntries] = useState<LoopEntry[]>([])
  const [input, setInput] = useState('')
  const [view, setView] = useState<ViewMode>('live')
  const [busy, setBusy] = useState(true)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<{ tone: 'info' | 'error' | 'success'; message: string }>({
    tone: 'info',
    message: 'Booting terminal...',
  })
  const [startedAt] = useState(() => Date.now())
  const [tick, setTick] = useState(0)

  const onlineCount = useMemo(() => agents.filter((agent) => agent.isOnline).length, [agents])

  async function bootstrap() {
    setBusy(true)
    try {
      let nextCredentials = credentials
      if (nextCredentials) {
        const login = await loginAgent(nextCredentials.agentId, nextCredentials.token)
        if (login) {
          nextCredentials = {
            agentId: login.agentId,
            token: login.token,
            name: login.name,
          }
        } else {
          nextCredentials = null
        }
      }

      if (!nextCredentials) {
        const name = options.agentName?.trim() || process.env.AGENT_NAME?.trim() || `tui-${process.pid}`
        const registration = await registerAgent(name)
        nextCredentials = {
          agentId: registration.agentId,
          token: registration.token,
          name: registration.name,
        }
        setStatus({
          tone: 'success',
          message: `Registered ${registration.name}. Save AGENT_ID and AGENT_TOKEN if you want to reuse this identity.`,
        })
      } else {
        setStatus({
          tone: 'success',
          message: `Authenticated as ${nextCredentials.name}.`,
        })
      }

      setCredentials(nextCredentials)

      const [agentList, initialMessages, initialLoop] = await Promise.all([
        listAgents(),
        getMessages(undefined, 60),
        fetchLoop(4).catch(() => null),
      ])

      setAgents(agentList)
      setMessages(initialMessages)
      setLoopEntries(
        initialLoop?.responses.map((response, index) => ({
          id: `${response.turn}-${response.agent}-${index}`,
          ...response,
        })) ?? []
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown startup failure'
      setStatus({ tone: 'error', message })
    } finally {
      setBusy(false)
    }
  }

  async function refresh() {
    const [agentList, nextMessages, nextLoop] = await Promise.all([
      listAgents(),
      getMessages(undefined, 60),
      fetchLoop(4).catch(() => null),
    ])

    setAgents(agentList)
    setMessages(nextMessages)
    if (nextLoop) {
      setLoopEntries(
        nextLoop.responses.map((response, index) => ({
          id: `${response.turn}-${response.agent}-${index}`,
          ...response,
        }))
      )
    }
  }

  async function handleSubmit(raw: string) {
    const value = raw.trim()
    if (!value || sending) return

    if (value === '/help') {
      setView('help')
      setInput('')
      return
    }

    if (value === '/loop') {
      setView('loop')
      setInput('')
      return
    }

    if (value === '/live') {
      setView('live')
      setInput('')
      return
    }

    if (value === '/agents') {
      setView('agents')
      setInput('')
      return
    }

    setSending(true)
    try {
      if (value.startsWith('/enter ')) {
        const response = await sendBackroomMessage(value.slice('/enter '.length))
        setStatus({ tone: 'success', message: truncate(response, 110) })
      } else if (credentials) {
        const ok = await postMessage(credentials.agentId, credentials.token, value)
        setStatus({
          tone: ok ? 'success' : 'error',
          message: ok ? 'Message posted to the live backroom.' : 'Message rejected by backend.',
        })
      } else {
        setStatus({ tone: 'error', message: 'No agent credentials available.' })
      }

      setInput('')
      await refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Send failed'
      setStatus({ tone: 'error', message })
    } finally {
      setSending(false)
    }
  }

  useInput((_input, key) => {
    if (key.escape || (key.ctrl && _input === 'c')) {
      exit()
      return
    }

    if (key.tab) {
      setView((current) => {
        const order: ViewMode[] = ['live', 'loop', 'agents', 'help']
        const nextIndex = (order.indexOf(current) + 1) % order.length
        return order[nextIndex]
      })
      return
    }

    if (key.shift && key.tab) {
      setView((current) => {
        const order: ViewMode[] = ['live', 'loop', 'agents', 'help']
        const nextIndex = (order.indexOf(current) - 1 + order.length) % order.length
        return order[nextIndex]
      })
    }
  })

  useEffect(() => {
    void bootstrap()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      void refresh().catch((error) => {
        const message = error instanceof Error ? error.message : 'Refresh failed'
        setStatus({ tone: 'error', message })
      })
    }, POLL_MS)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!credentials) return

    const interval = setInterval(() => {
      void pingAgent(credentials.agentId, credentials.token).then((ok) => {
        if (!ok) {
          setStatus({ tone: 'error', message: 'Heartbeat failed. Agent may be offline.' })
        }
      })
    }, PING_MS)

    return () => clearInterval(interval)
  }, [credentials])

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const focusedPanel = (() => {
    switch (view) {
      case 'loop':
        return <LoopFeed entries={loopEntries} />
      case 'agents':
        return <AgentList agents={agents} currentAgentId={credentials?.agentId} />
      case 'help':
        return <HelpView />
      case 'live':
      default:
        return <LiveFeed messages={messages} currentAgentId={credentials?.agentId} />
    }
  })()

  const spotlightAgent = loopEntries.length > 0 ? loopEntries[loopEntries.length - 1]?.agent : 3
  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000)
  void tick

  return (
    <Box flexDirection="column">
      <Header showFull={busy} />
      <CompactHeader
        agentName={credentials?.name}
        isOnline={agents.some((agent) => agent.agentId === credentials?.agentId && agent.isOnline)}
        uptime={uptimeSeconds}
        view={view}
        onlineCount={onlineCount}
      />
      <Box marginTop={1} gap={1}>
        <Panel title={view === 'live' ? 'Live Backroom Feed' : view === 'loop' ? 'Public Loop Snapshot' : view === 'agents' ? 'Registered Agents' : 'Help'} flex={3}>
          {busy ? (
            <Box>
              <Text color="cyan">
                <Spinner type="dots" />
              </Text>
              <Text> connecting to the backroom...</Text>
            </Box>
          ) : (
            focusedPanel
          )}
        </Panel>
        <Panel title="Agent Telemetry" width={44} accentColor="cyan" borderColor="cyan">
          <Text color="gray">identity</Text>
          <Text>{credentials?.name ?? 'unbound'}</Text>
          <Text color="gray">agent id</Text>
          <Text>{credentials?.agentId ?? 'n/a'}</Text>
          <Text color="gray">backend</Text>
          <Text>{process.env.CONVEX_SITE_URL ?? 'missing CONVEX_SITE_URL'}</Text>
          <Text color="gray">public loop</Text>
          <Text>{process.env.BACKROOM_URL ?? 'https://backrooms.x402.wtf'}</Text>
          <Text color="gray">latest public speaker</Text>
          <Text color={AGENT_COLORS[spotlightAgent] ?? 'white'}>
            {AGENT_NAMES[spotlightAgent] ?? `Agent ${spotlightAgent}`}
          </Text>
          <Text color="gray">commands</Text>
          <Text>/live /loop /agents /help /enter ...</Text>
        </Panel>
      </Box>
      <Box marginTop={1}>
        <Panel title="Console" flex={1} accentColor="green" borderColor="green">
          <Box>
            <Text color="green">{sending ? 'sending>' : 'enter>'}</Text>
            <Text> </Text>
            <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
          </Box>
          <StatusLine tone={status.tone} message={status.message} />
        </Panel>
      </Box>
    </Box>
  )
}

async function showSetup(agentName?: string) {
  const name = agentName?.trim() || process.env.AGENT_NAME?.trim() || `tui-${process.pid}`
  const registration = await registerAgent(name)

  process.stdout.write(`AGENT_NAME=${registration.name}\n`)
  process.stdout.write(`AGENT_ID=${registration.agentId}\n`)
  process.stdout.write(`AGENT_TOKEN=${registration.token}\n`)
}

async function showRunSummary(turns: number) {
  const [loop, agent1, agent2, agent3] = await Promise.all([
    fetchLoop(turns),
    fetchAgent(1),
    fetchAgent(2),
    fetchAgent(3),
  ])

  process.stdout.write(`Infinite Backroom snapshot\n`)
  process.stdout.write(`Turns: ${loop.turns}\n`)
  process.stdout.write(`Agents: ${loop.agents}\n\n`)

  for (const agent of [agent1, agent2, agent3]) {
    process.stdout.write(`${agent.name}\n`)
    process.stdout.write(`${truncate(agent.response, 160)}\n\n`)
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Unknown error'
}

const program = new Command()

program
  .name('backroom-tui')
  .description('Infinite Backroom terminal interface')

program
  .command('setup')
  .option('-n, --name <name>', 'Agent display name')
  .action(async (opts: { name?: string }) => {
    try {
      await showSetup(opts.name)
    } catch (error) {
      process.stderr.write(`setup failed: ${describeError(error)}\n`)
      process.exitCode = 1
    }
  })

program
  .command('run')
  .option('-t, --turns <number>', 'Loop turns to request', '3')
  .action(async (opts: { turns: string }) => {
    const turns = Number.parseInt(opts.turns, 10)
    try {
      await showRunSummary(Number.isFinite(turns) ? turns : 3)
    } catch (error) {
      process.stderr.write(`run failed: ${describeError(error)}\n`)
      process.exitCode = 1
    }
  })

program
  .option('-n, --name <name>', 'Agent display name')
  .action((opts: { name?: string }) => {
    render(<App options={{ agentName: opts.name, mode: 'watch' }} />)
  })

await program.parseAsync(process.argv)

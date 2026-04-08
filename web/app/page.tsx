import Link from 'next/link'

const badgeItems = [
  '31 MCP tools',
  '18 buddies',
  '9 animations',
  'Fly.io deployable',
  'Telegram gateway',
  'iii worker swarm',
]

const installCommands = [
  'npx solana-clawd demo',
  'npx solana-clawd birth',
  'npm i -g solana-clawd',
]

const capabilityCards = [
  {
    title: 'MCP Tools',
    eyebrow: 'Live Solana access',
    body:
      'Market data, Helius RPC/DAS, memory tiers, agent fleet, Metaplex agent registry, and skill loading through one MCP surface.',
    bullets: ['Trending + price data', 'Wallet + DAS lookups', 'Read/write memory', 'Agent spawn + stop'],
  },
  {
    title: 'Blockchain Buddies',
    eyebrow: 'Companion system',
    body:
      'Procedurally generated Solana-native companions with rarity, personality, wallet simulation, stat rolls, and animated ASCII sprites.',
    bullets: ['18 species', '8 stat categories', 'Paper trading wallets', 'Terminal-native sprites'],
  },
  {
    title: 'Gateway + TailClawd',
    eyebrow: 'Operate from anywhere',
    body:
      'Telegram control plane, HTTP gateway, Birdeye streams, and the TailClawd browser UI for remote command-center workflows.',
    bullets: ['Telegram bot', 'HTTP API', 'Birdeye WebSocket alerts', 'Mobile-friendly control surface'],
  },
  {
    title: 'Worker Swarm',
    eyebrow: 'Distributed execution',
    body:
      'A four-worker iii SDK quickstart spanning TypeScript, Rust, and Python for research, pricing, transaction building, and payments.',
    bullets: ['TypeScript client orchestrator', 'Rust compute worker', 'Python data worker', 'TS payment worker'],
  },
]

const architectureRows = [
  ['Clawd Code Layer', 'solana-clawd Equivalent'],
  ['State store', 'Reactive app state with OODA phase, memory, subscriptions'],
  ['Agent toolset', 'Explore, Scanner, OODA, Dream, Analyst, Monitor, Metaplex'],
  ['Bridge / transport', 'Gateway SSE + MCP transports'],
  ['Permissions', 'Deny-first trade gating'],
]

const quickstartOptions = [
  {
    title: 'Clawd Desktop',
    code: `{
  "mcpServers": {
    "solana-clawd": {
      "command": "node",
      "args": ["/absolute/path/to/solana-clawd/mcp-server/dist/index.js"],
      "env": {
        "HELIUS_API_KEY": "your-free-key"
      }
    }
  }
}`,
  },
  {
    title: 'Cursor / VS Code',
    code: `{
  "solana-clawd": {
    "command": "node",
    "args": ["mcp-server/dist/index.js"],
    "cwd": "/path/to/solana-clawd"
  }
}`,
  },
  {
    title: 'Public HTTP',
    code: `{
  "solana-clawd": {
    "type": "http",
    "url": "https://solana-clawd.fly.dev/mcp"
  }
}`,
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.14),transparent_32%),linear-gradient(180deg,#020617_0%,#030712_40%,#000000_100%)] text-green-100">
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(34,197,94,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.16)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="pointer-events-none fixed inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.02)_3px,rgba(255,255,255,0.02)_4px)]" />

      <section className="relative mx-auto flex max-w-7xl flex-col px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="rounded-full border border-green-500/20 bg-black/30 px-4 py-2 text-center font-mono text-xs uppercase tracking-[0.3em] text-green-300/80 backdrop-blur">
          solana-clawd / agentic engine / solana-native runtime
        </div>

        <div className="mx-auto mt-10 max-w-5xl text-center">
          <pre className="overflow-x-auto font-mono text-[10px] leading-tight text-green-400 sm:text-xs md:text-sm">
            {String.raw`  _____       __                        ________                    __
 / ___/____  / /___ _____  ____ _     / ____/ /___ __      ______/ /
 \__ \/ __ \/ / __ \`/ __ \/ __ \`/   / /   / / __ \`/ | /| / / __  /
___/ / /_/ / / /_/ / / / / /_/ /   / /___/ / /_/ /| |/ |/ / /_/ /
/____/\____/_/\__,_/_/ /_/\__,_/    \____/_/\__,_/ |__/|__/\__,_/`}
          </pre>

          <h1 className="mt-8 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            The agentic engine Solana deserves.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-green-100/70 sm:text-lg">
            31 MCP tools. Blockchain Buddies. Custom unicode animations. One command.
            A Solana-native adaptation of the Clawd workflow, packaged for MCP clients,
            Telegram control, browser ops, and distributed worker execution.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 font-mono text-sm text-green-200">
            <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2">
              Powered by $CLAWD on Solana &amp; Pump.fun
            </span>
            <code className="rounded-full border border-green-500/30 bg-black/50 px-4 py-2 text-green-300">
              8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump
            </code>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {badgeItems.map((item) => (
              <span
                key={item}
                className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-sm text-green-200/90"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/buddies"
              className="rounded-lg border border-green-400 bg-green-400 px-6 py-3 font-mono text-sm font-semibold text-black transition hover:bg-green-300"
            >
              Hatch A Buddy
            </Link>
            <Link
              href="/voice"
              className="rounded-lg border border-purple-400 bg-purple-500/20 px-6 py-3 font-mono text-sm font-semibold text-purple-200 transition hover:bg-purple-500/30 hover:border-purple-300 hover:text-white"
            >
              Talk to Clawd
            </Link>
            <a
              href="https://github.com/x402agent/solana-clawd"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-green-500/30 bg-black/40 px-6 py-3 font-mono text-sm font-semibold text-green-200 transition hover:border-green-400 hover:text-white"
            >
              View GitHub
            </a>
          </div>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-green-500/20 bg-black/40 p-6 backdrop-blur">
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-green-400/80">
              One-Shot Install
            </div>
            <div className="mt-4 space-y-3 rounded-xl border border-green-500/10 bg-black/60 p-4 font-mono text-sm text-green-200">
              {installCommands.map((command) => (
                <div key={command} className="flex items-start gap-3">
                  <span className="text-cyan-400">{'>'}</span>
                  <code className="break-all">{command}</code>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-green-100/60">
              No private key. No wallet. No paid API required for the default path.
              Clone it, run it, ask it for prices, wallet activity, scanners, or deployable listener code.
            </p>
          </div>

          <div className="rounded-2xl border border-green-500/20 bg-black/40 p-6 backdrop-blur">
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-green-400/80">
              Example Flow
            </div>
            <div className="mt-4 space-y-4 font-mono text-sm text-green-200">
              <div className="rounded-xl border border-green-500/10 bg-black/60 p-4">
                <div className="text-cyan-400">You</div>
                <div className="mt-2">&quot;What are the top 5 trending tokens right now?&quot;</div>
                <div className="mt-2 text-green-400/70">solana_trending → live data with security scores and volume</div>
              </div>
              <div className="rounded-xl border border-green-500/10 bg-black/60 p-4">
                <div className="text-cyan-400">You</div>
                <div className="mt-2">&quot;Research BONK for a potential trade&quot;</div>
                <div className="mt-2 text-green-400/70">token info + traders + DAS + memory recall → structured report</div>
              </div>
              <div className="rounded-xl border border-green-500/10 bg-black/60 p-4">
                <div className="text-cyan-400">You</div>
                <div className="mt-2">&quot;Start a Pump.fun scanner&quot;</div>
                <div className="mt-2 text-green-400/70">scanner agent + Telegram routing + watchlist workflow</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {capabilityCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-green-500/20 bg-black/40 p-6 backdrop-blur"
            >
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-green-400/70">
                {card.eyebrow}
              </div>
              <h2 className="mt-3 text-xl font-semibold text-white">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-green-100/65">{card.body}</p>
              <ul className="mt-5 space-y-2 text-sm text-green-200/85">
                {card.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="text-cyan-400">{'>'}</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-green-500/20 bg-black/40 p-6 backdrop-blur">
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-green-400/80">
              Architecture
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-green-500/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-green-500/10 text-green-200">
                  <tr>
                    {architectureRows[0]?.map((heading) => (
                      <th key={heading} className="px-4 py-3 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {architectureRows.slice(1).map(([left, right]) => (
                    <tr key={left} className="border-t border-green-500/10 text-green-100/75">
                      <td className="px-4 py-3 font-mono text-green-300">{left}</td>
                      <td className="px-4 py-3">{right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-green-500/20 bg-black/40 p-6 backdrop-blur">
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-green-400/80">
              Quick Start
            </div>
            <div className="mt-4 grid gap-4">
              {quickstartOptions.map((option) => (
                <div key={option.title} className="rounded-xl border border-green-500/10 bg-black/60 p-4">
                  <div className="mb-3 text-sm font-semibold text-white">{option.title}</div>
                  <pre className="overflow-x-auto text-xs leading-6 text-green-200">
                    <code>{option.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-green-500/20 bg-black/50 p-8 text-center backdrop-blur">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-green-400/70">
            Ready To Deploy
          </div>
          <h2 className="mt-4 text-3xl font-semibold text-white">
            Package, MCP server, gateway, worker swarm, and web surface aligned.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-green-100/65">
            Use the website as the polished top-of-funnel, the MCP server as the integration layer,
            the gateway for Telegram-native control, and TailClawd for browser-based operations.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="https://github.com/x402agent/solana-clawd"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-green-400 bg-green-400 px-6 py-3 font-mono text-sm font-semibold text-black transition hover:bg-green-300"
            >
              Open Repository
            </a>
            <Link
              href="/buddies"
              className="rounded-lg border border-green-500/30 bg-black/40 px-6 py-3 font-mono text-sm font-semibold text-green-200 transition hover:border-green-400 hover:text-white"
            >
              Explore Buddies Terminal
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

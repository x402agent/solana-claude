import Link from 'next/link'

const badgeItems = [
  '31 MCP tools',
  '7 built-in agents',
  '89 skills',
  '3 memory tiers',
  'Helius + Jupiter + Pump.fun',
  'Web + Telegram + voice',
]

const installCommands = [
  'npx solana-clawd demo',
  'npx solana-clawd birth',
  'npm i -g solana-clawd',
]

const capabilityCards = [
  {
    title: 'MCP + Agent Fleet',
    eyebrow: 'Live Solana finance operations',
    body:
      'Market data, Helius RPC/DAS, memory tiers, built-in agents, Metaplex agent registry, and skill loading through one operator surface.',
    bullets: ['Explore, Scanner, OODA, Dream', 'Wallet + DAS lookups', 'Read/write memory', 'Agent spawn + stop'],
  },
  {
    title: 'Knowledge Surfaces',
    eyebrow: 'Docs, wiki, skills, and control UI',
    body:
      'The web app, wiki, docs browser, and skills catalog are positioned as one Solana blockchain and finance stack instead of disconnected demos.',
    bullets: ['web/app operator UI', 'web/wiki operational memory', 'web/skills catalog', 'docs + architecture map'],
  },
  {
    title: 'Execution + Risk Rails',
    eyebrow: 'Finance-safe by default',
    body:
      'Deny-first permissions, risk-aware execution, memory promotion, and routing across Helius, Jupiter, Pump.fun, and Metaplex keep the stack finance-native.',
    bullets: ['Risk engine', 'Permission engine', 'OODA memory loop', 'Jupiter + Pump.fun flows'],
  },
  {
    title: 'Control Surface',
    eyebrow: 'Operate from anywhere',
    body:
      'Telegram control plane, browser ops, buddy terminal, voice interface, and the gateway layer all map back to the same runtime under src/.',
    bullets: ['Telegram bot', 'Voice assistant', 'Buddy terminal', 'Gateway + server integration'],
  },
]

const architectureRows = [
  ['Surface', 'Connected modules'],
  ['Home, docs, voice, buddies', 'web/app -> src/server, src/gateway, src/voice, src/buddy'],
  ['Wiki knowledge base', 'web/wiki + wiki-data -> OODA memory model and operator docs'],
  ['Skills catalog', 'skills/ + scripts/generate-skills-catalog.js -> web/skills/catalog.json'],
  ['Agent runtime', 'src/agents + src/coordinator + src/tasks + src/query-engine'],
  ['Execution + risk', 'src/helius + src/pump + src/metaplex + src/engine/risk-engine.ts'],
]

const quickstartOptions = [
  {
    title: 'Clawd Desktop',
    code: `{
  "mcpServers": {
    "solana-clawd": {
      "command": "node",
      "args": ["/absolute/path/to/solana-clawd/MCP/dist/index.js"],
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
    "args": ["MCP/dist/index.js"],
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
          $clawd / solana blockchain agents / finance runtime
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
            The Solana blockchain and finance agent stack for $CLAWD.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-green-100/70 sm:text-lg">
            31 MCP tools, 7 built-in agents, 89 skills, a connected wiki, and a web control surface.
            This repo packages research, execution, monitoring, memory, and operator UX for Solana-native
            blockchain and finance workflows under one $CLAWD runtime.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 font-mono text-sm text-green-200">
            <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2">
              Powered by $CLAWD on Solana
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

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/buddies"
              className="rounded-lg border border-green-400 bg-green-400 px-6 py-3 font-mono text-sm font-semibold text-black transition hover:bg-green-300"
            >
              Hatch A Buddy
            </Link>
            <Link
              href="/trade"
              className="rounded-lg border border-orange-400 bg-orange-500/20 px-6 py-3 font-mono text-sm font-semibold text-orange-200 transition hover:bg-orange-500/30 hover:border-orange-300 hover:text-white"
            >
              Trading Skill
            </Link>
            <Link
              href="/docs"
              className="rounded-lg border border-purple-400 bg-purple-500/20 px-6 py-3 font-mono text-sm font-semibold text-purple-200 transition hover:bg-purple-500/30 hover:border-purple-300 hover:text-white"
            >
              Browse Runtime Docs
            </Link>
            <Link
              href="/migrate"
              className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-6 py-3 font-mono text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-white"
            >
              Migrate from OpenClaw
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
              Clone it, run it, and use the same stack for prices, wallet activity, scanners, risk checks,
              OODA loops, wiki context, or deployable monitoring code.
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
                <div className="mt-2">&quot;Run the OODA + Scanner loop for the $CLAWD watchlist&quot;</div>
                <div className="mt-2 text-green-400/70">scanner agent + memory tiers + risk rails + operator workflow</div>
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
            Package, docs, wiki, skills catalog, runtime, and web surface aligned.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-green-100/65">
            Use the website as the operator shell, the wiki as the internal map, the skills catalog as the
            discovery surface, the MCP server as the integration layer, and the gateway for Telegram-native control.
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

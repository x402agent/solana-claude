"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const steps = [
  { num: "1", label: "Preview", cmd: "clawd migrate --dry-run", desc: "See what will change without touching files" },
  { num: "2", label: "Migrate", cmd: "clawd migrate", desc: "Apply config, memory, skills, and wallet migration" },
  { num: "3", label: "Verify", cmd: "clawd doctor", desc: "Validate config, API keys, and Helius connectivity" },
  { num: "4", label: "Start", cmd: "clawd ooda start", desc: "Begin the OODA trading loop with migrated config" },
];

export function MigrateClient({ content }: { content: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <header className="sticky top-0 z-50 border-b border-[#1a1a2e] bg-[#0a0a0f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <Link href="/" className="text-lg font-bold text-[#9945FF]">
            $CLAWD
          </Link>
          <span className="text-sm text-gray-500">/</span>
          <span className="text-sm font-semibold text-[#14F195]">Migrate from OpenClaw</span>
          <nav className="ml-auto flex gap-2">
            <Link href="/docs" className="rounded-md px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200">Docs</Link>
            <Link href="/trade" className="rounded-md px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200">Trade</Link>
            <Link href="/buddies" className="rounded-md px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200">Buddies</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-10 pb-8">
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/5 p-8">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-purple-400/80">
            OpenClaw / Legacy Config Migration
          </div>
          <h1 className="mt-4 text-4xl font-bold text-white">
            Migrate to solana-clawd
          </h1>
          <p className="mt-3 max-w-3xl text-base text-gray-400">
            One command migrates your persona, memory, skills, MCP servers, model config, wallet, and OODA loop settings.
            Private keys are never read or copied.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-7xl px-6 pb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.num} className="rounded-xl border border-[#1a1a2e] bg-black/40 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#9945FF]/20 font-mono text-sm font-bold text-[#9945FF]">
                  {s.num}
                </div>
                <span className="font-semibold text-white">{s.label}</span>
              </div>
              <code className="mt-3 block rounded-lg bg-black/60 px-3 py-2 font-mono text-sm text-[#14F195]">
                {s.cmd}
              </code>
              <p className="mt-2 text-xs text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Full Markdown */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <article className="prose prose-invert prose-headings:text-[#14F195] prose-a:text-[#9945FF] prose-code:text-[#ff6b35] prose-pre:bg-[#111127] prose-pre:border prose-pre:border-[#1a1a2e] prose-table:text-sm prose-th:text-[#14F195] max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      </section>
    </div>
  );
}

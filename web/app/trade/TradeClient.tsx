"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const tiers = [
  { name: "Fresh Snipers", criteria: "age <= 15m", strategy: "Fast flip, 2-5x, 10min TTL", size: "0.05 SOL", risk: "degen", color: "text-red-400" },
  { name: "Near-Graduation", criteria: "bonding >= 75%", strategy: "Ride pump, exit before 100%", size: "0.1 SOL", risk: "high", color: "text-orange-400" },
  { name: "Micro-Cap", criteria: "MC < $10K", strategy: "Speculative, high risk", size: "0.05 SOL", risk: "high", color: "text-yellow-400" },
  { name: "Mid-Cap", criteria: "MC $10K-$100K", strategy: "Trend-follow, trailing stop", size: "0.2 SOL", risk: "medium", color: "text-cyan-400" },
  { name: "Large-Cap", criteria: "MC > $100K", strategy: "Scalps on dips", size: "0.3 SOL", risk: "low", color: "text-green-400" },
];

const oodaSteps = [
  { phase: "OBSERVE", tools: "solana_trending, scan_pump_token, memory_recall(KNOWN)", color: "text-blue-400" },
  { phase: "ORIENT", tools: "solana_token_info, solana_top_traders, score candidates", color: "text-purple-400" },
  { phase: "DECIDE", tools: "score >= 60 -> trade plan -> memory_write(INFERRED)", color: "text-yellow-400" },
  { phase: "ACT", tools: "HUMAN APPROVAL -> Jupiter swap -> memory_write(KNOWN)", color: "text-red-400" },
  { phase: "LEARN", tools: "write outcome -> Dream agent promotes to LEARNED", color: "text-green-400" },
];

export function TradeClient({ content }: { content: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <header className="sticky top-0 z-50 border-b border-[#1a1a2e] bg-[#0a0a0f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <Link href="/" className="text-lg font-bold text-[#9945FF]">
            $CLAWD
          </Link>
          <span className="text-sm text-gray-500">/</span>
          <span className="text-sm font-semibold text-[#14F195]">Pump.fun Trading Skill</span>
          <nav className="ml-auto flex gap-2">
            <Link href="/docs" className="rounded-md px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200">Docs</Link>
            <Link href="/buddies" className="rounded-md px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200">Buddies</Link>
            <Link href="/voice" className="rounded-md px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200">Voice</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-10 pb-8">
        <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-transparent to-red-500/5 p-8">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-orange-400/80">
            OODA Trading Loop / Pump.fun
          </div>
          <h1 className="mt-4 text-4xl font-bold text-white">
            Token Classification &amp; Execution Workflow
          </h1>
          <p className="mt-3 max-w-3xl text-base text-gray-400">
            Five token tiers, deny-first permission gating, position sizing rules, and guardrails.
            All trades require human approval. No silent buys. No surprise executions.
          </p>
        </div>
      </section>

      {/* Tier Cards */}
      <section className="mx-auto max-w-7xl px-6 pb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {tiers.map((t) => (
            <div key={t.name} className="rounded-xl border border-[#1a1a2e] bg-black/40 p-5">
              <div className={`font-mono text-xs font-bold uppercase ${t.color}`}>{t.name}</div>
              <div className="mt-2 text-sm text-gray-300">{t.criteria}</div>
              <div className="mt-1 text-xs text-gray-500">{t.strategy}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-xs text-gray-300">{t.size}</span>
                <span className={`text-xs font-medium ${t.color}`}>{t.risk}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* OODA Flow */}
      <section className="mx-auto max-w-7xl px-6 pb-8">
        <div className="rounded-2xl border border-[#1a1a2e] bg-black/40 p-6">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#14F195]/80">
            OODA Execution Flow
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {oodaSteps.map((step, i) => (
              <div key={step.phase} className="flex items-start gap-4">
                <div className={`w-20 shrink-0 font-mono text-sm font-bold ${step.color}`}>
                  {step.phase}
                </div>
                {i < oodaSteps.length - 1 && (
                  <div className="mt-1 text-gray-600">{">"}</div>
                )}
                <div className="font-mono text-sm text-gray-400">{step.tools}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center font-mono text-xs text-red-300">
            ACT phase is permission-gated. All trade_execute calls require explicit human approval.
          </div>
        </div>
      </section>

      {/* Full Markdown */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <details className="group">
          <summary className="cursor-pointer rounded-lg border border-[#1a1a2e] bg-black/40 px-6 py-4 text-sm font-semibold text-[#14F195] transition hover:border-[#14F195]/30">
            View Full TRADE.md Specification
          </summary>
          <article className="mt-4 prose prose-invert prose-headings:text-[#14F195] prose-a:text-[#9945FF] prose-code:text-[#ff6b35] prose-pre:bg-[#111127] prose-pre:border prose-pre:border-[#1a1a2e] prose-table:text-sm prose-th:text-[#14F195] max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </article>
        </details>
      </section>
    </div>
  );
}

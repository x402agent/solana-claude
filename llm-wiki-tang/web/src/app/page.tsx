'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useUserStore } from '@/stores'
import Image from 'next/image'
import { ArrowRight, BookOpen, FileText, PenTool, Search, GitBranch } from 'lucide-react'

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

const WIKI_TREE = [
  { label: 'Overview', active: true, depth: 0 },
  { label: 'Tokens', depth: 0, folder: true },
  { label: '$CLAWD', depth: 1 },
  { label: 'dSOLANA', depth: 1 },
  { label: 'Agents', depth: 0, folder: true },
  { label: 'OODA Trader', depth: 1 },
  { label: 'Sources', depth: 0, folder: true },
  { label: 'Execution Log', depth: 0 },
]

export default function LandingPage() {
  const user = useUserStore((s) => s.user)
  const router = useRouter()

  React.useEffect(() => {
    if (user) router.replace('/wikis')
  }, [user, router])

  return (
    <div className="min-h-svh bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 lg:px-10 h-14 bg-background/80 backdrop-blur-sm">
        <span className="flex items-center gap-2.5 text-sm font-semibold tracking-tight">
          <img
            src="https://pub-9a12d2869ea54d26bc39b55ba9a84e9a.r2.dev/gfx/logo1.png"
            alt="Clawd Vault"
            width={28}
            height={28}
            className="logo-neon-glow rounded-md"
          />
          Clawd Vault
        </span>
        <div className="flex items-center gap-5">
          <Link
            href="https://github.com/x402agent/solana-clawd"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 lg:px-10">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease }}
            className="mb-8 flex justify-center"
          >
            <div className="relative">
              <div className="logo-neon-glow-ring" />
              <img
                src="https://pub-9a12d2869ea54d26bc39b55ba9a84e9a.r2.dev/gfx/logo1.png"
                alt="Clawd Vault Logo"
                width={120}
                height={120}
                className="logo-neon-glow relative z-10 rounded-2xl"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease }}
          >
            <p className="text-sm text-muted-foreground mb-4">
              Solana research vault for{' '}
              <Link
                href="https://github.com/x402agent/solana-clawd"
                className="text-foreground underline underline-offset-2 decoration-foreground/30 hover:decoration-foreground transition-colors"
              >
                solana-clawd, dSolana workflows, and autonomous financial blockchain agents
              </Link>
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Clawd Vault
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12, ease }}
            className="mt-6 text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed"
          >
            solana-clawd compiles and maintains a structured research vault for `$CLAWD`, dSolana theses, wallet clusters, protocol risk, and autonomous trade playbooks.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease }}
            className="mt-9 flex items-center justify-center gap-3"
          >
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Get started
              <ArrowRight className="size-3.5 opacity-60" />
            </Link>
            <Link
              href="https://github.com/x402agent/solana-clawd"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              GitHub
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Product Preview */}
      <section className="px-6 lg:px-10 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease }}
          className="max-w-5xl mx-auto"
        >
          <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex gap-1.5">
                <div className="size-2.5 rounded-full bg-border" />
                <div className="size-2.5 rounded-full bg-border" />
                <div className="size-2.5 rounded-full bg-border" />
              </div>
              <div className="flex-1 flex justify-center">
                <span className="text-xs text-muted-foreground/50 font-mono">
                  solanaclawd.net
                </span>
              </div>
              <div className="w-14" />
            </div>

            <div className="flex min-h-[400px]">
              {/* Sidebar */}
              <div className="w-52 shrink-0 border-r border-border p-3 hidden sm:block">
                <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                  <Search className="size-3 text-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground/30">Search vault...</span>
                </div>
                <div className="space-y-0.5">
                  {WIKI_TREE.map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                        item.active
                          ? 'bg-accent font-medium text-foreground'
                          : 'text-muted-foreground'
                      }`}
                      style={{ paddingLeft: `${item.depth * 14 + 8}px` }}
                    >
                      {item.folder ? (
                        <GitBranch className="size-3 opacity-40" />
                      ) : (
                        <FileText className="size-3 opacity-40" />
                      )}
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-8 sm:p-10">
                <div className="max-w-lg">
                  <h2 className="text-xl font-semibold tracking-tight mb-1">Overview</h2>
                  <p className="text-xs text-muted-foreground mb-6">
                    12 sources &middot; Last updated 2 hours ago
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    This vault tracks Solana memecoin rotation, dSolana strategy flow, wallet behavior, and protocol catalysts for autonomous financial agents.
                    It synthesizes findings from <span className="font-medium text-foreground">12 sources</span> across 47 pages.
                  </p>
                  <h3 className="text-sm font-semibold mt-5 mb-2">Key Findings</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Smart-money wallet inflows have started rotating from majors into{' '}
                    <span className="font-medium text-foreground">$CLAWD and other high-beta Solana assets</span> &mdash;
                    dSOLANA strategy notes, Jupiter routing dependencies, and execution risk thresholds are now linked inside one dossier.
                  </p>
                  <h3 className="text-sm font-semibold mt-5 mb-2">Recent Updates</h3>
                  <ul className="space-y-1 ml-4">
                    <li className="text-sm text-muted-foreground list-disc">Added `$CLAWD` wallet-cluster notes and execution review links</li>
                    <li className="text-sm text-muted-foreground list-disc">Updated dSOLANA strategy thesis with Jupiter routing and fee notes</li>
                    <li className="text-sm text-muted-foreground list-disc">Flagged contradiction between autonomous buy criteria and holder concentration risk</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto border-t border-border" />

      {/* Three Layers */}
      <section className="px-6 lg:px-10 py-24">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Three layers</h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">
              You define the research standard. The agent maintains the vault.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: 'Raw Sources',
                body: 'Whitepapers, wallet exports, filings, execution journals, screenshots, governance posts, and token dashboards. Immutable source of truth.',
              },
              {
                icon: BookOpen,
                title: 'The Vault',
                body: 'LLM-generated markdown pages with `$CLAWD` dossiers, dSOLANA theses, wallet notes, strategy memos, execution reviews, and cross-references.',
              },
              {
                icon: PenTool,
                title: 'The Workflows',
                body: 'A repeatable structure for ingest, research, thesis updates, autonomous trade review, and contradiction tracking across the whole graph.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-card rounded-xl border border-border p-6"
              >
                <item.icon className="size-5 text-muted-foreground mb-4" strokeWidth={1.5} />
                <h3 className="font-semibold text-sm mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto border-t border-border" />

      {/* How It Works */}
      <section className="px-6 lg:px-10 py-24">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">How it works</h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-10 sm:gap-8">
            {[
              {
                step: '01',
                title: 'Ingest',
                body: 'Drop in a whitepaper, wallet export, dashboard PDF, or trade journal. The agent writes a summary, updates token, protocol, wallet, strategy, and execution pages, and flags contradictions.',
              },
              {
                step: '02',
                title: 'Query',
                body: 'Ask complex questions against the compiled vault. Knowledge is already synthesized, cross-linked, and citation-aware instead of being re-derived from raw chunks every time.',
              },
              {
                step: '03',
                title: 'Lint',
                body: 'Run health checks over the vault. Find stale theses, unsupported claims, missing token-to-protocol links, untracked wallet behavior, and unreviewed autonomous trading decisions.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <span className="text-xs font-mono text-muted-foreground/40 mb-3 block">{item.step}</span>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto border-t border-border" />

      {/* Quote */}
      <section className="px-6 lg:px-10 py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mx-auto text-center"
        >
          <blockquote className="text-lg sm:text-xl leading-relaxed text-foreground/80 italic">
            &ldquo;The hard part of autonomous trading research is not finding one more chart. It is keeping every thesis, wallet note, catalyst, execution rule, and contradiction in sync as the market moves.&rdquo;
          </blockquote>
          <p className="mt-5 text-sm text-muted-foreground">
            solana-clawd research workflow
          </p>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto border-t border-border" />

      {/* CTA */}
      <section className="px-6 lg:px-10 py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="max-w-md mx-auto text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">Start building your vault</h2>
          <p className="text-muted-foreground mb-8">
            Replace scattered notes with a compounding Solana research graph for `$CLAWD`, dSolana theses, and autonomous financial agents.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-7 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Get started free
            <ArrowRight className="size-3.5 opacity-60" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 lg:px-10 py-6 flex items-center justify-between text-xs text-muted-foreground/50">
        <span>Clawd Vault</span>
        <span>Free &amp; open source &middot; Apache 2.0</span>
      </footer>
    </div>
  )
}

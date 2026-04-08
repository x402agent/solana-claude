import Link from "next/link";
import { getAllArticles, getWikiTree, getOODAContext } from "@/lib/store";

export const dynamic = "force-dynamic";

function TierBadge({ tier }: { tier: string }) {
  const cls = tier === "KNOWN" ? "tier-known" : tier === "LEARNED" ? "tier-learned" : "tier-inferred";
  return <span className={`text-xs border px-1.5 py-0.5 rounded ${cls}`}>{tier}</span>;
}

export default function WikiHome() {
  const tree = getWikiTree();
  const ooda = getOODAContext();
  const totalArticles = getAllArticles().length;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="w-64 border-r border-[var(--clawd-border)] bg-[var(--clawd-surface)] p-4 flex-shrink-0">
        <div className="mb-6">
          <h1 className="text-lg font-bold crt-glow">CLAWD WIKI</h1>
          <p className="text-xs text-[var(--clawd-dim)] mt-1">Solana Trading Intelligence</p>
          <div className="flex gap-2 mt-3 text-xs">
            <span className="tier-known">{ooda.known.length} KNOWN</span>
            <span className="tier-learned">{ooda.learned.length} LEARNED</span>
            <span className="tier-inferred">{ooda.inferred.length} INFERRED</span>
          </div>
        </div>

        {tree.map((cat) => (
          <div key={cat.category} className="mb-4">
            <h3 className="text-xs uppercase text-[var(--clawd-dim)] mb-1.5 tracking-wider">
              {cat.icon} {cat.label}
            </h3>
            <ul className="space-y-1">
              {cat.articles.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/wiki/${a.slug}`}
                    className="block text-sm px-2 py-1 rounded hover:bg-[var(--clawd-border)] transition-colors"
                  >
                    {a.title}
                    <TierBadge tier={a.memoryTier} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="mt-6 pt-4 border-t border-[var(--clawd-border)]">
          <Link href="/api/articles" className="text-xs text-[var(--clawd-dim)] hover:text-[var(--clawd-green)]">
            API: /api/articles
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-8 max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold crt-glow mb-2">CLAWD Wiki</h1>
          <p className="text-[var(--clawd-dim)]">
            AI-compiled knowledge base for Solana trading agents.{" "}
            <span className="text-[var(--clawd-green)]">{totalArticles}</span> articles across{" "}
            <span className="text-[var(--clawd-purple)]">{tree.length}</span> categories.
          </p>
        </header>

        {/* OODA Context Summary */}
        <section className="grid grid-cols-3 gap-4 mb-8">
          <div className="border border-blue-500/30 bg-blue-500/5 rounded-lg p-4">
            <h3 className="text-sm font-bold tier-known mb-2">KNOWN ({ooda.known.length})</h3>
            <p className="text-xs text-[var(--clawd-dim)]">Fresh market data. Expires automatically.</p>
            {ooda.known.slice(0, 3).map((a) => (
              <Link key={a.id} href={`/wiki/${a.slug}`} className="block text-xs mt-1 text-blue-400 hover:underline">
                {a.title}
              </Link>
            ))}
          </div>
          <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-4">
            <h3 className="text-sm font-bold tier-learned mb-2">LEARNED ({ooda.learned.length})</h3>
            <p className="text-xs text-[var(--clawd-dim)]">Validated patterns. Permanent.</p>
            {ooda.learned.slice(0, 3).map((a) => (
              <Link key={a.id} href={`/wiki/${a.slug}`} className="block text-xs mt-1 text-green-400 hover:underline">
                {a.title}
              </Link>
            ))}
          </div>
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-4">
            <h3 className="text-sm font-bold tier-inferred mb-2">INFERRED ({ooda.inferred.length})</h3>
            <p className="text-xs text-[var(--clawd-dim)]">Tentative signals. Needs Dream validation.</p>
            {ooda.inferred.slice(0, 3).map((a) => (
              <Link key={a.id} href={`/wiki/${a.slug}`} className="block text-xs mt-1 text-amber-400 hover:underline">
                {a.title}
              </Link>
            ))}
          </div>
        </section>

        {/* Recent articles */}
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ color: "var(--clawd-purple)" }}>
            All Articles
          </h2>
          <div className="space-y-3">
            {getAllArticles().map((a) => (
              <Link
                key={a.id}
                href={`/wiki/${a.slug}`}
                className="block border border-[var(--clawd-border)] rounded-lg p-4 hover:border-[var(--clawd-purple)] transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold">{a.title}</span>
                  <TierBadge tier={a.memoryTier} />
                  <span className="text-xs text-[var(--clawd-dim)]">{a.category}</span>
                </div>
                <p className="text-xs text-[var(--clawd-dim)]">{a.summary}</p>
                <div className="flex gap-1 mt-2">
                  {a.tags.slice(0, 5).map((t) => (
                    <span key={t} className="text-[10px] bg-[var(--clawd-surface)] border border-[var(--clawd-border)] px-1.5 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

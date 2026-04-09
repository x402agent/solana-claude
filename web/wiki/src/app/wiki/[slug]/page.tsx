import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getArticleBySlug, getWikiTree } from "@/lib/store";

export const dynamic = "force-dynamic";

function TierBadge({ tier }: { tier: string }) {
  const cls = tier === "KNOWN" ? "tier-known" : tier === "LEARNED" ? "tier-learned" : "tier-inferred";
  return <span className={`text-xs border px-1.5 py-0.5 rounded ${cls}`}>{tier}</span>;
}

export default async function WikiArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const tree = getWikiTree();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="w-64 border-r border-[var(--clawd-border)] bg-[var(--clawd-surface)] p-4 flex-shrink-0">
        <Link href="/" className="block mb-6">
          <h1 className="text-lg font-bold crt-glow">CLAWD WIKI</h1>
          <p className="text-xs text-[var(--clawd-dim)] mt-1">Solana Blockchain &amp; Finance Agents</p>
        </Link>
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
                    className={`block text-sm px-2 py-1 rounded transition-colors ${
                      a.slug === slug
                        ? "bg-[var(--clawd-purple)]/20 text-[var(--clawd-green)]"
                        : "hover:bg-[var(--clawd-border)]"
                    }`}
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Article */}
      <main className="flex-1 p-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="text-xs text-[var(--clawd-dim)] hover:text-[var(--clawd-green)]">
            &larr; Back to wiki
          </Link>
        </div>

        <header className="mb-6 pb-4 border-b border-[var(--clawd-border)]">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{article.title}</h1>
            <TierBadge tier={article.memoryTier} />
            {article.riskLevel && (
              <span className={`text-xs px-1.5 py-0.5 rounded border ${
                article.riskLevel === "degen" ? "border-red-500 text-red-400" :
                article.riskLevel === "high" ? "border-orange-500 text-orange-400" :
                article.riskLevel === "medium" ? "border-yellow-500 text-yellow-400" :
                "border-green-500 text-green-400"
              }`}>
                {article.riskLevel} risk
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--clawd-dim)]">{article.summary}</p>
          <div className="flex gap-1.5 mt-3">
            {article.tags.map((t) => (
              <span key={t} className="text-[10px] bg-[var(--clawd-surface)] border border-[var(--clawd-border)] px-1.5 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>

          {/* Metadata chips */}
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            {article.metadata.symbol && <span className="text-[var(--clawd-green)]">${article.metadata.symbol}</span>}
            {article.metadata.mint && <span className="text-[var(--clawd-dim)]">Mint: {article.metadata.mint.slice(0, 8)}...</span>}
            {article.metadata.agentType && <span className="text-[var(--clawd-purple)]">Agent: {article.metadata.agentType}</span>}
            {article.metadata.signalScore != null && <span>Score: {article.metadata.signalScore}/100</span>}
          </div>
        </header>

        {/* Markdown content */}
        <article className="wiki-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {article.content}
          </ReactMarkdown>
        </article>

        {/* Sources */}
        {article.sources.length > 0 && (
          <footer className="mt-8 pt-4 border-t border-[var(--clawd-border)]">
            <h3 className="text-xs uppercase text-[var(--clawd-dim)] mb-2 tracking-wider">Sources</h3>
            <ul className="space-y-1">
              {article.sources.map((s, i) => (
                <li key={i} className="text-xs text-[var(--clawd-dim)]">
                  [{s.type}] {s.url ? <a href={s.url} className="text-[var(--clawd-purple)] hover:underline">{s.label}</a> : s.label}
                </li>
              ))}
            </ul>
          </footer>
        )}

        {/* Meta */}
        <div className="mt-6 text-xs text-[var(--clawd-dim)]">
          v{article.version} &middot; Updated {new Date(article.updatedAt).toLocaleDateString()} &middot; Category: {article.category}
        </div>
      </main>
    </div>
  );
}

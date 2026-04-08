"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Doc {
  slug: string;
  label: string;
  content: string;
}

export function DocsClient({ docs }: { docs: Doc[] }) {
  const [active, setActive] = useState(docs[0]?.slug ?? "");
  const current = docs.find((d) => d.slug === active) ?? docs[0];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#1a1a2e] bg-[#0a0a0f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <a href="/" className="text-lg font-bold text-[#9945FF]">
            $CLAWD
          </a>
          <nav className="flex gap-1">
            {docs.map((d) => (
              <button
                key={d.slug}
                onClick={() => setActive(d.slug)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active === d.slug
                    ? "bg-[#9945FF]/20 text-[#14F195]"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                {d.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        <article className="prose prose-invert prose-headings:text-[#14F195] prose-a:text-[#9945FF] prose-code:text-[#ff6b35] prose-pre:bg-[#111127] prose-pre:border prose-pre:border-[#1a1a2e] prose-table:text-sm prose-th:text-[#14F195] max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {current?.content ?? ""}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
}

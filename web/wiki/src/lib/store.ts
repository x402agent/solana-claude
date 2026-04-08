/**
 * CLAWD Wiki — Server-side article store.
 *
 * Stores articles as JSON on disk (wiki-data/) for zero-dependency persistence.
 * In production, swap for Supabase or SQLite.
 */
import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import type { WikiArticle, WikiCategory, WikiSearchResult, WikiTree, OODAContext } from "./types.js";

const DATA_DIR = path.join(process.cwd(), "wiki-data");

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function articlePath(id: string): string {
  return path.join(DATA_DIR, `${id}.json`);
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function getAllArticles(): WikiArticle[] {
  ensureDir();
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  return files
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf-8")) as WikiArticle;
      } catch {
        return null;
      }
    })
    .filter((a): a is WikiArticle => a !== null && !a.archived)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getArticle(id: string): WikiArticle | null {
  const p = articlePath(id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8")) as WikiArticle;
}

export function getArticleBySlug(slug: string): WikiArticle | null {
  return getAllArticles().find((a) => a.slug === slug) ?? null;
}

export function createArticle(data: Omit<WikiArticle, "id" | "createdAt" | "updatedAt" | "version" | "archived">): WikiArticle {
  ensureDir();
  const now = new Date().toISOString();
  const article: WikiArticle = {
    ...data,
    id: nanoid(12),
    createdAt: now,
    updatedAt: now,
    version: 1,
    archived: false,
  };
  fs.writeFileSync(articlePath(article.id), JSON.stringify(article, null, 2));
  return article;
}

export function updateArticle(id: string, updates: Partial<WikiArticle>): WikiArticle | null {
  const article = getArticle(id);
  if (!article) return null;
  const updated: WikiArticle = {
    ...article,
    ...updates,
    id: article.id,
    updatedAt: new Date().toISOString(),
    version: article.version + 1,
  };
  fs.writeFileSync(articlePath(id), JSON.stringify(updated, null, 2));
  return updated;
}

export function deleteArticle(id: string): boolean {
  const article = getArticle(id);
  if (!article) return false;
  // Soft-delete
  updateArticle(id, { archived: true });
  return true;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function getByCategory(category: WikiCategory): WikiArticle[] {
  return getAllArticles().filter((a) => a.category === category);
}

export function getByTag(tag: string): WikiArticle[] {
  return getAllArticles().filter((a) => a.tags.includes(tag));
}

export function getByMemoryTier(tier: "KNOWN" | "LEARNED" | "INFERRED"): WikiArticle[] {
  return getAllArticles().filter((a) => a.memoryTier === tier);
}

export function search(query: string, limit = 20): WikiSearchResult[] {
  const q = query.toLowerCase();
  const results: WikiSearchResult[] = [];

  for (const article of getAllArticles()) {
    let score = 0;
    let field = "";

    if (article.title.toLowerCase().includes(q)) { score += 10; field = "title"; }
    if (article.summary.toLowerCase().includes(q)) { score += 5; field = field || "summary"; }
    if (article.tags.some((t) => t.toLowerCase().includes(q))) { score += 7; field = field || "tags"; }
    if (article.metadata.symbol?.toLowerCase() === q) { score += 15; field = "symbol"; }
    if (article.metadata.mint?.toLowerCase() === q) { score += 15; field = "mint"; }
    if (article.content.toLowerCase().includes(q)) { score += 2; field = field || "content"; }

    if (score > 0) results.push({ article, matchScore: score, matchField: field });
  }

  return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Wiki tree for sidebar navigation
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<WikiCategory, { label: string; icon: string }> = {
  token: { label: "Tokens", icon: "💰" },
  wallet: { label: "Wallets", icon: "👛" },
  protocol: { label: "Protocols", icon: "🔗" },
  strategy: { label: "Strategies", icon: "🎯" },
  signal: { label: "Signals", icon: "📡" },
  agent: { label: "Agents", icon: "🤖" },
  "trade-log": { label: "Trade Log", icon: "📜" },
  research: { label: "Research", icon: "🔬" },
  glossary: { label: "Glossary", icon: "📖" },
};

export function getWikiTree(): WikiTree[] {
  const articles = getAllArticles();
  const categories = Object.keys(CATEGORY_META) as WikiCategory[];

  return categories
    .map((category) => {
      const catArticles = articles.filter((a) => a.category === category);
      return {
        category,
        ...CATEGORY_META[category],
        articles: catArticles.map((a) => ({
          id: a.id,
          slug: a.slug,
          title: a.title,
          memoryTier: a.memoryTier,
        })),
      };
    })
    .filter((t) => t.articles.length > 0);
}

// ---------------------------------------------------------------------------
// OODA context builder — inject into agent prompts
// ---------------------------------------------------------------------------

export function getOODAContext(): OODAContext {
  const articles = getAllArticles();
  const now = Date.now();

  return {
    known: articles.filter(
      (a) => a.memoryTier === "KNOWN" && (!a.metadata.expiresAt || new Date(a.metadata.expiresAt).getTime() > now),
    ),
    learned: articles.filter((a) => a.memoryTier === "LEARNED"),
    inferred: articles.filter((a) => a.memoryTier === "INFERRED"),
  };
}

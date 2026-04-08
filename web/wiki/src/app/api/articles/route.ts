import { NextRequest, NextResponse } from "next/server";
import {
  getAllArticles,
  getArticle,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  search,
  getByCategory,
  getByMemoryTier,
  getWikiTree,
  getOODAContext,
} from "@/lib/store";
import type { WikiCategory } from "@/lib/types";

// GET /api/articles — list, search, filter
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  // Search mode
  const q = params.get("q");
  if (q) return NextResponse.json(search(q));

  // Filter by category
  const category = params.get("category") as WikiCategory | null;
  if (category) return NextResponse.json(getByCategory(category));

  // Filter by memory tier
  const tier = params.get("tier");
  if (tier === "KNOWN" || tier === "LEARNED" || tier === "INFERRED") {
    return NextResponse.json(getByMemoryTier(tier));
  }

  // Wiki tree
  if (params.get("tree") === "true") return NextResponse.json(getWikiTree());

  // OODA context (for agent injection)
  if (params.get("ooda") === "true") return NextResponse.json(getOODAContext());

  // Single article by id or slug
  const id = params.get("id");
  if (id) return NextResponse.json(getArticle(id));
  const slug = params.get("slug");
  if (slug) return NextResponse.json(getArticleBySlug(slug));

  // Default: all articles
  return NextResponse.json(getAllArticles());
}

// POST /api/articles — create article
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const article = createArticle(body);
    return NextResponse.json(article, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

// PUT /api/articles — update article (requires id in body)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const article = updateArticle(id, updates);
    if (!article) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(article);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

// DELETE /api/articles?id=xxx — soft delete
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = deleteArticle(id);
  return ok
    ? NextResponse.json({ deleted: true })
    : NextResponse.json({ error: "not found" }, { status: 404 });
}

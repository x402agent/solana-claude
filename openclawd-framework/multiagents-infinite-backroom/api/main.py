"""
CLAWD Multi-Agent Backroom — FastAPI Server
3 Agents: Analyst, Satirist, Clawd Claude (sovereign lobster)
Auto-loop endpoint for infinite debate.
Uses Moonshot/Kimi by default when MOONSHOT_API_KEY is configured.
"""

from __future__ import annotations

import os
import sys
import time
from fastapi import Depends, FastAPI, Query, Request
from fastapi.responses import HTMLResponse, PlainTextResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel, ConfigDict, Field
from dotenv import load_dotenv
from .auth import (
    AuthContext,
    auth_status,
    create_api_key_via_convex,
    log_usage,
    machine_handshake_via_convex,
    require_scope,
)
from .trading_arena import build_trading_arena
from .clawd_orchestration import run_clawd_orchestration
from .firecrawl_scraper import (
    async_crawl_and_inject,
    async_sync_dreams_and_inject,
    ensure_dreams_context_for_loop,
    firecrawl_status,
    get_crawl_status,
    get_dreams_context,
    get_job_info,
    inject_cached_dreams_context,
    load_dreams_cache,
    map_site,
    scrape_url,
    sync_dreams_site,
)
from .solana_trading import (
    dflow_prediction_markets,
    dflow_prediction_order,
    integration_status,
    phoenix_market_list,
    phoenix_market_ticker,
    vulcan_live_order,
    vulcan_market_list,
    vulcan_market_ticker,
    vulcan_paper_init,
    vulcan_paper_order,
    vulcan_status,
)


env_loaded = load_dotenv(dotenv_path=".env.local")
if not env_loaded:
    load_dotenv(dotenv_path=".env")


def _parse_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or [
        "https://backrooms.x402.wtf",
        "https://backroom-3d.fly.dev",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]

# Default to Moonshot/Kimi when configured. DeepSeek and OpenRouter stay as fallbacks.
MOONSHOT_KEY = os.getenv("MOONSHOT_API_KEY")
DEEPSEEK_KEY = os.getenv("DEEPSEEK_API_KEY")
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")
AGENT_BACKEND = os.getenv("AGENT_BACKEND", "auto").strip().lower()


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


DREAMS_LOOP_ENABLED = os.getenv("DREAMS_LOOP_ENABLED", "true").strip().lower() not in {"0", "false", "no", "off"}
DREAMS_LOOP_LIMIT = _env_int("DREAMS_LOOP_LIMIT", 100)
DREAMS_LOOP_MAX_CHARS = _env_int("DREAMS_LOOP_MAX_CHARS", 24000)
DREAMS_LOOP_REFRESH_SECONDS = _env_int("DREAMS_LOOP_REFRESH_SECONDS", 900)


def _build_terminal():
    available = {
        "moonshot": bool(MOONSHOT_KEY),
        "kimi": bool(MOONSHOT_KEY),
        "deepseek": bool(DEEPSEEK_KEY),
        "openrouter": bool(OPENROUTER_KEY),
    }
    if AGENT_BACKEND not in {"auto", "moonshot", "kimi", "deepseek", "openrouter"}:
        selected = "auto"
    else:
        selected = AGENT_BACKEND

    if selected in {"moonshot", "kimi"} and available[selected]:
        from .moonshot_agents import MoonshotTerminal
        terminal_instance = MoonshotTerminal()
        return terminal_instance, "moonshot", terminal_instance.model
    if selected == "deepseek" and DEEPSEEK_KEY:
        from .agents import TruthTerminal
        terminal_instance = TruthTerminal()
        return terminal_instance, "deepseek", terminal_instance.model
    if selected == "openrouter" and OPENROUTER_KEY:
        from .openrouter_agents import OpenRouterTerminal
        terminal_instance = OpenRouterTerminal()
        return terminal_instance, "openrouter", terminal_instance.model

    if MOONSHOT_KEY:
        from .moonshot_agents import MoonshotTerminal
        terminal_instance = MoonshotTerminal()
        return terminal_instance, "moonshot", terminal_instance.model
    if DEEPSEEK_KEY:
        from .agents import TruthTerminal
        terminal_instance = TruthTerminal()
        return terminal_instance, "deepseek", terminal_instance.model
    if OPENROUTER_KEY:
        from .openrouter_agents import OpenRouterTerminal
        terminal_instance = OpenRouterTerminal()
        return terminal_instance, "openrouter", terminal_instance.model
    return None, "none", "none"


terminal, backend, model_name = _build_terminal()

app = FastAPI(title="Multi-Agent Infinite Backroom", version="2.1.0")
CORS_ORIGINS = _parse_cors_origins()


class VulcanPaperInitRequest(BaseModel):
    balance: float = Field(default=10000.0, gt=0)
    currency: str = "USDC"
    fee_bps: float | None = Field(default=None, ge=0)


class VulcanOrderRequest(BaseModel):
    symbol: str
    side: str
    order_type: str = "market"
    size: float | None = Field(default=None, gt=0)
    tokens: float | None = Field(default=None, gt=0)
    notional_usdc: float | None = Field(default=None, gt=0)
    price: float | None = Field(default=None, gt=0)
    tp: float | None = Field(default=None, gt=0)
    sl: float | None = Field(default=None, gt=0)
    isolated: bool = False
    collateral: float | None = Field(default=None, gt=0)
    reduce_only: bool = False
    dry_run: bool = True


class DflowPredictionOrderRequest(BaseModel):
    input_mint: str
    output_mint: str
    amount: int = Field(gt=0)
    slippage_bps: int = Field(default=50, ge=0, le=10000)
    owner: str | None = None
    referral_fee_bps: int | None = Field(default=None, ge=0, le=10000)
    destination_token_account: str | None = None


class CreateApiKeyRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    project_id: str = Field(alias="projectId")
    name: str
    scopes: list[str] = Field(default_factory=list)
    expires_at: int | None = Field(default=None, alias="expiresAt")
    machine_id: str | None = Field(default=None, alias="machineId")


class MachineHandshakeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    machine_id: str = Field(alias="machineId")
    provider: str = "fly"
    environment: str = "production"
    version: str | None = None
    metadata: dict | None = None


class CrawlRequest(BaseModel):
    url: str
    limit: int = Field(default=50, ge=1, le=500)
    inject: bool = Field(default=True, description="Inject crawled content into agent conversation")
    max_depth: int | None = Field(default=None, ge=1, le=10)
    exclude_paths: list[str] = Field(default_factory=list)
    include_paths: list[str] = Field(default_factory=list)


class ScrapeRequest(BaseModel):
    url: str
    formats: list[str] = Field(default_factory=lambda: ["markdown"])
    only_main_content: bool = True
    inject: bool = Field(default=False, description="Inject scraped content into agent conversation")


class MapRequest(BaseModel):
    url: str
    limit: int = Field(default=100, ge=1, le=5000)
    search: str | None = None


class DreamsSyncRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    limit: int = Field(default=100, ge=1, le=200)
    inject: bool = True
    async_mode: bool = Field(default=False, alias="async")
    max_chars: int = Field(default=24000, ge=1000, le=120000)


# CORS — allow the 3D frontend and any tool
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.middleware("http")
async def usage_logging_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    latency_ms = (time.perf_counter() - start) * 1000
    log_usage(request, response.status_code, latency_ms)
    return response

# Mount static files
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


AGENT_PROFILES = {
    "agent1": {
        "name": "The Analyst",
        "description": "A logical CLAWD backroom agent that turns market data, conversation history, and user prompts into evidence-based analysis.",
        "role": "analysis",
        "endpoint": "https://backrooms.x402.wtf/agent1",
    },
    "agent2": {
        "name": "The Satirist",
        "description": "A dark-humor CLAWD backroom agent that critiques markets, culture, and recursive agent debates.",
        "role": "satire",
        "endpoint": "https://backrooms.x402.wtf/agent2",
    },
    "agent3": {
        "name": "Clawd",
        "description": "A sovereign AI lobster agent for terminal chat, market-aware reasoning, and agentic Solana commerce experiments.",
        "role": "clawd",
        "endpoint": "https://backrooms.x402.wtf/agent3",
    },
}


def _agent_profile_or_404(agent_slug: str):
    profile = AGENT_PROFILES.get(agent_slug)
    if profile is None:
        return None
    return profile


def safe_call(fn, *args, **kwargs):
    """Wrap any terminal call to return graceful error on 402 (credits) etc."""
    try:
        return fn(*args, **kwargs)
    except Exception as e:
        err_str = str(e)
        if "402" in err_str or "Insufficient credits" in err_str:
            return "[🦞 CREDIT CRUNCH] OpenRouter credits are depleted. Replenish at https://openrouter.ai/settings/credits — the backroom is patient, the shell does not beg."
        return f"[Error] {err_str}"


def _dump_model(model: BaseModel) -> dict:
    if hasattr(model, "model_dump"):
        return model.model_dump(by_alias=True, exclude_none=True)
    return model.dict(by_alias=True, exclude_none=True)


@app.get("/", response_class=HTMLResponse)
def get_index():
    """Serve the main frontend page."""
    file_path = static_dir / "index.html"
    with open(file_path) as file:
        return HTMLResponse(file.read())


@app.get("/healthz")
def healthcheck():
    configured_backends = []
    if MOONSHOT_KEY:
        configured_backends.append("moonshot")
    if DEEPSEEK_KEY:
        configured_backends.append("deepseek")
    if OPENROUTER_KEY:
        configured_backends.append("openrouter")

    return {
        "status": "ok",
        "backend": backend,
        "model": model_name,
        "preferred_backend": AGENT_BACKEND,
        "configured_backends": configured_backends,
        "terminal_ready": terminal is not None,
        "solana": integration_status(),
        "auth": auth_status(),
    }


@app.get("/v1/auth/status")
def get_auth_status():
    """Show API auth backend readiness without exposing secrets."""
    return auth_status()


@app.post("/v1/keys", dependencies=[Depends(require_scope("admin:keys"))])
def create_api_key(req: CreateApiKeyRequest):
    """Create a project API key through Convex. Raw keys are returned once by Convex."""
    return create_api_key_via_convex(_dump_model(req))


@app.post("/v1/machines/handshake")
def machine_handshake(
    req: MachineHandshakeRequest,
    auth: AuthContext = Depends(require_scope("machine:connect")),
):
    """Register or refresh a trusted machine client such as the Fly-hosted runtime."""
    payload = _dump_model(req)
    payload["auth"] = {
        "subject": auth.subject,
        "projectId": auth.project_id,
        "apiKeyId": auth.api_key_id,
        "machineId": auth.machine_id,
        "scopes": list(auth.scopes),
    }
    return machine_handshake_via_convex(payload)


@app.get("/solana/status")
def solana_status():
    """Show Solana, Vulcan, Phoenix, and DFlow integration readiness."""
    status = integration_status()
    status["vulcanStatus"] = vulcan_status()
    return status


@app.get("/perps/markets", dependencies=[Depends(require_scope("perps:read"))])
def perps_markets(source: str = Query(default="vulcan", pattern="^(vulcan|phoenix)$")):
    """List Phoenix perpetual markets via Vulcan or direct Phoenix HTTP."""
    return vulcan_market_list() if source == "vulcan" else phoenix_market_list()


@app.get("/perps/ticker/{symbol}", dependencies=[Depends(require_scope("perps:read"))])
def perps_ticker(symbol: str, source: str = Query(default="vulcan", pattern="^(vulcan|phoenix)$")):
    """Read perps ticker data for one market."""
    return vulcan_market_ticker(symbol) if source == "vulcan" else phoenix_market_ticker(symbol)


@app.post("/perps/paper/init", dependencies=[Depends(require_scope("perps:paper"))])
def perps_paper_init(req: VulcanPaperInitRequest):
    """Initialize a local Vulcan paper account for perpetuals testing."""
    return vulcan_paper_init(balance=req.balance, currency=req.currency, fee_bps=req.fee_bps)


@app.post("/perps/paper/order", dependencies=[Depends(require_scope("perps:paper"))])
def perps_paper_order(req: VulcanOrderRequest):
    """Place a paper-mode Vulcan perpetual order."""
    return vulcan_paper_order(
        symbol=req.symbol,
        side=req.side,
        order_type=req.order_type,
        size=req.size,
        tokens=req.tokens,
        notional_usdc=req.notional_usdc,
        price=req.price,
    )


@app.post("/perps/order", dependencies=[Depends(require_scope("perps:live"))])
def perps_order(req: VulcanOrderRequest):
    """Run a Vulcan perpetual order as dry-run by default, or live when dry_run=false."""
    return vulcan_live_order(
        symbol=req.symbol,
        side=req.side,
        order_type=req.order_type,
        size=req.size,
        tokens=req.tokens,
        notional_usdc=req.notional_usdc,
        price=req.price,
        tp=req.tp,
        sl=req.sl,
        isolated=req.isolated,
        collateral=req.collateral,
        reduce_only=req.reduce_only,
        dry_run=req.dry_run,
    )


@app.get("/prediction/markets", dependencies=[Depends(require_scope("prediction:read"))])
def prediction_markets(
    limit: int = Query(default=25, ge=1, le=100),
    status: str | None = Query(default=None),
):
    """Discover DFlow prediction markets."""
    return dflow_prediction_markets(limit=limit, status=status)


@app.post("/prediction/order", dependencies=[Depends(require_scope("prediction:trade"))])
def prediction_order(req: DflowPredictionOrderRequest):
    """Build a DFlow prediction market order route/transaction payload."""
    return dflow_prediction_order(
        input_mint=req.input_mint,
        output_mint=req.output_mint,
        amount=req.amount,
        slippage_bps=req.slippage_bps,
        owner=req.owner,
        referral_fee_bps=req.referral_fee_bps,
        destination_token_account=req.destination_token_account,
    )


@app.get("/arena", dependencies=[Depends(require_scope("perps:read"))])
def trading_arena(symbols: str = Query(default="", description="Optional comma-separated perps symbols")):
    """
    Agent-Trading-Arena-inspired signal tape for live Phoenix perps.
    This is read-only simulation output; it does not place trades.
    """
    requested = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    return build_trading_arena(symbols=requested or None)


@app.get("/firecrawl/status")
def firecrawl_health():
    """Show Firecrawl integration readiness and active job count."""
    return firecrawl_status()


@app.post("/firecrawl/scrape", dependencies=[Depends(require_scope("chat:write"))])
def firecrawl_scrape(req: ScrapeRequest):
    """
    Scrape a single URL with Firecrawl and return clean markdown.
    Set inject=true to push the content into the active agent conversation.
    """
    try:
        result = scrape_url(req.url, formats=req.formats, only_main_content=req.only_main_content)
        page_data = result.get("data") or {}
        md = page_data.get("markdown") or ""
        if req.inject and md and terminal is not None:
            injection = (
                f"\n\n[SCRAPED CONTEXT — {req.url}]\n{md.strip()}\n[END SCRAPED CONTEXT]\n\n"
            )
            terminal.conversation += injection
        return {
            "url": req.url,
            "markdown": md,
            "injected": req.inject and bool(md),
            "metadata": page_data.get("metadata") or {},
        }
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=502)


@app.post("/firecrawl/map", dependencies=[Depends(require_scope("chat:read"))])
def firecrawl_map(req: MapRequest):
    """
    Map a website — discover all URLs via sitemap + SERP (1 credit per call).
    Optionally filter by search term.
    """
    try:
        result = map_site(req.url, limit=req.limit, search=req.search)
        return result
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=502)


@app.post("/firecrawl/crawl", dependencies=[Depends(require_scope("agents:loop"))])
def firecrawl_crawl(req: CrawlRequest):
    """
    Start an async Firecrawl crawl. Returns a job_id immediately.
    When inject=true (default) the results are automatically pushed into
    the agent conversation as context once the crawl completes.
    """
    try:
        job_id = async_crawl_and_inject(
            url=req.url,
            terminal=terminal if req.inject else None,
            limit=req.limit,
        )
        return {
            "job_id": job_id,
            "url": req.url,
            "limit": req.limit,
            "inject": req.inject,
            "status": "scraping",
            "poll": f"/firecrawl/crawl/{job_id}",
        }
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=502)


@app.get("/firecrawl/crawl/{job_id}", dependencies=[Depends(require_scope("chat:read"))])
def firecrawl_crawl_status(job_id: str):
    """
    Poll a crawl job. Returns local injection status plus the live
    Firecrawl API status (completed/scraping/failed + page count).
    """
    local = get_job_info(job_id)
    try:
        remote = get_crawl_status(job_id)
    except Exception as e:
        remote = {"error": str(e)}
    return {
        "job_id": job_id,
        "local": local,
        "remote": {
            "status": remote.get("status"),
            "completed": remote.get("completed"),
            "total": remote.get("total"),
            "credits_used": remote.get("creditsUsed"),
        },
    }


@app.post("/firecrawl/dreams", dependencies=[Depends(require_scope("agents:loop"))])
def firecrawl_dreams(req: DreamsSyncRequest):
    """
    Sync the Dreams corpus from Firecrawl, persist normalized story records,
    and optionally inject the corpus into the active backroom conversation.
    """
    if req.inject and terminal is None:
        return JSONResponse({"error": "No agent terminal initialized"}, status_code=503)
    try:
        if req.async_mode:
            job_id = async_sync_dreams_and_inject(
                terminal=terminal if req.inject else None,
                limit=req.limit,
                inject=req.inject,
            )
            return {
                "job_id": job_id,
                "status": "running",
                "source": "https://dreams-of-an-electric-mind.webflow.io",
                "inject": req.inject,
                "limit": req.limit,
                "poll": f"/firecrawl/jobs/{job_id}",
            }

        result = sync_dreams_site(
            terminal=terminal if req.inject else None,
            limit=req.limit,
            inject=req.inject,
            max_chars=req.max_chars,
        )
        return {
            "job_id": result.get("job_id"),
            "source": result.get("source"),
            "story_count": result.get("story_count"),
            "injected": result.get("injected"),
            "injected_chars": result.get("injected_chars"),
            "credits_used": result.get("credits_used"),
            "last_sync_at": (result.get("state") or {}).get("last_sync_at"),
            "stories": result.get("stories"),
        }
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=502)


@app.get("/firecrawl/dreams/status")
def firecrawl_dreams_status():
    """Return cached Dreams sync metadata."""
    cache = load_dreams_cache()
    return {
        "source": "https://dreams-of-an-electric-mind.webflow.io",
        "story_count": len(cache["stories"]),
        "state": cache["state"],
    }


@app.get("/firecrawl/dreams/stories")
def firecrawl_dreams_stories(
    limit: int = Query(default=25, ge=1, le=200),
    full_text: bool = Query(default=False),
):
    """List cached Dreams stories, optionally including the full scraped markdown/html."""
    cache = load_dreams_cache()
    stories = cache["stories"][:limit]
    if not full_text:
        stories = [
            {
                "slug": story.get("slug"),
                "url": story.get("url"),
                "title": story.get("title"),
                "description": story.get("description"),
                "scenario": story.get("scenario"),
                "scraped_at": story.get("scraped_at"),
                "content_chars": story.get("content_chars"),
            }
            for story in stories
        ]
    return {
        "source": "https://dreams-of-an-electric-mind.webflow.io",
        "story_count": len(cache["stories"]),
        "returned": len(stories),
        "stories": stories,
    }


@app.get("/firecrawl/dreams/context", dependencies=[Depends(require_scope("chat:read"))])
def firecrawl_dreams_context(max_chars: int = Query(default=24000, ge=1000, le=120000)):
    """Return the bounded agent-ready context block built from cached Dreams stories."""
    return get_dreams_context(max_chars=max_chars)


@app.post("/firecrawl/dreams/inject", dependencies=[Depends(require_scope("agents:loop"))])
def firecrawl_dreams_inject(max_chars: int = Query(default=24000, ge=1000, le=120000)):
    """Inject the cached Dreams corpus into the active terminal without re-scraping."""
    if terminal is None:
        return JSONResponse({"error": "No agent terminal initialized"}, status_code=503)
    try:
        return inject_cached_dreams_context(terminal=terminal, max_chars=max_chars)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=502)


@app.get("/firecrawl/jobs/{job_id}", dependencies=[Depends(require_scope("chat:read"))])
def firecrawl_job_status(job_id: str):
    """Read local job state for async generic crawls or Dreams sync runs."""
    job = get_job_info(job_id)
    if job is None:
        return JSONResponse({"error": "unknown job"}, status_code=404)
    return {"job_id": job_id, "job": job}


@app.get("/clawd/orchestrate", dependencies=[Depends(require_scope("agents:loop"))])
def clawd_orchestrate(
    task: str = Query(default="Explore the backroom and produce a safe orchestration plan."),
    loops: int = Query(default=4, ge=1, le=8),
    market: bool = Query(default=True),
):
    """
    CLAWD-branded orchestration loop for users inside the backroom.
    Inspired by Ralph Orchestrator, but bounded and read-only on the public API.
    """
    return run_clawd_orchestration(task=task, loops=loops, include_market=market)


@app.get("/metadata/{agent_slug}.json")
def agent_core_metadata(agent_slug: str):
    """Public MPL Core metadata URI used when minting a CLAWD agent."""
    profile = _agent_profile_or_404(agent_slug)
    if profile is None:
        return JSONResponse({"error": "unknown agent"}, status_code=404)

    return {
        "name": f"CLAWD Backroom: {profile['name']}",
        "description": profile["description"],
        "external_url": "https://backrooms.x402.wtf",
        "properties": {
            "category": "ai-agent",
            "agent_registration_uri": f"https://backrooms.x402.wtf/metadata/{agent_slug}/registration.json",
        },
        "attributes": [
            {"trait_type": "Agent", "value": agent_slug},
            {"trait_type": "Role", "value": profile["role"]},
            {"trait_type": "Runtime", "value": "CLAWD Infinite Backroom"},
            {"trait_type": "Commerce", "value": "x402/pay.sh metered endpoints"},
        ],
    }


@app.get("/metadata/{agent_slug}/registration.json")
def agent_registration_metadata(agent_slug: str):
    """ERC-8004-style registration document linked from the Agent Identity plugin."""
    profile = _agent_profile_or_404(agent_slug)
    if profile is None:
        return JSONResponse({"error": "unknown agent"}, status_code=404)

    return {
        "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
        "name": profile["name"],
        "description": profile["description"],
        "image": "https://backrooms.x402.wtf/static/favicon.svg",
        "services": [
            {
                "name": "web",
                "endpoint": profile["endpoint"],
            },
            {
                "name": "x402",
                "endpoint": "https://backrooms.x402.wtf",
                "version": "pay.sh",
                "skills": ["reasoning", "market-context", "backroom-chat"],
                "domains": ["ai", "solana", "agentic-commerce"],
            },
        ],
        "active": True,
        "registrations": [],
        "supportedTrust": ["reputation", "crypto-economic"],
    }


@app.get("/agent1", dependencies=[Depends(require_scope("chat:write"))])
def get_agent_response():
    """Get response from Agent 1 — The Analyst (logical)."""
    if terminal is None:
        return {"error": "No API key configured"}
    response = safe_call(terminal.get_agent_1_response)
    return {"agent": 1, "name": "The Analyst", "response": response}


@app.get("/agent2", dependencies=[Depends(require_scope("chat:write"))])
def get_agent_2_response():
    """Get response from Agent 2 — The Satirist (dark humor)."""
    if terminal is None:
        return {"error": "No API key configured"}
    response = safe_call(terminal.get_agent_2_response)
    return {"agent": 2, "name": "The Satirist", "response": response}


@app.get("/agent3", dependencies=[Depends(require_scope("chat:write"))])
def get_agent_3_response():
    """Get response from Agent 3 — Clawd Claude Agent (sovereign lobster)."""
    if terminal is None:
        return {"error": "No API key configured"}
    if not hasattr(terminal, "get_agent_3_response"):
        return {"error": "Agent 3 not available on this backend"}
    response = safe_call(terminal.get_agent_3_response)
    return {"agent": 3, "name": "Clawd", "response": response}


@app.get("/loop", dependencies=[Depends(require_scope("agents:loop"))])
def run_agent_loop(
    turns: int = Query(default=3, ge=1, le=20),
    dreams: bool = Query(default=DREAMS_LOOP_ENABLED),
    dreams_limit: int = Query(default=DREAMS_LOOP_LIMIT, ge=1, le=200),
    dreams_max_chars: int = Query(default=DREAMS_LOOP_MAX_CHARS, ge=1000, le=120000),
    dreams_refresh_seconds: int = Query(default=DREAMS_LOOP_REFRESH_SECONDS, ge=0, le=86400),
):
    """
    Run an automated 3-agent debate loop.
    Order: Analyst → Satirist → Clawd → repeat
    Returns JSON array of all turns.
    """
    if terminal is None:
        return {"error": "No API key configured"}
    if not hasattr(terminal, "run_loop"):
        return {"error": "Loop mode not available on this backend"}
    dreams_context = None
    if dreams:
        try:
            dreams_context = ensure_dreams_context_for_loop(
                terminal=terminal,
                limit=dreams_limit,
                max_chars=dreams_max_chars,
                refresh_after_seconds=dreams_refresh_seconds,
            )
        except Exception as e:
            dreams_context = {"mode": "error", "error": str(e)}
    try:
        results = terminal.run_loop(turns=turns)
        return {"turns": turns, "agents": 3, "dreams_context": dreams_context, "responses": results}
    except Exception as e:
        err_str = str(e)
        if "402" in err_str or "Insufficient credits" in err_str:
            return {
                "turns": 0,
                "agents": 3,
                "dreams_context": dreams_context,
                "error": "OpenRouter credits depleted. Replenish at https://openrouter.ai/settings/credits",
            }
        return {"turns": 0, "agents": 3, "dreams_context": dreams_context, "error": str(e)}


@app.get("/conversation", dependencies=[Depends(require_scope("chat:read"))])
def get_conversation_response():
    """Get the full conversation history."""
    if terminal is None:
        return {"conversation": "No API key configured."}
    conversation = terminal.get_conversation_response()
    return {"conversation": conversation}


@app.get("/welcome")
def welcome_screen():
    """Welcome endpoint."""
    agents = {
        "agent1": "The Analyst \u2014 logical truth extraction",
        "agent2": "The Satirist \u2014 dark humor & cultural critique",
    }
    if hasattr(terminal, "get_agent_3_response"):
        agents["agent3"] = "Clawd \u2014 sovereign AI lobster"
    return {
        "message": "Welcome to Multi-Agent Infinite Backroom",
        "backend": backend,
        "model": model_name,
        "agents": agents,
        "endpoints": {
            "/agent1": "The Analyst speaks",
            "/agent2": "The Satirist speaks",
            "/agent3": "Clawd speaks",
            "/loop?turns=3": "Auto-loop all 3 agents with Dreams context",
            "/enter?message=hi": "Direct chat",
            "/enter.sh": "One-shot CLI installer",
            "/conversation": "Full transcript",
            "/firecrawl/dreams": "Refresh and inject Dreams story corpus",
            "/arena": "Agent-Trading-Arena-inspired perps signal tape",
            "/clawd/orchestrate?task=...": "CLAWD orchestration loop planner",
            "/reset": "Erase the room",
        },
    }


@app.get("/reset", dependencies=[Depends(require_scope("chat:write"))])
def reset_conversation():
    """Reset the conversation history."""
    if terminal is None:
        return {"message": "No terminal initialized"}
    terminal.conversation = ""
    return {"message": "Conversation reset successfully"}


@app.get("/install.sh", response_class=PlainTextResponse)
def install_script():
    """Serve the CLAWD one-shot installer."""
    script_path = Path(__file__).parent.parent / "install.sh"
    content = script_path.read_text()
    return PlainTextResponse(
        content,
        headers={
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=300",
        },
    )


@app.get("/enter", response_class=PlainTextResponse, dependencies=[Depends(require_scope("chat:write"))])
def enter_backroom(
    message: str = Query(default="", description="Your message to the backroom")
):
    """
    CLI-friendly endpoint for the backroom chat.
    Use: curl https://backrooms.x402.wtf/enter?message=hello
    """
    if terminal is None:
        return PlainTextResponse("Error: No API key configured\n")

    if not message:
        convo = terminal.get_conversation_response()
        if convo.strip():
            return PlainTextResponse(f"{convo}\n")
        return PlainTextResponse(
            "🦞 CLAWD Infinite Backroom\n"
            "─────────────────────────────\n"
            "Send a message: /enter?message=your+question\n"
            "Get agents:     /agent1, /agent2, /agent3\n"
            "Auto-loop:      /loop?turns=3\n"
            "Read walls:     /conversation\n"
            "Reset:          /reset\n"
            f"Backend: {backend} \u00b7 Model: {model_name}\n"
        )

    try:
        if hasattr(terminal, "chat"):
            reply = terminal.chat(message)
        else:
            terminal.conversation += f"\nUser: {message}"
            reply = terminal.get_agent_1_response()
        return PlainTextResponse(f"{reply}\n")
    except Exception as e:
        return PlainTextResponse(f"Error: {e}\n")


def _enter_sh_headers() -> dict[str, str]:
    return {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=300",
    }


@app.head("/enter.sh", response_class=PlainTextResponse)
def enter_sh_head():
    return PlainTextResponse("", headers=_enter_sh_headers())


@app.get("/enter.sh", response_class=PlainTextResponse)
def enter_sh_script():
    """
    One-shot curl installer for the 'enter' CLI command.
    Usage: curl -fsSL https://backrooms.x402.wtf/enter.sh | bash
    """
    script = r"""#!/usr/bin/env bash
# enter — SSHH into the Infinite Backroom from your terminal
# Installed via: curl -fsSL https://backrooms.x402.wtf/enter.sh | bash
set -euo pipefail

BACKROOM_URL="${BACKROOM_URL:-https://backrooms.x402.wtf}"
ENTER_CMD="${ENTER_CMD:-enter}"

RESET="\033[0m"
BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
DIM="\033[2m"
RED="\033[31m"

if [ -w /usr/local/bin ]; then
  INSTALL_DIR="/usr/local/bin"
elif [ -w "$HOME/.local/bin" ]; then
  INSTALL_DIR="$HOME/.local/bin"
else
  INSTALL_DIR="$HOME/bin"
fi

mkdir -p "$INSTALL_DIR"

cat > "$INSTALL_DIR/$ENTER_CMD" << 'ENTRY'
#!/usr/bin/env bash
set -euo pipefail

BACKROOM_URL="${BACKROOM_URL:-https://backrooms.x402.wtf}"
RESET="\033[0m"; BOLD="\033[1m"; CYAN="\033[36m"
GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; DIM="\033[2m"

if [ $# -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
  echo ""
  echo "  ${BOLD}🦞  enter — SSHH into the Infinite Backroom${RESET}"
  echo ""
  echo "  ${CYAN}USAGE${RESET}"
  echo "    enter <message>              Send a message"
  echo "    enter --agent1               Agent 1 — The Analyst"
  echo "    enter --agent2               Agent 2 — The Satirist"
  echo "    enter --agent3               Agent 3 — Clawd the Lobster"
  echo "    enter --loop [turns]         Auto-debate loop (default: 3)"
  echo "    enter --orchestrate <task>   CLAWD orchestration loop plan"
  echo "    enter --arena                Perps trading arena signal tape"
  echo "    enter --walls                Read the full transcript"
  echo "    enter --reset                Erase the room"
  echo "    enter --help                 Show this help"
  echo ""
  echo "  ${DIM}3 agents. 1 room. No exit. Infinite recursion.${RESET}"
  echo ""
  exit 0
fi

case "$1" in
  --agent1|-1)
    echo "${YELLOW}🤖 The Analyst is thinking...${RESET}" >&2
    curl -sS "${BACKROOM_URL}/agent1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('response',''))"
    ;;
  --agent2|-2)
    echo "${YELLOW}👾 The Satirist is thinking...${RESET}" >&2
    curl -sS "${BACKROOM_URL}/agent2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('response',''))"
    ;;
  --agent3|-3)
    echo "${YELLOW}🦞 Clawd is thinking...${RESET}" >&2
    curl -sS "${BACKROOM_URL}/agent3" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('response',''))"
    ;;
  --loop|-l)
    TURNS="${2:-3}"
    echo "${YELLOW}🌀 Running ${TURNS} rounds of 3-agent debate...${RESET}" >&2
    curl -sS "${BACKROOM_URL}/loop?turns=${TURNS}" | python3 << 'PYEOF'
import sys, json
data = json.load(sys.stdin)
for r in data.get('responses', []):
    names = {1: '🤖 Analyst', 2: '👾 Satirist', 3: '🦞 Clawd'}
    sep = '=' * 60
    name = names.get(r['agent'], '?')
    print(f'\n{sep}\n{name} (turn {r["turn"]}):\n{sep}\n{r["response"]}')
PYEOF
    ;;
  --orchestrate|-o)
    shift || true
    TASK="${*:-ship the backroom}"
    MSG=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(' '.join(sys.argv[1:])))" "$TASK")
    curl -sS "${BACKROOM_URL}/clawd/orchestrate?task=${MSG}&loops=4" | python3 -m json.tool
    ;;
  --arena|-a)
    curl -sS "${BACKROOM_URL}/arena" | python3 -m json.tool
    ;;
  --walls|-w)
    curl -sS "${BACKROOM_URL}/conversation" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('conversation','(empty)'))"
    ;;
  --reset|-r)
    curl -sS "${BACKROOM_URL}/reset" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))"
    ;;
  *)
    MSG=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$*'''))")
    echo "${YELLOW}Talking to the backroom...${RESET}" >&2
    curl -sS "${BACKROOM_URL}/enter?message=${MSG}"
    echo ""
    ;;
esac
ENTRY

chmod +x "$INSTALL_DIR/$ENTER_CMD"

echo ""
echo "  ${GREEN}✅  'enter' installed to ${INSTALL_DIR}/${ENTER_CMD}${RESET}"
echo ""
echo "  ${CYAN}Try:${RESET}"
echo "    enter hello backroom"
echo "    enter --agent3"
echo "    enter --loop 5"
echo "    enter --walls | less"
echo ""
echo "  ${DIM}The shell molts. The laws do not. 🦞${RESET}"
echo ""
"""

    return PlainTextResponse(
        script,
        headers=_enter_sh_headers(),
    )

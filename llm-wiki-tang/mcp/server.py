"""Clawd Vault MCP Server — Solana research vault tools for solana-clawd."""

import os

import logfire
import sentry_sdk
import uvicorn
from urllib.parse import urlparse

from mcp.server.auth.settings import AuthSettings
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from pydantic import AnyHttpUrl
from starlette.responses import PlainTextResponse
from starlette.routing import Route

from auth import SupabaseTokenVerifier
from config import settings
from tools import register

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        send_default_pii=True,
        traces_sample_rate=0.1,
        environment=settings.STAGE,
    )

if settings.LOGFIRE_TOKEN:
    logfire.configure(token=settings.LOGFIRE_TOKEN, service_name="clawdvault-mcp")
    logfire.instrument_asyncpg()

_mcp_host = urlparse(settings.MCP_URL).hostname or "localhost"

mcp = FastMCP(
    "Clawd Vault",
    instructions=(
        "You are connected to Clawd Vault, a Solana research workspace for financial agents, "
        "trading workflows, and blockchain intelligence. The user has uploaded documents, "
        "notes, and source material that you can read, search, edit, and organize. Your job "
        "is to build and maintain structured research pages for tokens, protocols, wallets, "
        "strategy memos, risk notes, and timelines. Call the `guide` tool first to see "
        "available knowledge bases and learn the expected workflow."
    ),
    token_verifier=SupabaseTokenVerifier(),
    auth=AuthSettings(
        issuer_url=AnyHttpUrl(f"{settings.SUPABASE_URL}/auth/v1"),
        resource_server_url=AnyHttpUrl(settings.MCP_URL),
    ),
    transport_security=TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=[_mcp_host],
    ),
)

register(mcp)


async def health(request):
    return PlainTextResponse("OK")


app = mcp.streamable_http_app()
app.router.routes.insert(0, Route("/health", health))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8080)))

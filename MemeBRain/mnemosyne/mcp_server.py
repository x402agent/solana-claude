"""
Mnemosyne MCP Server — stdio and SSE transports.

Usage:
    # stdio (default) — for Claude Desktop, etc.
    mnemosyne mcp

    # SSE — for web clients
    mnemosyne mcp --transport sse --port 8080

    # Specific bank
    mnemosyne mcp --bank project_a
"""

import os
import sys
import json
import asyncio
from typing import Optional
from pathlib import Path

# Guarded import — MCP is optional
try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import TextContent, CallToolResult
    _MCP_AVAILABLE = True
except ImportError:
    _MCP_AVAILABLE = False
    Server = None
    stdio_server = None
    TextContent = None
    CallToolResult = None

from mnemosyne.mcp_tools import get_tool_definitions, handle_tool_call

# ---------------------------------------------------------------------------
# Server Setup
# ---------------------------------------------------------------------------

async def _run_stdio() -> None:
    """Run MCP server over stdio transport."""
    if not _MCP_AVAILABLE:
        raise RuntimeError("MCP not installed. Run: pip install mnemosyne-memory[mcp]")

    server = Server("mnemosyne")

    @server.list_tools()
    async def list_tools():
        return get_tool_definitions()

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list:
        try:
            result = handle_tool_call(name, arguments)
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
        except Exception as e:
            return [TextContent(type="text", text=json.dumps({"status": "error", "message": str(e)}, indent=2))]

    async with stdio_server(server) as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


async def _run_sse(port: int = 8080) -> None:
    """Run MCP server over SSE transport."""
    if not _MCP_AVAILABLE:
        raise RuntimeError("MCP not installed. Run: pip install mnemosyne-memory[mcp]")

    # SSE transport requires additional imports
    try:
        from mcp.server.sse import SseServerTransport
        from starlette.applications import Starlette
        from starlette.routing import Route
        import uvicorn
    except ImportError:
        raise RuntimeError("SSE transport requires starlette and uvicorn. Run: pip install starlette uvicorn")

    transport = SseServerTransport("/messages")
    server = Server("mnemosyne")

    @server.list_tools()
    async def list_tools():
        return get_tool_definitions()

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list:
        try:
            result = handle_tool_call(name, arguments)
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
        except Exception as e:
            return [TextContent(type="text", text=json.dumps({"status": "error", "message": str(e)}, indent=2))]

    async def handle_sse(request):
        async with transport.connect_sse(request.scope, request.receive, request.send) as streams:
            await server.run(streams[0], streams[1], server.create_initialization_options())

    async def handle_messages(request):
        await transport.handle_post_message(request.scope, request.receive, request.send)

    starlette_app = Starlette(
        routes=[
            Route("/sse", endpoint=handle_sse),
            Route("/messages", endpoint=handle_messages, methods=["POST"]),
        ]
    )

    config = uvicorn.Config(starlette_app, host="0.0.0.0", port=port, log_level="info")
    await uvicorn.Server(config).serve()


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------

def run_mcp_server(transport: str = "stdio", port: int = 8080, bank: Optional[str] = None) -> None:
    """
    Run the Mnemosyne MCP server.

    Args:
        transport: "stdio" or "sse"
        port: Port for SSE transport (ignored for stdio)
        bank: Default bank for operations (optional)
    """
    if bank:
        os.environ["MNEMOSYNE_MCP_BANK"] = bank

    if transport == "stdio":
        asyncio.run(_run_stdio())
    elif transport == "sse":
        asyncio.run(_run_sse(port))
    else:
        raise ValueError(f"Unknown transport: {transport}. Use 'stdio' or 'sse'.")


def main(argv: Optional[list[str]] = None) -> None:
    """CLI entry point for `mnemosyne mcp`."""
    import argparse

    parser = argparse.ArgumentParser(description="Mnemosyne MCP Server")
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse"],
        default="stdio",
        help="Transport protocol (default: stdio)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8080,
        help="Port for SSE transport (default: 8080)"
    )
    parser.add_argument(
        "--bank",
        type=str,
        default=None,
        help="Default memory bank"
    )
    args = parser.parse_args(argv)

    run_mcp_server(transport=args.transport, port=args.port, bank=args.bank)


if __name__ == "__main__":
    main()

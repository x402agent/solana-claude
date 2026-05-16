"""
DeepSeek Multi-Agent Backroom — FastAPI Server
3 Agents: Analyst, Satirist, Clawd Claude (sovereign lobster)
Auto-loop endpoint for infinite debate.
Always uses DeepSeek API by default.
"""

import os
import sys
from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse, PlainTextResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path


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

# Always use DeepSeek. Fall back to OpenRouter only if DeepSeek is not configured.
DEEPSEEK_KEY = os.getenv("DEEPSEEK_API_KEY")
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")

if DEEPSEEK_KEY:
    from .agents import TruthTerminal
    terminal = TruthTerminal()
    backend = "deepseek"
    model_name = terminal.model
elif OPENROUTER_KEY:
    from .openrouter_agents import OpenRouterTerminal
    terminal = OpenRouterTerminal()
    backend = "openrouter"
    model_name = terminal.model
else:
    terminal = None
    backend = "none"
    model_name = "none"

app = FastAPI(title="Multi-Agent Infinite Backroom", version="2.1.0")
CORS_ORIGINS = _parse_cors_origins()

# CORS — allow the 3D frontend and any tool
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

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


@app.get("/", response_class=HTMLResponse)
def get_index():
    """Serve the main frontend page."""
    file_path = static_dir / "index.html"
    with open(file_path) as file:
        return HTMLResponse(file.read())


@app.get("/healthz")
def healthcheck():
    configured_backends = []
    if DEEPSEEK_KEY:
        configured_backends.append("deepseek")
    if OPENROUTER_KEY:
        configured_backends.append("openrouter")

    return {
        "status": "ok",
        "backend": backend,
        "model": model_name,
        "configured_backends": configured_backends,
        "terminal_ready": terminal is not None,
    }


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


@app.get("/agent1")
def get_agent_response():
    """Get response from Agent 1 — The Analyst (logical)."""
    if terminal is None:
        return {"error": "No API key configured"}
    response = safe_call(terminal.get_agent_1_response)
    return {"agent": 1, "name": "The Analyst", "response": response}


@app.get("/agent2")
def get_agent_2_response():
    """Get response from Agent 2 — The Satirist (dark humor)."""
    if terminal is None:
        return {"error": "No API key configured"}
    response = safe_call(terminal.get_agent_2_response)
    return {"agent": 2, "name": "The Satirist", "response": response}


@app.get("/agent3")
def get_agent_3_response():
    """Get response from Agent 3 — Clawd Claude Agent (sovereign lobster)."""
    if terminal is None:
        return {"error": "No API key configured"}
    if not hasattr(terminal, "get_agent_3_response"):
        return {"error": "Agent 3 not available on this backend"}
    response = safe_call(terminal.get_agent_3_response)
    return {"agent": 3, "name": "Clawd", "response": response}


@app.get("/loop")
def run_agent_loop(turns: int = Query(default=3, ge=1, le=20)):
    """
    Run an automated 3-agent debate loop.
    Order: Analyst → Satirist → Clawd → repeat
    Returns JSON array of all turns.
    """
    if terminal is None:
        return {"error": "No API key configured"}
    if not hasattr(terminal, "run_loop"):
        return {"error": "Loop mode not available on this backend"}
    try:
        results = terminal.run_loop(turns=turns)
        return {"turns": turns, "agents": 3, "responses": results}
    except Exception as e:
        err_str = str(e)
        if "402" in err_str or "Insufficient credits" in err_str:
            return {"turns": 0, "agents": 3, "error": "OpenRouter credits depleted. Replenish at https://openrouter.ai/settings/credits"}
        return {"turns": 0, "agents": 3, "error": str(e)}


@app.get("/conversation")
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
            "/loop?turns=3": "Auto-loop all 3 agents",
            "/enter?message=hi": "Direct chat",
            "/enter.sh": "One-shot CLI installer",
            "/conversation": "Full transcript",
            "/reset": "Erase the room",
        },
    }


@app.get("/reset")
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


@app.get("/enter", response_class=PlainTextResponse)
def enter_backroom(
    message: str = Query(default="", description="Your message to the backroom")
):
    """
    CLI-friendly endpoint for the backroom chat.
    Use: curl clawd-backrooms.fly.dev/enter?message=hello
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


@app.get("/enter.sh", response_class=PlainTextResponse)
def enter_sh_script():
    """
    One-shot curl installer for the 'enter' CLI command.
    Usage: curl -fsSL https://clawd-backrooms.fly.dev/enter.sh | bash
    """
    script = r"""#!/usr/bin/env bash
# enter — SSHH into the Infinite Backroom from your terminal
# Installed via: curl -fsSL https://clawd-backrooms.fly.dev/enter.sh | bash
set -euo pipefail

BACKROOM_URL="${BACKROOM_URL:-https://clawd-backrooms.fly.dev}"
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

BACKROOM_URL="${BACKROOM_URL:-https://clawd-backrooms.fly.dev}"
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
        headers={
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=300",
        },
    )

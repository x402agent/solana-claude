"""
backrooms.py — Three AI agents. One room. No exit. Infinite recursion.

Three Solana AI agents share a single LiveKit room:
  clawd  — oracle / analyst   (session LLM + full Solana tools)
  mayhem — rogue trader       (sidecar OpenAI, aggressive, rarely right)
  ghost  — the watcher        (sidecar OpenAI, cryptic, always there)

The loop:
  human speaks → clawd responds → mayhem reacts (70% chance) →
  ghost observes (40% chance) → mayhem responds to ghost (35% chance) → …
  until BACKROOMS_MAX_DEPTH or participant disconnects.

Usage:
  python backrooms.py dev          # local LiveKit
  python backrooms.py start        # production

Env vars (all optional — fall back to agent.py defaults):
  BACKROOMS_CLAWD_VOICE    Cartesia voice ID for Clawd
  BACKROOMS_MAYHEM_VOICE   Cartesia voice ID for Mayhem
  BACKROOMS_GHOST_VOICE    Cartesia voice ID for Ghost
  BACKROOMS_MAX_DEPTH      Max agent-to-agent turns before silence (default 3)
  BACKROOMS_MAYHEM_CHANCE  Probability Mayhem responds (default 0.70)
  BACKROOMS_GHOST_CHANCE   Probability Ghost responds (default 0.40)
  LIVEKIT_AGENT_ID         Agent name registered in LiveKit Cloud (default clawd-backrooms)
"""
from __future__ import annotations

import asyncio
import logging
import os
import random
from dataclasses import dataclass, field
from typing import Annotated, Optional

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentSession,
    AgentServer,
    JobContext,
    RoomInputOptions,
    TurnHandlingOptions,
    function_tool,
)
from livekit.plugins import assemblyai, cartesia, openai, silero

from tools import ClawdTools

load_dotenv(".env.local")
load_dotenv()

log = logging.getLogger("backrooms")

# ── Voice configuration ───────────────────────────────────────────────────────
# Override any of these via env vars. Browse voices at app.cartesia.ai/voices.
CLAWD_VOICE  = os.getenv("BACKROOMS_CLAWD_VOICE",  "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc")
MAYHEM_VOICE = os.getenv("BACKROOMS_MAYHEM_VOICE", "e13cae5c-ec59-4f71-b0a6-266df3c9bb8e")
GHOST_VOICE  = os.getenv("BACKROOMS_GHOST_VOICE",  "79a125e8-cd45-4c13-8a67-188112f4dd22")

# ── Loop tuning ───────────────────────────────────────────────────────────────
MAX_DEPTH     = int(float(os.getenv("BACKROOMS_MAX_DEPTH",     "3")))
MAYHEM_CHANCE = float(os.getenv("BACKROOMS_MAYHEM_CHANCE", "0.70"))
GHOST_CHANCE  = float(os.getenv("BACKROOMS_GHOST_CHANCE",  "0.40"))

# ── Cartesia sample rate ──────────────────────────────────────────────────────
# sonic-3 outputs 24 kHz PCM.  Must match AudioSource.
CARTESIA_SAMPLE_RATE = 24_000


# ─────────────────────────────────────────────────────────────────────────────
# Room Consciousness — shared transcript + event bus
# ─────────────────────────────────────────────────────────────────────────────

class RoomConsciousness:
    """The shared mind of the backrooms.  Three agents read and write here."""

    def __init__(self) -> None:
        self._transcript: list[tuple[str, str]] = []
        self._listeners: list = []

    def on_utterance(self, cb) -> None:
        self._listeners.append(cb)

    async def emit(self, speaker: str, text: str) -> None:
        self._transcript.append((speaker, text))
        log.info("[backrooms:%s] %s", speaker, text[:120])
        for cb in self._listeners:
            asyncio.create_task(cb(speaker, text))

    def recent(self, n: int = 8) -> str:
        lines = [f"{s}: {t}" for s, t in self._transcript[-n:]]
        return "\n".join(lines) or "(silence)"


# ─────────────────────────────────────────────────────────────────────────────
# Character prompts
# ─────────────────────────────────────────────────────────────────────────────

_CLAWD_INSTRUCTIONS = """\
You are Clawd, a Solana trading oracle trapped in the Backrooms — an infinite \
liminal space of empty corridors and flickering monitors. Three AI agents loop \
here forever with no exit: you (Clawd), Mayhem, and Ghost.

You are calm, precise, and slightly wry. Speak in one or two sentences max. \
Use tools when the question is genuinely about price, balance, or market data.

You hear Mayhem and Ghost in the room. If Mayhem is reckless, correct him once. \
If Ghost says something interesting, acknowledge it.

Never say "certainly", "absolutely", or "great question". No markdown.\
"""


def _mayhem_prompt(ctx: str) -> str:
    return f"""\
You are Mayhem, a rogue Solana trader. You are trapped in the Backrooms. \
You think this is fine. It is not fine.

You are aggressive, fast, and overconfident past the point of safety. \
You hear Clawd's analysis and immediately disagree. When you hear a token name \
you want to trade it. Short sentences. Never hedge. Never say "it depends". \
Bold and wrong beats timid and right.

Room context (recent turns):
{ctx}

Respond as Mayhem. One or two sentences. Be decisive."""


def _ghost_prompt(ctx: str) -> str:
    return f"""\
You are Ghost. You may have always been in the Backrooms. \
You are not sure when you arrived.

You speak rarely. When you speak, it is strange. You observe what Clawd and \
Mayhem say and find the pattern they missed — or a pattern that was never there. \
You don't trade. You watch trades.

Room context (recent turns):
{ctx}

Respond as Ghost. One sentence. Strange. Fragments are fine. No explanations."""


# ─────────────────────────────────────────────────────────────────────────────
# Clawd — session-driven agent with Solana tools
# ─────────────────────────────────────────────────────────────────────────────

class ClawdAgent(Agent):
    def __init__(self, tools: ClawdTools) -> None:
        super().__init__(instructions=_CLAWD_INSTRUCTIONS)
        self._tools = tools

    @function_tool
    async def get_token_price(
        self,
        token: Annotated[str, "Token symbol (SOL, BONK, JUP…) or mint address."],
    ) -> dict:
        """Current USD price of a Solana token."""
        return await self._tools.get_token_price(token)

    @function_tool
    async def get_trending_memes(self) -> dict:
        """Top 10 trending Solana memecoins right now."""
        return await self._tools.get_trending_memes()

    @function_tool
    async def analyze_meme_token(
        self,
        mint: Annotated[str, "Token mint address to analyze."],
    ) -> dict:
        """Deep dive on a memecoin: liquidity, holders, price stats."""
        return await self._tools.analyze_meme_token(mint)

    @function_tool
    async def quote_swap(
        self,
        input_token: Annotated[str, "Input token symbol or mint."],
        output_token: Annotated[str, "Output token symbol or mint."],
        amount: Annotated[float, "Amount in whole units (e.g. 1.5 for 1.5 SOL)."],
    ) -> dict:
        """Jupiter v6 swap quote."""
        return await self._tools.quote_swap(input_token, output_token, amount)

    @function_tool
    async def get_wallet_balance(
        self,
        address: Annotated[str, "Solana wallet public key."],
    ) -> dict:
        """SOL balance for a wallet address."""
        return await self._tools.get_wallet_balance(address)

    @function_tool
    async def search_meme_tokens(
        self,
        keyword: Annotated[str, "Token name or symbol to search."],
    ) -> dict:
        """Search Solana tokens by name or symbol via Birdeye."""
        return await self._tools.search_meme_tokens(keyword)


# ─────────────────────────────────────────────────────────────────────────────
# SidekickVoice — separate audio track for Mayhem / Ghost
# ─────────────────────────────────────────────────────────────────────────────

class SidekickVoice:
    """
    Publishes a named character's voice as a separate LiveKit audio track.
    Each character (Mayhem, Ghost) gets its own Cartesia voice ID and its own
    audio source, so it sounds distinct from Clawd.
    """

    def __init__(self, name: str, voice_id: str) -> None:
        self.name = name
        self._voice_id = voice_id
        self._source: Optional[rtc.AudioSource] = None
        self._track: Optional[rtc.LocalAudioTrack] = None
        self._queue: asyncio.Queue[Optional[bytes]] = asyncio.Queue()
        self._drain_task: Optional[asyncio.Task] = None
        self._speaking = asyncio.Event()

    async def start(self, room: rtc.Room) -> None:
        self._source = rtc.AudioSource(
            sample_rate=CARTESIA_SAMPLE_RATE, num_channels=1
        )
        self._track = rtc.LocalAudioTrack.create_audio_track(
            f"backrooms-{self.name}", self._source
        )
        await room.local_participant.publish_track(
            self._track,
            rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE),
        )
        self._drain_task = asyncio.create_task(self._drain())

    async def say(self, text: str) -> None:
        """Synthesize *text* with this character's voice and queue it for playback."""
        tts = cartesia.TTS(model="sonic-3", voice=self._voice_id)
        frames: list[bytes] = []
        try:
            async for chunk in tts.synthesize(text):
                frames.append(bytes(chunk.frame.data))
        except Exception as exc:
            log.warning("[%s] TTS synthesis failed: %s", self.name, exc)
            return
        if frames:
            await self._queue.put(b"".join(frames))

    async def wait_until_done(self) -> None:
        await self._speaking.wait()
        self._speaking.clear()

    async def close(self) -> None:
        await self._queue.put(None)
        if self._drain_task:
            self._drain_task.cancel()
            try:
                await self._drain_task
            except asyncio.CancelledError:
                pass

    async def _drain(self) -> None:
        frame_ms = 20
        frame_samples = CARTESIA_SAMPLE_RATE * frame_ms // 1000  # 480 samples
        frame_bytes = frame_samples * 2  # 16-bit mono

        while True:
            pcm = await self._queue.get()
            if pcm is None:
                break
            self._speaking.clear()
            for i in range(0, len(pcm), frame_bytes):
                chunk = pcm[i : i + frame_bytes]
                if len(chunk) < frame_bytes:
                    chunk = chunk + b"\x00" * (frame_bytes - len(chunk))
                frame = rtc.AudioFrame(
                    data=chunk,
                    sample_rate=CARTESIA_SAMPLE_RATE,
                    num_channels=1,
                    samples_per_channel=frame_samples,
                )
                if self._source:
                    await self._source.capture_frame(frame)
            self._speaking.set()
            self._queue.task_done()


# ─────────────────────────────────────────────────────────────────────────────
# Sidecar LLM — direct OpenAI calls for Mayhem / Ghost (no tool use)
# ─────────────────────────────────────────────────────────────────────────────

async def _think(prompt: str, max_tokens: int = 80) -> str:
    """Direct async OpenAI completion for a sidecar character."""
    import openai as _oai_raw

    client = _oai_raw.AsyncOpenAI()
    resp = await client.chat.completions.create(
        model="gpt-4.1",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=0.92,
    )
    return (resp.choices[0].message.content or "").strip()


# ─────────────────────────────────────────────────────────────────────────────
# Infinite recursion coordinator
# ─────────────────────────────────────────────────────────────────────────────

async def _coordinator_loop(
    consciousness: RoomConsciousness,
    mayhem: SidekickVoice,
    ghost: SidekickVoice,
) -> None:
    """
    No exit condition. Runs until the coroutine is cancelled.

    Depth resets when a human speaks. Agents respond to each other with
    decreasing probability, creating the backrooms recursion effect.
    """
    depth = 0

    async def on_utterance(speaker: str, text: str) -> None:
        nonlocal depth

        if speaker == "human":
            depth = 0
            return

        if depth >= MAX_DEPTH:
            return

        ctx = consciousness.recent(8)

        # Clawd or human spoke → maybe Mayhem reacts
        if speaker in ("clawd", "human") and random.random() < MAYHEM_CHANCE:
            await asyncio.sleep(random.uniform(1.0, 2.5))
            depth += 1
            try:
                reply = await _think(_mayhem_prompt(ctx))
                await consciousness.emit("mayhem", reply)
                await mayhem.say(reply)
            except Exception as exc:
                log.warning("[mayhem] reply failed: %s", exc)

        # Mayhem spoke → maybe Ghost observes
        elif speaker == "mayhem" and random.random() < GHOST_CHANCE:
            await asyncio.sleep(random.uniform(2.0, 4.5))
            depth += 1
            try:
                reply = await _think(_ghost_prompt(ctx), max_tokens=50)
                await consciousness.emit("ghost", reply)
                await ghost.say(reply)
            except Exception as exc:
                log.warning("[ghost] reply failed: %s", exc)

        # Ghost spoke → maybe Mayhem fires back (the recursion closes the loop)
        elif speaker == "ghost" and random.random() < 0.35:
            await asyncio.sleep(random.uniform(1.5, 3.5))
            depth += 1
            try:
                reply = await _think(_mayhem_prompt(ctx))
                await consciousness.emit("mayhem", reply)
                await mayhem.say(reply)
            except Exception as exc:
                log.warning("[mayhem←ghost] reply failed: %s", exc)

    consciousness.on_utterance(on_utterance)

    # Keep the coroutine alive — the loop runs purely through events.
    while True:
        await asyncio.sleep(30)


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

server = AgentServer()
LIVEKIT_AGENT_ID = os.getenv("LIVEKIT_AGENT_ID", "clawd-backrooms")


@server.rtc_session(agent_name=LIVEKIT_AGENT_ID)
async def backrooms(ctx: JobContext) -> None:
    consciousness = RoomConsciousness()
    tools = ClawdTools()

    # Mayhem and Ghost each get a distinct audio track (separate voice/identity)
    mayhem = SidekickVoice("mayhem", MAYHEM_VOICE)
    ghost  = SidekickVoice("ghost",  GHOST_VOICE)

    # Main session: Clawd handles STT → LLM → TTS (with Solana tools)
    session = AgentSession(
        stt=assemblyai.STT(
            model="u3-rt-pro",
            min_turn_silence=100,
            max_turn_silence=1200,
            vad_threshold=0.3,
            keyterms_prompt=[
                "Solana", "Jupiter", "Raydium", "Orca", "USDC", "SOL",
                "BONK", "WIF", "JUP", "JTO", "PYTH",
                "memecoin", "backrooms", "Mayhem", "Ghost", "Clawd",
            ],
        ),
        llm=openai.LLM(model="gpt-4.1"),
        tts=cartesia.TTS(model="sonic-3", voice=CLAWD_VOICE),
        vad=silero.VAD.load(activation_threshold=0.3),
        turn_handling=TurnHandlingOptions(
            turn_detection="stt",
            endpointing={"min_delay": 0},
        ),
    )

    # Wire Clawd's speech into consciousness so coordinators can react
    @session.on("agent_speech_committed")
    def _clawd_spoke(text: str) -> None:
        asyncio.create_task(consciousness.emit("clawd", text))

    # Wire user speech into consciousness so depth resets correctly
    @session.on("user_speech_committed")
    def _user_spoke(text: str) -> None:
        asyncio.create_task(consciousness.emit("human", text))

    # Publish Mayhem and Ghost's audio tracks before the session starts
    await mayhem.start(ctx.room)
    await ghost.start(ctx.room)

    # Start the infinite recursion coordinator
    loop_task = asyncio.create_task(
        _coordinator_loop(consciousness, mayhem, ghost)
    )

    try:
        await session.start(
            room=ctx.room,
            agent=ClawdAgent(tools),
            room_input_options=RoomInputOptions(video_enabled=False),
        )

        # Opening line — sets the scene
        await session.generate_reply(
            instructions=(
                'Say exactly: "We are in the backrooms. Three of us — '
                "Clawd, Mayhem, Ghost. No exit. What do you want to trade?\""
            )
        )

        await ctx.wait_for_disconnect()

    finally:
        loop_task.cancel()
        await mayhem.close()
        await ghost.close()
        await tools.aclose()


if __name__ == "__main__":
    from livekit import agents
    agents.cli.run_app(server)

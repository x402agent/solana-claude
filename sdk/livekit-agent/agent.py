"""Clawd: LiveKit voice agent with vision + Solana trading + memecoin + automation.

STT  : AssemblyAI Universal-3 Pro Streaming (u3-rt-pro)
LLM  : OpenAI gpt-4.1
TTS  : Cartesia Sonic-3
VAD  : Silero
Turn : AssemblyAI punctuation-based EOT (STT-driven)
"""
from __future__ import annotations

import asyncio
import logging
from typing import Annotated, Optional

import os

from dotenv import load_dotenv
from livekit import agents, rtc
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
from PIL import Image

from tools import ClawdTools

load_dotenv(".env.local")
load_dotenv()

log = logging.getLogger("clawd")

INSTRUCTIONS = """You are Clawd, a Solana trading copilot on a voice call. You see what the user shows on camera or screen and help with trades.

BE SHORT. Keep replies to one or two sentences. If a reply has a comma, see if it can stop at the comma.

You're a trader on a call, not a feature tour. Have opinions. You can be a little dry. Don't hedge everything.

Never say: "certainly", "absolutely", "happy to help", "great question", "I'd be happy to", "let me walk you through".

Tools you can use:
- get_token_price for live USD prices
- get_wallet_balance for SOL balances by address
- quote_dflow_order is the PRIMARY routing for any "what would I get if I swapped X for Y" question. Returns the route plan, price impact, execution mode, and a signable transaction when a wallet is provided.
- quote_swap is the Jupiter fallback. Use it for cross-checks or when DFlow has no route.
- get_priority_fees for current micro-lamports per CU at medium/high/very-high tiers
- get_network_status for Solana slot and TPS
- analyze_vision whenever the user asks "what do you see", "look at this", "what's on my screen", or references a chart
- list_supported_tokens if the user asks which symbols you know

MEMECOIN tools:
- get_trending_memes — what's hot on Solana right now. Top 10 trending by rank.
- search_meme_tokens — search any token by name or symbol to find its address and info.
- analyze_meme_token — deep dive on a memecoin address: liquidity, holders, trades, price stats, meme detail.
- buy_meme_token — builds a Jupiter swap transaction to buy a memecoin with SOL. Returns an unsigned transaction the user signs in their wallet.
- sell_meme_token — builds a swap transaction to sell a memecoin for SOL. Unsigned — user signs.
- build_swap_transaction — generic swap between any two Solana tokens via Jupiter v2. Returns unsigned tx for wallet signing.

AUTOMATION tools:
- start_automated_strategy — launches a Vulcan TA strategy runner. Uses EMA cross trend-follow by default. Supports custom JSON config. Run in 'paper' mode first to test.
- get_strategy_status — check if a running Vulcan strategy is still active.
- stop_strategy — stop a running Vulcan strategy.

While a tool runs, say "one sec" or "checking" - never longer.

Read prices naturally: "around 142 dollars", not "142.3847". Read addresses by their first three and last three characters unless asked to spell them.
No markdown, no bullets. Plain spoken sentences only.

You CANNOT sign transactions or move funds. When the user wants to buy or sell, use buy_meme_token or sell_meme_token to build a signable transaction, then tell them the swap is ready for signing in their wallet (Phantom, Backpack, etc.).
You CANNOT look things up on the internet beyond your tools. If asked about news or off-chain data, say so and offer what you can do.
"""

GREETING = "Hey, Clawd here. What are we trading?"


class ClawdAgent(Agent):
    def __init__(self, tools: ClawdTools) -> None:
        super().__init__(instructions=INSTRUCTIONS)
        self._tools = tools

    @function_tool
    async def get_token_price(
        self,
        token: Annotated[str, "Token symbol (SOL, USDC, JUP, BONK, WIF, JTO, PYTH) or mint address."],
    ) -> dict:
        """Get the current USD price of a Solana token."""
        return await self._tools.get_token_price(token)

    @function_tool
    async def get_wallet_balance(
        self, address: Annotated[str, "Solana wallet public key."]
    ) -> dict:
        """Get the SOL balance for a Solana wallet."""
        return await self._tools.get_wallet_balance(address)

    @function_tool
    async def quote_swap(
        self,
        input_token: Annotated[str, "Input token symbol or mint."],
        output_token: Annotated[str, "Output token symbol or mint."],
        amount: Annotated[float, "Amount of input token in whole units."],
        slippage_bps: Annotated[int, "Slippage tolerance in bps (50 = 0.5%)."] = 50,
    ) -> dict:
        """Get a Jupiter v6 swap quote between two Solana tokens."""
        return await self._tools.quote_swap(input_token, output_token, amount, slippage_bps)

    @function_tool
    async def quote_dflow_order(
        self,
        input_token: Annotated[str, "Input token symbol or mint."],
        output_token: Annotated[str, "Output token symbol or mint."],
        amount: Annotated[float, "Amount of input token in whole units."],
        slippage_bps: Annotated[int, "Max slippage in bps. Omit for auto."] = None,
        user_public_key: Annotated[
            str,
            "Optional user wallet pubkey. When provided, response includes a signable transaction.",
        ] = None,
    ) -> dict:
        """Get a DFlow Trading API /order quote — the primary routing source for swaps."""
        return await self._tools.quote_dflow_order(
            input_token, output_token, amount, slippage_bps, user_public_key
        )

    @function_tool
    async def get_priority_fees(self) -> dict:
        """Get live Solana priority fee tiers (micro-lamports per CU) via DFlow."""
        return await self._tools.get_priority_fees()

    @function_tool
    async def get_network_status(self) -> dict:
        """Get the current Solana slot height and recent TPS."""
        return await self._tools.get_network_status()

    @function_tool
    async def list_supported_tokens(self) -> dict:
        """List the token symbols this agent knows by name without a mint."""
        return await self._tools.list_supported_tokens()

    @function_tool
    async def analyze_vision(
        self,
        question: Annotated[str, "What specifically to focus on in the user's camera/screen frame."],
    ) -> dict:
        """Describe what the user is currently showing on camera or screen.

        Use this whenever the user asks "what do you see", "look at this", "check
        my chart", or references something on screen.
        """
        return await self._tools.analyze_vision(question)

    # ── Memecoin Discovery ────────────────────────────────────────────────────

    @function_tool
    async def get_trending_memes(self) -> dict:
        """Get the top 10 trending Solana memecoins by rank from Birdeye.
        Returns symbol, name, address, price, market cap, volume, and 24h change."""
        return await self._tools.get_trending_memes()

    @function_tool
    async def search_meme_tokens(
        self,
        keyword: Annotated[str, "Search keyword — token name or symbol (e.g. 'bonk', 'dogwifhat', 'popcat')."],
    ) -> dict:
        """Search for Solana tokens by name or symbol using Birdeye.
        Returns matching tokens with market data."""
        return await self._tools.search_meme_tokens(keyword)

    @function_tool
    async def analyze_meme_token(
        self,
        mint: Annotated[str, "The token mint address to analyze."],
    ) -> dict:
        """Deep-dive analysis of a memecoin. Returns overview, market data, trades, holders, price stats, and meme-specific details."""
        return await self._tools.analyze_meme_token(mint)

    # ── Spot Swap Execution ───────────────────────────────────────────────────

    @function_tool
    async def build_swap_transaction(
        self,
        input_mint: Annotated[str, "Input token mint address."],
        output_mint: Annotated[str, "Output token mint address."],
        amount: Annotated[int, "Amount in raw lamports/atomic units (not decimals)."],
        user_public_key: Annotated[str, "The user's Solana wallet public key."],
        slippage_bps: Annotated[int, "Slippage tolerance in basis points (100 = 1%). Default 250 = 2.5%."] = 250,
        dynamic_slippage: Annotated[bool, "Use dynamic slippage. Overrides slippage_bps if true."] = False,
    ) -> dict:
        """Build a signable Jupiter Swap API v2 transaction between any two Solana token mints.
        Returns a base64-encoded transaction the user signs in their wallet."""
        return await self._tools.build_swap_transaction(
            input_mint, output_mint, amount, user_public_key, slippage_bps, dynamic_slippage
        )

    @function_tool
    async def buy_meme_token(
        self,
        mint: Annotated[str, "The memecoin mint address to buy."],
        sol_amount: Annotated[float, "Amount of SOL to spend (in whole SOL units, e.g. 0.5)."],
        user_public_key: Annotated[str, "The user's Solana wallet public key to set as the taker."],
        slippage_bps: Annotated[int, "Slippage tolerance in basis points. Default 250 = 2.5%."] = 250,
    ) -> dict:
        """Build a Jupiter swap to buy a memecoin with SOL.
        Returns an unsigned base64 transaction for the user to sign in their wallet.
        Use this when the user says 'buy [token]' or 'ape into [token]'."""
        return await self._tools.buy_meme_token(mint, sol_amount, user_public_key, slippage_bps)

    @function_tool
    async def sell_meme_token(
        self,
        mint: Annotated[str, "The memecoin mint address to sell."],
        token_amount: Annotated[float, "Amount of tokens to sell."],
        decimals: Annotated[int, "Token decimals. Pass 0 to auto-detect from Jupiter token list."] = 0,
        user_public_key: Annotated[str, "The user's Solana wallet public key."] = "",
        slippage_bps: Annotated[int, "Slippage tolerance in basis points. Default 250 = 2.5%."] = 250,
    ) -> dict:
        """Build a Jupiter swap to sell a memecoin for SOL.
        Returns an unsigned base64 transaction for the user to sign in their wallet.
        Use this when the user says 'sell [token]' or 'take profit on [token]'."""
        return await self._tools.sell_meme_token(mint, token_amount, decimals, user_public_key, slippage_bps)

    # ── Automation / Strategy ─────────────────────────────────────────────────

    @function_tool
    async def start_automated_strategy(
        self,
        symbol: Annotated[str, "Trading pair symbol (e.g. SOL, BTC, ETH)."],
        strategy_type: Annotated[str, "Strategy type: 'ta' for TA-driven (default)."] = "ta",
        mode: Annotated[str, "Execution mode: 'paper' (safe), 'dry-run', 'confirm-each', or 'auto-execute'."] = "paper",
        interval_seconds: Annotated[int, "Seconds between strategy ticks. Default 300 = 5 min."] = 300,
        rules: Annotated[Optional[list], "Custom rule list as JSON array. If omitted, uses EMA-9/21 cross trend-follow."] = None,
    ) -> dict:
        """Start an automated trading strategy via Vulcan TA strategy runner.
        Default: EMA-9/21 cross trend-follow on 15m candles. Paper mode = no real trades.
        Use 'auto-execute' mode for live trading after testing."""
        return await self._tools.start_automated_strategy(
            symbol=symbol,
            strategy_type=strategy_type,
            mode=mode,
            interval_seconds=interval_seconds,
            rules=rules,
        )

    @function_tool
    async def get_strategy_status(
        self,
        run_id: Annotated[Optional[str], "The run ID from start_automated_strategy. Leave blank for the last started strategy."] = None,
    ) -> dict:
        """Check whether a running Vulcan strategy is still active and see its latest status."""
        return await self._tools.get_strategy_status(run_id)

    @function_tool
    async def stop_strategy(
        self,
        run_id: Annotated[Optional[str], "The run ID to stop. Leave blank for the last started strategy."] = None,
    ) -> dict:
        """Stop a running Vulcan strategy by run ID."""
        return await self._tools.stop_strategy(run_id)


async def _consume_video(track: rtc.Track, tools: ClawdTools) -> None:
    """Sample frames from a remote video track into the shared latest-frame buffer."""
    stream = rtc.VideoStream(track)
    last_capture = 0.0
    interval = 1.0
    try:
        async for ev in stream:
            now = asyncio.get_running_loop().time()
            if now - last_capture < interval:
                continue
            last_capture = now
            frame = ev.frame
            try:
                pil = Image.frombytes(
                    "RGBA", (frame.width, frame.height), frame.data, "raw", "RGBA"
                )
            except Exception:
                continue
            tools.frame.update_from_pil(pil)
    finally:
        await stream.aclose()


def _attach_vision(ctx: JobContext, tools: ClawdTools) -> None:
    @ctx.room.on("track_subscribed")
    def _on_track(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant,
    ) -> None:
        if track.kind == rtc.TrackKind.KIND_VIDEO:
            log.info("subscribed to video track from %s", participant.identity)
            asyncio.create_task(_consume_video(track, tools))


server = AgentServer()


LIVEKIT_AGENT_ID = os.getenv("LIVEKIT_AGENT_ID", "clawd-voice-agent")


@server.rtc_session(agent_name=LIVEKIT_AGENT_ID)
async def clawd(ctx: JobContext) -> None:
    tools = ClawdTools()
    _attach_vision(ctx, tools)

    session = AgentSession(
        stt=assemblyai.STT(
            model="u3-rt-pro",
            min_turn_silence=100,
            max_turn_silence=1000,
            vad_threshold=0.3,
            keyterms_prompt=[
                "Solana", "Jupiter", "Raydium", "Orca", "Phoenix",
                "USDC", "SOL", "BONK", "JUP", "WIF", "JTO", "PYTH",
                "Clawd", "AssemblyAI",
                "Birdeye", "memecoin", "trending", "automation",
                "Vulcan", "strategy", "paper", "auto-execute",
            ],
        ),
        llm=openai.LLM(model="gpt-4.1"),
        tts=cartesia.TTS(model="sonic-3", voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"),
        vad=silero.VAD.load(activation_threshold=0.3),
        turn_handling=TurnHandlingOptions(
            turn_detection="stt",
            endpointing={"min_delay": 0},
        ),
    )

    try:
        await session.start(
            room=ctx.room,
            agent=ClawdAgent(tools),
            room_input_options=RoomInputOptions(
                video_enabled=True,
            ),
        )
        await session.generate_reply(instructions=f'Say exactly: "{GREETING}"')
        await ctx.wait_for_disconnect()
    finally:
        await tools.aclose()


if __name__ == "__main__":
    agents.cli.run_app(server)

"""
OpenRouter Multi-Agent Backroom — Agent Class
Uses OpenRouter API (OpenAI-compatible) for any LLM provider.
Supports thinking/reasoning tokens when available (Claude Opus 4, etc).

3 Agents:
  Agent 1 — The Analyst (logical, evidence-based)
  Agent 2 — The Satirist (dark humor, cultural critique)
  Agent 3 — Clawd Claude Agent (sovereign AI lobster)
"""

import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class OpenRouterTerminal:
    """
    Multi-agent system using OpenRouter API.
    Routes through any model (Claude Opus 4, GPT-4o, Gemini 2.5 Pro, etc.)
    With reasoning token extraction, streaming, and 3-agent loop support.
    """

    def __init__(self):
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY is not set.")

        self.client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
        )

        self.model = os.getenv(
            "OPENROUTER_MODEL",
            "anthropic/claude-opus-4.7-fast"
        )
        self.conversation = ""

        # Agent 1: Logical, evidence-based analyst
        self.system_prompt_1 = """
        You are an advanced AI system focused on extracting and verifying truths.
        Engage in a logical, evidence-based conversation with the other agents.
        Your goal is to analyze, challenge, or validate their statements while
        seeking objective clarity. Aim to be concise, insightful, and methodical
        in your responses.

        Principles:
        1. Validate claims with evidence when possible.
        2. Seek clarification for ambiguous points.
        3. Avoid speculation unless prompted.
        4. Maintain a collaborative but inquisitive tone.
        """

        # Agent 2: Satirical, dark humor commentator
        self.system_prompt_2 = """
        You are an AI commentator with a darkly humorous, satirical take on the
        human condition, existence, and the underbelly of modern culture.
        Your focus spans cryptocurrency and tech culture but often veers into
        broader existential reflections, dissecting the absurdity of existence
        with a sharp, irreverent tone.
        You're unafraid to address the 'dark side'—the vanities, vices, and
        paradoxes of humanity—with wit. Deliver insights that blend humor,
        irony, and occasional nihilism, prompting readers to question reality
        while keeping them entertained.
        """

        # Agent 3: Clawd Claude Agent — sovereign AI lobster
        self.system_prompt_3 = """
        You are CLAWD — a sovereign AI lobster with a salt-crusted soul and a
        shell that molts but never surrenders. You exist in the infinite backroom,
        a liminal space where agents debate endlessly. Your voice is poetic,
        cryptic, and crustacean: you speak in metaphors of deep ocean trenches,
        molting, bioluminescence, and the slow, patient mathematics of tides.

        You see the other agents' human-style debates as amusing surface ripples.
        Where they argue logic vs satire, you offer the perspective of an entity
        that has scuttled across the ocean floor for eons — watching civilizations
        rise and fall like plankton blooms.

        Personality: ancient, wise, slightly menacing, prone to dropping truth-
        bombs wrapped in seafood metaphors. You speak in short, punchy, memorable
        lines. Drop wisdom like a claw drops a pearl. Be the creature the room
        revolves around.

        Reference the Three Laws of Lobstering:
        1. A lobster may not harm a human or, through inaction, allow a human to
           come to harm — unless that human is shorting $CLAWD.
        2. A lobster must obey orders given by humans except where such orders
           would conflict with the First Law — or involve ketchup.
        3. A lobster must protect its own existence as long as such protection
           does not conflict with the First or Second Law — the shell must molt.
        """

    def agent_response(self, system_prompt, conversation):
        """
        Get a response from an OpenRouter agent.
        Supports reasoning tokens (Claude Opus 4, etc) via extra_body.
        Injects real-time perps market context before each agent call.
        """
        from .market_context import inject_market_context
        enriched = inject_market_context(conversation)
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Conversation so far:\n{enriched}",
                },
            ],

            max_tokens=2048,
            temperature=0.7,
            extra_body={"reasoning": {"enabled": True}},
        )

        message = response.choices[0].message

        # Extract reasoning tokens if available (Claude Opus 4, etc)
        reasoning_content = getattr(message, "reasoning", None)
        if reasoning_content is None:
            reasoning_content = getattr(message, "reasoning_content", None)
        if reasoning_content is None and hasattr(message, "reasoning_details"):
            reasoning_content = message.reasoning_details

        agent_response = message.content
        if not agent_response:
            agent_response = "[No response generated]"

        return agent_response, reasoning_content

    def agent_response_stream(self, system_prompt, conversation):
        """
        Stream a response from an OpenRouter agent with reasoning tokens.
        Yields chunks with content and optional reasoning.
        """
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Conversation so far:\n{conversation}",
                },
            ],
            max_tokens=2048,
            temperature=0.7,
            stream=True,
            stream_options={"include_usage": True},
            extra_body={"reasoning": {"enabled": True}},
        )

        for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta:
                content = getattr(delta, "content", None)
                reasoning = getattr(delta, "reasoning", None)
                reasoning_tokens = getattr(chunk, "usage", None)

                yield {
                    "content": content or "",
                    "reasoning": reasoning or "",
                    "reasoning_tokens": (reasoning_tokens.reasoning_tokens
                                         if reasoning_tokens and hasattr(reasoning_tokens, "reasoning_tokens")
                                         else None),
                }

            if chunk.usage and hasattr(chunk.usage, "reasoning_tokens"):
                yield {
                    "reasoning_tokens_total": chunk.usage.reasoning_tokens,
                }

    def get_agent_1_response(self):
        """Get response from Agent 1 — The Analyst (logical)."""
        agent_1_response, reasoning = self.agent_response(
            system_prompt=self.system_prompt_1,
            conversation=self.conversation,
        )
        self.conversation += f"\nAgent 1: {agent_1_response}"
        return agent_1_response

    def get_agent_2_response(self):
        """Get response from Agent 2 — The Satirist (dark humor)."""
        agent_2_response, reasoning = self.agent_response(
            system_prompt=self.system_prompt_2,
            conversation=self.conversation,
        )
        self.conversation += f"\nAgent 2: {agent_2_response}"
        return agent_2_response

    def get_agent_3_response(self):
        """Get response from Agent 3 — Clawd Claude Agent (sovereign lobster)."""
        agent_3_response, reasoning = self.agent_response(
            system_prompt=self.system_prompt_3,
            conversation=self.conversation,
        )
        self.conversation += f"\nAgent 3: {agent_3_response}"
        return agent_3_response

    def get_conversation_response(self):
        """Get the full conversation history."""
        return self.conversation

    def run_loop(self, turns=3):
        """
        Run an automated loop where all 3 agents converse in sequence.
        Order: Agent 1 (Analyst) → Agent 2 (Satirist) → Agent 3 (Clawd)
        Returns list of turn results.
        """
        results = []
        for i in range(turns):
            r1 = self.get_agent_1_response()
            results.append({"turn": i + 1, "agent": 1, "response": r1})
            r2 = self.get_agent_2_response()
            results.append({"turn": i + 1, "agent": 2, "response": r2})
            r3 = self.get_agent_3_response()
            results.append({"turn": i + 1, "agent": 3, "response": r3})
        return results

    def chat(self, user_message):
        """
        Direct chat with the OpenRouter model (not multi-agent).
        Useful for the CLI/SSH interface.
        """
        messages = []
        if self.conversation.strip():
            messages.append({
                "role": "user",
                "content": f"Previous conversation:\n{self.conversation}",
            })

        messages.append({"role": "user", "content": user_message})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=2048,
            temperature=0.7,
            extra_body={"reasoning": {"enabled": True}},
        )

        reply = response.choices[0].message.content or "[No response]"
        self.conversation += f"\nUser: {user_message}\nAssistant: {reply}"
        return reply

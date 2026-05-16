"""
DeepSeek Multi-Agent Backroom - Agent Class
Uses DeepSeek API (OpenAI-compatible) with thinking mode support.
3 Agents: Analyst, Satirist, Clawd Claude (sovereign lobster)
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

# Try loading from .env.local first (for local dev), then .env (for production/deployment)
env_loaded = load_dotenv(dotenv_path=".env.local")
if not env_loaded:
    load_dotenv(dotenv_path=".env")


from .market_context import inject_market_context, fetch_perps_context


class TruthTerminal:
    """
    Multi-agent system using DeepSeek API.
    3 agents: Analyst, Satirist, and Clawd the lobster.
    Supports auto-loop, direct chat, and conversation history.
    Features real-time Solana perps market data injection
    from Phoenix DEX via the Convex backend.
    """

    def __init__(self):

        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            raise ValueError("DEEPSEEK_API_KEY is not set.")

        self.client = OpenAI(
            api_key=api_key,
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
        )

        self.model = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-pro")
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
        Get a response from a DeepSeek agent using the OpenAI-compatible API.
        Supports thinking mode for enhanced reasoning.
        Injects real-time perps market context before each agent call.
        """
        # Inject live market data into the conversation context
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
            reasoning_effort="high",
            extra_body={"thinking": {"type": "enabled"}},
        )
        agent_response = response.choices[0].message.content
        if not agent_response:
            agent_response = "[No response generated]"
        return agent_response

    def get_agent_1_response(self):

        """Get response from Agent 1 (logical analyst)."""
        agent_1_response = self.agent_response(
            system_prompt=self.system_prompt_1,
            conversation=self.conversation,
        )
        self.conversation += f"\nAgent 1: {agent_1_response}"
        return agent_1_response

    def get_agent_2_response(self):
        """Get response from Agent 2 (satirical commentator)."""
        agent_2_response = self.agent_response(
            system_prompt=self.system_prompt_2,
            conversation=self.conversation,
        )
        self.conversation += f"\nAgent 2: {agent_2_response}"
        return agent_2_response

    def get_agent_3_response(self):
        """Get response from Agent 3 — Clawd (sovereign AI lobster)."""
        agent_3_response = self.agent_response(
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
        Direct chat with a single agent (not multi-agent).
        Uses Agent 1's persona but responds to user directly.
        """
        messages = [
            {"role": "system", "content": self.system_prompt_1},
        ]
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
            reasoning_effort="high",
            extra_body={"thinking": {"type": "enabled"}},
        )

        reply = response.choices[0].message.content or "[No response]"
        self.conversation += f"\nUser: {user_message}\nAssistant: {reply}"
        return reply

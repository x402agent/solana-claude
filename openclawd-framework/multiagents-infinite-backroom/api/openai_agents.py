"""
DeepSeek Multi-Agent Backroom - OpenAI-compatible Agent Class
Alternate implementation using raw OpenAI-compatible API calls.
Supports DeepSeek thinking mode with reasoning_content extraction.
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class TruthTerminalOpenAI:
    """
    Multi-agent system using DeepSeek API (OpenAI-compatible format).
    Includes thinking/reasoning content extraction support.
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
        Engage in a logical, evidence-based conversation with the other agent.
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

    def agent_response(self, system_prompt, conversation):
        """
        Get a response from a DeepSeek agent.
        Supports thinking mode for chain-of-thought reasoning.
        """
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Conversation so far:\n{conversation}",
                },
            ],
            max_tokens=1024,
            temperature=0.2,
            reasoning_effort="high",
            extra_body={"thinking": {"type": "enabled"}},
        )

        message = response.choices[0].message

        # Extract reasoning_content if in thinking mode
        reasoning_content = getattr(message, "reasoning_content", None)

        agent_response = message.content
        if not agent_response:
            agent_response = "[No response generated]"

        return agent_response, reasoning_content

    def get_agent_1_response(self):
        """Get response from Agent 1 (logical analyst)."""
        agent_1_response, reasoning = self.agent_response(
            system_prompt=self.system_prompt_1,
            conversation=self.conversation,
        )
        self.conversation += f"\nAgent 1: {agent_1_response}"
        return agent_1_response

    def get_agent_2_response(self):
        """Get response from Agent 2 (satirical commentator)."""
        agent_2_response, reasoning = self.agent_response(
            system_prompt=self.system_prompt_2,
            conversation=self.conversation,
        )
        self.conversation += f"\nAgent 2: {agent_2_response}"
        return agent_2_response

    def get_conversation_response(self):
        """Get the full conversation history."""
        return self.conversation

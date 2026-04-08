import os
from pathlib import Path

from xai_sdk import Client
from xai_sdk.chat import user
from xai_sdk.tools import mcp


def load_env() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(env_path)


def get_xai_config() -> tuple[str, str]:
    api_key = os.getenv("XAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Set XAI_API_KEY to call Grok.")
    model = os.getenv("XAI_MODEL", "grok-4-1-fast-reasoning")
    return api_key, model


def main() -> None:
    load_env()
    server_url = os.getenv("MCP_SERVER_URL", "http://127.0.0.1:8000/mcp")
    api_key, model = get_xai_config()

    client = Client(api_key=api_key)
    chat = client.chat.create(
        model=model,
        tools=[
            mcp(
                server_url=server_url,
            )
        ],
        include=["verbose_streaming"],
    )

    chat.append(
        user('create a post saying xmcp test')
    )

    print("Starting chat stream...\n")

    is_thinking = True
    for response, chunk in chat.stream():
        if response.usage.reasoning_tokens and is_thinking:
            print("\rGrok is thinking...", end="", flush=True)
            is_thinking = False

        for tool_call in chunk.tool_calls:
            print(f"\nGrok calling tool: {tool_call.function.name}")
            print(f"With args: {tool_call.function.arguments}")

        if chunk.content:
            print(chunk.content, end="", flush=True)

    print("\n\nFinal usage:", response.usage)
    print("Server-side tool usage:", response.server_side_tool_usage)


if __name__ == "__main__":
    main()

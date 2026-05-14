"""Trading Note Tool - Let agent record and recall trading information.

This tool allows the agent to:
- Record trade decisions, token research, and market observations
- Recall previously recorded trading notes
- Maintain context across trading sessions
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from .base import Tool, ToolResult


class TradingNoteTool(Tool):
    """Tool for recording trading notes and research.

    The agent can use this tool to:
    - Record token research and analysis
    - Track trade decisions and reasoning
    - Save market observations
    - Remember user preferences and risk tolerance

    Categories:
    - trade: Trade executions and results
    - research: Token research and analysis
    - market: Market observations
    - preference: User trading preferences
    - watchlist: Tokens to monitor
    """

    def __init__(self, memory_file: str = "./workspace/.trading_memory.json"):
        """Initialize trading note tool.

        Args:
            memory_file: Path to the note storage file
        """
        self.memory_file = Path(memory_file)

    @property
    def name(self) -> str:
        return "record_trading_note"

    @property
    def description(self) -> str:
        return (
            "Record important trading information for future reference. "
            "Use this to save:\n"
            "- Token research and analysis (category: research)\n"
            "- Trade decisions and outcomes (category: trade)\n"
            "- Market observations (category: market)\n"
            "- User preferences and risk settings (category: preference)\n"
            "- Tokens to watch (category: watchlist)\n"
            "Each note is timestamped for tracking."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "content": {
                    "type": "string",
                    "description": "The information to record. Be specific and include relevant data.",
                },
                "category": {
                    "type": "string",
                    "enum": ["trade", "research", "market", "preference", "watchlist", "general"],
                    "description": "Category for this note.",
                    "default": "general",
                },
                "token_mint": {
                    "type": "string",
                    "description": "Optional: Token mint address this note relates to.",
                },
            },
            "required": ["content"],
        }

    def _load_from_file(self) -> list:
        """Load notes from file."""
        if not self.memory_file.exists():
            return []
        try:
            return json.loads(self.memory_file.read_text())
        except Exception:
            return []

    def _save_to_file(self, notes: list):
        """Save notes to file."""
        self.memory_file.parent.mkdir(parents=True, exist_ok=True)
        self.memory_file.write_text(json.dumps(notes, indent=2, ensure_ascii=False))

    async def execute(
        self,
        content: str,
        category: str = "general",
        token_mint: str = None,
    ) -> ToolResult:
        """Record a trading note.

        Args:
            content: The information to record
            category: Category for this note
            token_mint: Optional token mint this relates to

        Returns:
            ToolResult with success status
        """
        try:
            notes = self._load_from_file()

            note = {
                "timestamp": datetime.now().isoformat(),
                "category": category,
                "content": content,
            }
            if token_mint:
                note["token_mint"] = token_mint

            notes.append(note)
            self._save_to_file(notes)

            return ToolResult(
                success=True,
                content=f"📝 Recorded {category} note: {content[:100]}{'...' if len(content) > 100 else ''}",
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=f"Failed to record note: {str(e)}",
            )


class RecallTradingNoteTool(Tool):
    """Tool for recalling recorded trading notes."""

    def __init__(self, memory_file: str = "./workspace/.trading_memory.json"):
        """Initialize recall note tool.

        Args:
            memory_file: Path to the note storage file
        """
        self.memory_file = Path(memory_file)

    @property
    def name(self) -> str:
        return "recall_trading_notes"

    @property
    def description(self) -> str:
        return (
            "Recall previously recorded trading notes. "
            "Filter by category (trade, research, market, preference, watchlist) "
            "or by token mint address. Returns all matching notes with timestamps."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["trade", "research", "market", "preference", "watchlist", "general", "all"],
                    "description": "Filter notes by category. Use 'all' for all notes.",
                },
                "token_mint": {
                    "type": "string",
                    "description": "Optional: Filter notes by token mint address.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of notes to return. Default 20.",
                    "default": 20,
                },
            },
        }

    async def execute(
        self,
        category: str = "all",
        token_mint: str = None,
        limit: int = 20,
    ) -> ToolResult:
        """Recall trading notes.

        Args:
            category: Category filter (or 'all')
            token_mint: Optional token filter
            limit: Max notes to return

        Returns:
            ToolResult with notes content
        """
        try:
            if not self.memory_file.exists():
                return ToolResult(
                    success=True,
                    content="No trading notes recorded yet.",
                )

            notes = json.loads(self.memory_file.read_text())

            if not notes:
                return ToolResult(
                    success=True,
                    content="No trading notes recorded yet.",
                )

            # Filter by category
            if category and category != "all":
                notes = [n for n in notes if n.get("category") == category]

            # Filter by token
            if token_mint:
                notes = [n for n in notes if n.get("token_mint") == token_mint]

            if not notes:
                filter_desc = []
                if category and category != "all":
                    filter_desc.append(f"category: {category}")
                if token_mint:
                    filter_desc.append(f"token: {token_mint[:8]}...")
                return ToolResult(
                    success=True,
                    content=f"No notes found matching {', '.join(filter_desc) or 'criteria'}",
                )

            # Get most recent notes
            notes = sorted(notes, key=lambda x: x.get("timestamp", ""), reverse=True)
            notes = notes[:limit]

            # Format notes
            formatted = []
            for idx, note in enumerate(notes, 1):
                timestamp = note.get("timestamp", "unknown")[:19].replace("T", " ")
                cat = note.get("category", "general")
                content = note.get("content", "")
                token = note.get("token_mint", "")
                
                line = f"{idx}. [{cat}] {content}"
                if token:
                    line += f"\n   Token: {token}"
                line += f"\n   📅 {timestamp}"
                formatted.append(line)

            result = f"📋 Trading Notes ({len(formatted)} of {len(notes)} total):\n\n" + "\n\n".join(formatted)

            return ToolResult(success=True, content=result)

        except Exception as e:
            return ToolResult(
                success=False,
                error=f"Failed to recall notes: {str(e)}",
            )


class ClearTradingNotesTool(Tool):
    """Tool for clearing trading notes."""

    def __init__(self, memory_file: str = "./workspace/.trading_memory.json"):
        self.memory_file = Path(memory_file)

    @property
    def name(self) -> str:
        return "clear_trading_notes"

    @property
    def description(self) -> str:
        return "Clear all trading notes or notes in a specific category. Use with caution!"

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["trade", "research", "market", "preference", "watchlist", "general", "all"],
                    "description": "Category to clear. Use 'all' to clear everything.",
                },
                "confirm": {
                    "type": "boolean",
                    "description": "Must be true to confirm deletion.",
                },
            },
            "required": ["category", "confirm"],
        }

    async def execute(self, category: str, confirm: bool = False) -> ToolResult:
        """Clear trading notes."""
        if not confirm:
            return ToolResult(
                success=False,
                error="Deletion not confirmed. Set confirm=true to proceed.",
            )

        try:
            if not self.memory_file.exists():
                return ToolResult(success=True, content="No notes to clear.")

            if category == "all":
                self.memory_file.unlink()
                return ToolResult(success=True, content="🗑️ All trading notes cleared.")

            notes = json.loads(self.memory_file.read_text())
            original_count = len(notes)
            notes = [n for n in notes if n.get("category") != category]
            removed = original_count - len(notes)

            self.memory_file.write_text(json.dumps(notes, indent=2, ensure_ascii=False))

            return ToolResult(
                success=True,
                content=f"🗑️ Cleared {removed} notes from category: {category}",
            )

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to clear notes: {str(e)}")

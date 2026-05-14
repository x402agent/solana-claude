import json
import os
from pathlib import Path

from mnemosyne.clawd_brain import BrainConfig, ClawdBrain


def test_clawd_brain_writes_memory_and_obsidian_note(tmp_path):
    os.environ["MNEMOSYNE_DATA_DIR"] = str(tmp_path / "data")
    try:
        brain = ClawdBrain(BrainConfig(vault_path=tmp_path / "vault", bank="clawd"))

        result = brain.remember(
            "BONK Perp Setup",
            "Watch [[BONK]] liquidity on Solana before any perp trade.",
            kind="perp",
            source="test",
            tags=["risk"],
        )

        note_path = Path(result["path"])
        assert note_path.exists()
        text = note_path.read_text(encoding="utf-8")
        assert "kind: \"perp\"" in text
        assert "[[BONK]]" in text
        assert "BONK" in result["links"]

        recalled = brain.recall("BONK liquidity perp", top_k=3)
        assert recalled["notes"]
        assert recalled["memories"]
    finally:
        os.environ.pop("MNEMOSYNE_DATA_DIR", None)


def test_clawd_brain_queues_research_topic(tmp_path):
    os.environ["MNEMOSYNE_DATA_DIR"] = str(tmp_path / "data")
    try:
        brain = ClawdBrain(BrainConfig(vault_path=tmp_path / "vault", bank="clawd"))
        result = brain.auto_research("Jupiter perps risk engine", tags=["jupiter"])
        note = Path(result["path"]).read_text(encoding="utf-8")
        assert "research_status: \"queued\"" in note
        assert "Jupiter perps risk engine" in note
    finally:
        os.environ.pop("MNEMOSYNE_DATA_DIR", None)


def test_clawd_brain_ingests_ooda_journal(tmp_path):
    os.environ["MNEMOSYNE_DATA_DIR"] = str(tmp_path / "data")
    try:
        journal = tmp_path / "ticks.jsonl"
        journal.write_text(
            json.dumps(
                {
                    "tick": 1,
                    "now": "2026-05-13T00:00:00Z",
                    "decision": {"action": "hold", "reason": "risk high"},
                    "outcome": "applied",
                }
            )
            + "\n",
            encoding="utf-8",
        )
        brain = ClawdBrain(BrainConfig(vault_path=tmp_path / "vault", bank="clawd"))
        result = brain.ingest_ooda_journal(journal, limit=10)
        assert result["imported"] == 1
        assert brain.status()["by_kind"]["signal"] == 1
    finally:
        os.environ.pop("MNEMOSYNE_DATA_DIR", None)

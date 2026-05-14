"""Tests for the Mem0 importer."""

import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from mnemosyne.core.importers.mem0 import Mem0Importer, import_from_mem0
from mnemosyne.core.importers.base import ImporterResult


# Sample Mem0 API response data
MEM0_FIXTURE = [
    {
        "id": "mem_abc123",
        "memory": "Abdias prefers dark mode",
        "user_id": "abdias",
        "agent_id": None,
        "app_id": "fluxspeak",
        "run_id": "run_001",
        "hash": "a1b2c3d4",
        "metadata": {"source": "preferences"},
        "categories": ["preference"],
        "created_at": "2026-04-01T10:00:00Z",
        "updated_at": None,
    },
    {
        "id": "mem_def456",
        "memory": "CI pipeline fails with parallel tests",
        "user_id": None,
        "agent_id": "ci-bot",
        "app_id": "mnemosyne",
        "run_id": "run_002",
        "hash": "b2c3d4e5",
        "metadata": {"severity": "high"},
        "categories": ["bug"],
        "created_at": "2026-04-02T14:30:00Z",
        "updated_at": "2026-04-02T15:00:00Z",
    },
]

MEM0_PAGINATED = {
    "count": 2,
    "next": None,
    "previous": None,
    "results": MEM0_FIXTURE,
}


class TestMem0Transform:
    """Test transform() in isolation — no API needed."""

    def test_basic_transform(self):
        importer = Mem0Importer(api_key="test_key")
        memories = importer.transform(MEM0_FIXTURE)

        assert len(memories) == 2
        assert memories[0]["content"] == "Abdias prefers dark mode"
        assert memories[0]["source"] == "mem0_import"
        assert memories[0]["importance"] == 0.5
        assert memories[0]["_author_id"] == "mem0_user:abdias"
        assert memories[0]["_author_type"] == "human"
        assert memories[0]["_channel_id"] == "fluxspeak"

    def test_agent_memory_maps_to_agent_type(self):
        importer = Mem0Importer(api_key="test_key")
        memories = importer.transform(MEM0_FIXTURE)

        # Second memory has agent_id but no user_id
        assert memories[1]["_author_id"] == "mem0_agent:ci-bot"
        assert memories[1]["_author_type"] == "agent"

    def test_metadata_preserved(self):
        importer = Mem0Importer(api_key="test_key")
        memories = importer.transform(MEM0_FIXTURE)

        assert memories[0]["metadata"]["source"] == "preferences"
        assert memories[0]["metadata"]["_mem0_id"] == "mem_abc123"
        assert memories[0]["metadata"]["_mem0_categories"] == ["preference"]

    def test_updated_at_preserved(self):
        importer = Mem0Importer(api_key="test_key")
        memories = importer.transform(MEM0_FIXTURE)

        # First memory has no updated_at — should not add _updated_at
        assert "_updated_at" not in memories[0]["metadata"]

        # Second memory has updated_at different from created_at
        assert "_updated_at" in memories[1]["metadata"]
        assert memories[1]["metadata"]["_updated_at"] == "2026-04-02T15:00:00Z"

    def test_empty_content_skipped(self):
        """Memories with empty content should be skipped."""
        data = [{"memory": "", "user_id": "test"}]
        importer = Mem0Importer(api_key="test_key")
        memories = importer.transform(data)
        assert len(memories) == 0

    def test_metadata_importance_inference(self):
        """If metadata has importance, use it."""
        data = [{
            "memory": "important fact",
            "user_id": "test",
            "metadata": {"importance": 0.95},
        }]
        importer = Mem0Importer(api_key="test_key")
        memories = importer.transform(data)
        assert memories[0]["importance"] == 0.95
        # importance should be popped from metadata
        assert "importance" not in memories[0]["metadata"]


class TestMem0Run:
    """Test run() with mocked Mnemosyne."""

    def test_run_imports_memories(self, tmp_path):
        """End-to-end run with mock extraction."""
        with patch.object(Mem0Importer, "extract", return_value=MEM0_FIXTURE):
            from mnemosyne.core.memory import Mnemosyne
            mem = Mnemosyne(session_id="test_mem0", db_path=tmp_path / "test.db")

            importer = Mem0Importer(api_key="test_key")
            result = importer.run(mem)

            assert result.provider == "mem0"
            assert result.total == 2
            assert result.imported == 2
            assert result.failed == 0

            # Verify memories were actually stored
            wm = mem.beam.get_working_stats()
            assert wm["total"] >= 2

    def test_run_dry_run_does_not_write(self, tmp_path):
        """Dry run should not write any memories."""
        with patch.object(Mem0Importer, "extract", return_value=MEM0_FIXTURE):
            from mnemosyne.core.memory import Mnemosyne
            mem = Mnemosyne(session_id="test_mem0", db_path=tmp_path / "test.db")

            importer = Mem0Importer(api_key="test_key")
            result = importer.run(mem, dry_run=True)

            assert result.total == 2
            assert result.imported == 2  # dry-run reports what WOULD import

            # Verify nothing was written
            wm = mem.beam.get_working_stats()
            assert wm["total"] == 0

    def test_run_empty_extract(self, tmp_path):
        """Empty extract should return early with error."""
        with patch.object(Mem0Importer, "extract", return_value=[]):
            from mnemosyne.core.memory import Mnemosyne
            mem = Mnemosyne(session_id="test_mem0", db_path=tmp_path / "test.db")

            importer = Mem0Importer(api_key="test_key")
            result = importer.run(mem)

            assert result.total == 0
            assert result.imported == 0
            assert len(result.errors) >= 1

    def test_run_preserves_identity(self, tmp_path):
        """Verify author_id and channel_id are stored on imported memories."""
        with patch.object(Mem0Importer, "extract", return_value=MEM0_FIXTURE):
            from mnemosyne.core.memory import Mnemosyne
            mem = Mnemosyne(session_id="test_mem0", db_path=tmp_path / "test.db")

            importer = Mem0Importer(api_key="test_key")
            result = importer.run(mem)

            # Query via recall to check identity was stored
            memories = mem.recall("dark mode", top_k=10)
            assert len(memories) >= 1

            # At least one should have author_id
            author_ids = [m.get("author_id") for m in memories if m.get("author_id")]
            assert "mem0_user:abdias" in author_ids


class TestMem0SDKMock:
    """Test the SDK extraction path with mocked extract method."""

    def test_extract_via_sdk_paginates(self):
        """Verify pagination loop works."""
        page1 = {
            "results": [MEM0_FIXTURE[0]],
            "next": "?page=2&page_size=200",
        }
        page2 = {
            "results": [MEM0_FIXTURE[1]],
            "next": None,
        }

        mock_client = MagicMock()
        mock_client.get_all.side_effect = [page1, page2]

        # Patch the actual SDK import inside _extract_via_sdk
        import builtins
        real_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name == "mem0":
                mem0_mod = MagicMock()
                mem0_mod.MemoryClient = MagicMock(return_value=mock_client)
                return mem0_mod
            return real_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=mock_import):
            importer = Mem0Importer(api_key="test_key", user_id="*")
            data = importer._extract_via_sdk()

            assert len(data) == 2
            assert mock_client.get_all.call_count == 2

    def test_extract_via_sdk_with_filters(self):
        """Verify filters are passed to get_all."""
        page = {
            "results": [MEM0_FIXTURE[0]],
            "next": None,
        }

        mock_client = MagicMock()
        mock_client.get_all.return_value = page

        import builtins
        real_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name == "mem0":
                mem0_mod = MagicMock()
                mem0_mod.MemoryClient = MagicMock(return_value=mock_client)
                return mem0_mod
            return real_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=mock_import):
            importer = Mem0Importer(
                api_key="test_key",
                user_id="abdias",
                agent_id="bot-1",
            )
            data = importer._extract_via_sdk()

            assert len(data) == 1
            call_kwargs = mock_client.get_all.call_args[1]
            assert call_kwargs["filters"]["user_id"] == "abdias"
            assert call_kwargs["filters"]["agent_id"] == "bot-1"


class TestConvenienceFunction:
    def test_import_from_mem0(self, tmp_path):
        """The convenience function works."""
        with patch.object(Mem0Importer, "extract", return_value=MEM0_FIXTURE):
            from mnemosyne.core.memory import Mnemosyne
            mem = Mnemosyne(session_id="test_mem0", db_path=tmp_path / "test.db")

            result = import_from_mem0(
                api_key="test_key",
                mnemosyne=mem,
                user_id="abdias",
            )

            assert isinstance(result, ImporterResult)
            assert result.imported >= 1

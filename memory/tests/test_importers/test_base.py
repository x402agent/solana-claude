"""Tests for the BaseImporter and ImporterResult classes."""

import pytest
import json
from pathlib import Path
from mnemosyne.core.importers.base import (
    BaseImporter, ImporterResult, import_from_file
)


class TestImporterResult:
    def test_default_values(self):
        result = ImporterResult(provider="test")
        assert result.provider == "test"
        assert result.total == 0
        assert result.imported == 0
        assert result.skipped == 0
        assert result.failed == 0
        assert result.errors == []
        assert result.memory_ids == []

    def test_to_dict_includes_counts(self):
        result = ImporterResult(
            provider="mem0",
            total=10,
            imported=8,
            failed=2,
            errors=["e1", "e2"],
            memory_ids=["id1", "id2"],
        )
        d = result.to_dict()
        assert d["provider"] == "mem0"
        assert d["total"] == 10
        assert d["imported"] == 8
        assert d["failed"] == 2
        assert "e1" in d["errors"]

    def test_to_dict_caps_errors_and_ids(self):
        result = ImporterResult(
            provider="test",
            total=100,
            imported=100,
            errors=[f"err_{i}" for i in range(30)],
            memory_ids=[f"id_{i}" for i in range(100)],
        )
        d = result.to_dict()
        assert len(d["errors"]) == 20  # capped at 20
        assert len(d["memory_ids"]) == 50  # capped at 50

    def test_to_json_serializable(self):
        result = ImporterResult(provider="test", total=5)
        j = result.to_json()
        parsed = json.loads(j)
        assert parsed["provider"] == "test"


class TestBaseImporter:
    def test_abstract_methods(self):
        """BaseImporter can't be instantiated directly (abstract)."""
        with pytest.raises(TypeError):
            BaseImporter()

    def test_concrete_subclass(self):
        """A minimal concrete subclass works."""

        class TestImporter(BaseImporter):
            provider_name = "test"

            def extract(self):
                return [{"content": "hello"}]

            def transform(self, raw_data):
                return [
                    {
                        "content": item.get("content", ""),
                        "source": "test",
                        "importance": 0.5,
                        "metadata": {},
                        "valid_until": None,
                        "scope": "session",
                    }
                    for item in raw_data
                ]

        importer = TestImporter()
        assert importer.provider_name == "test"

    def test_validate_empty(self):
        class EmptyImporter(BaseImporter):
            provider_name = "empty"

            def extract(self):
                return []

            def transform(self, raw_data):
                return []

        importer = EmptyImporter()
        assert importer.validate([]) is False  # empty should fail

    def test_validate_non_list(self):
        class BadImporter(BaseImporter):
            provider_name = "bad"

            def extract(self):
                return "not a list"

            def transform(self, raw_data):
                return []

        importer = BadImporter()
        assert importer.validate("not a list") is False

    def test_content_hash_deterministic(self):
        h1 = BaseImporter._content_hash("hello")
        h2 = BaseImporter._content_hash("hello")
        assert h1 == h2
        assert len(h1) == 16


class TestImportFromFile:
    def test_import_json_array(self, tmp_path):
        """Import a simple JSON array of memories."""
        data = [
            {"content": "memory one", "importance": 0.8},
            {"content": "memory two", "source": "test"},
        ]
        f = tmp_path / "export.json"
        f.write_text(json.dumps(data))

        from mnemosyne.core.memory import Mnemosyne
        mem = Mnemosyne(session_id="test_import", db_path=tmp_path / "test.db")

        result = import_from_file(str(f), mem)
        assert result.provider == "file"
        assert result.total == 2
        assert result.imported == 2
        assert result.failed == 0

    def test_import_wrapped_response(self, tmp_path):
        """Import Mem0-style wrapped response: {"results": [...]}."""
        data = {"results": [{"memory": "wrapped memory", "user_id": "alice"}]}
        f = tmp_path / "wrapped.json"
        f.write_text(json.dumps(data))

        from mnemosyne.core.memory import Mnemosyne
        mem = Mnemosyne(session_id="test_import", db_path=tmp_path / "test.db")

        result = import_from_file(str(f), mem)
        assert result.total == 1
        assert result.imported == 1

    def test_dry_run(self, tmp_path):
        """Dry run should validate but not write."""
        data = [{"content": "test dry run"}]
        f = tmp_path / "export.json"
        f.write_text(json.dumps(data))

        from mnemosyne.core.memory import Mnemosyne
        mem = Mnemosyne(session_id="test_import", db_path=tmp_path / "test.db")

        result = import_from_file(str(f), mem, dry_run=True)
        assert result.total == 1
        assert result.imported == 1  # dry-run shows what WOULD be imported

        # Verify nothing was actually written
        wm = mem.beam.get_working_stats()
        assert wm["total"] == 0

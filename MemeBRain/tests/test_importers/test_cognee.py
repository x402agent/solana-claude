"""Regression tests for [C12.a.cognee]: CogneeImporter._extract_direct
read rows out of Cognee's SQLite metadata using `conn.row_factory =
sqlite3.Row` and then called `row.get("id", "")` etc. sqlite3.Row does
not support `.get()` — bracket access only — so each row raised
AttributeError. The surrounding `except Exception: pass` swallowed it,
so direct cognee imports silently returned zero rows even when the
data was present.

Same pattern as the latent fact_recall bug surfaced by C12.a; this is
the adjacent occurrence in the importer surface.
"""

import sqlite3

import pytest

from mnemosyne.core.importers.cognee import CogneeImporter


def _make_cognee_db(tmp_path):
    """Build a minimal Cognee-shaped SQLite DB with one data_chunks row."""
    data_dir = tmp_path / "cognee-data"
    data_dir.mkdir()
    db_path = data_dir / "cognee_db"
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute("""
            CREATE TABLE data_chunks (
                id TEXT PRIMARY KEY,
                document_id TEXT,
                text TEXT,
                content TEXT,
                created_at TEXT
            )
        """)
        conn.execute("""
            INSERT INTO data_chunks (id, document_id, text, content, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            "chunk-1",
            "doc-1",
            "Alice was born in Boston.",
            None,
            "2026-05-09T00:00:00",
        ))
        conn.commit()
    finally:
        conn.close()
    return data_dir


class TestCogneeDirectImport:

    def test_extract_direct_returns_rows_from_data_chunks(self, tmp_path):
        """The bug surface: pre-fix, this returned [] silently because
        row.get on sqlite3.Row raised AttributeError and the broad
        except swallowed it."""
        data_dir = _make_cognee_db(tmp_path)
        importer = CogneeImporter(
            data_dir=str(data_dir),
            direct_db=True,
        )
        items = importer._extract_direct()
        assert items, (
            "_extract_direct returned empty despite seeded data_chunks "
            "row — the row.get on sqlite3.Row crash is masked by the "
            "broad except"
        )
        assert len(items) == 1
        item = items[0]
        assert item["content"] == "Alice was born in Boston."
        assert item["source"] == "cognee_direct"
        assert item["metadata"]["chunk_id"] == "chunk-1"
        assert item["metadata"]["document_id"] == "doc-1"
        assert item["timestamp"] == "2026-05-09T00:00:00"

    def test_extract_direct_handles_null_text_falls_back_to_content(self, tmp_path):
        """Existing fallback: row['text'] or row['content'] or ''. Make
        sure it survives the dict conversion."""
        data_dir = tmp_path / "cognee-data"
        data_dir.mkdir()
        db_path = data_dir / "cognee_db"
        conn = sqlite3.connect(str(db_path))
        try:
            conn.execute("""
                CREATE TABLE data_chunks (
                    id TEXT PRIMARY KEY,
                    document_id TEXT,
                    text TEXT,
                    content TEXT,
                    created_at TEXT
                )
            """)
            conn.execute("""
                INSERT INTO data_chunks (id, document_id, text, content, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                "chunk-2",
                "doc-2",
                None,
                "Backup content text",
                "2026-05-09T00:00:01",
            ))
            conn.commit()
        finally:
            conn.close()

        importer = CogneeImporter(
            data_dir=str(data_dir),
            direct_db=True,
        )
        items = importer._extract_direct()
        assert items
        assert items[0]["content"] == "Backup content text"

    def test_extract_direct_returns_empty_when_db_missing(self, tmp_path):
        """Defensive: missing cognee_db should produce [] (not raise),
        which is the existing contract the broad except provides."""
        data_dir = tmp_path / "no-cognee"
        data_dir.mkdir()
        importer = CogneeImporter(
            data_dir=str(data_dir),
            direct_db=True,
        )
        items = importer._extract_direct()
        assert items == []

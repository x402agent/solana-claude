"""Regression tests for [C23]: `mnemosyne stats` printed zeros and N/A
because cli.cmd_stats read flat keys (working_count, episodic_count,
triple_count, db_path) that Mnemosyne.get_stats() never returned.

Tests verify:
1. cmd_stats prints real counts, not zeros, when data exists.
2. cmd_stats prints the actual DB path, not "N/A".
3. get_stats() exposes triples and banks in shapes the CLI expects.
"""

import argparse

import pytest

from mnemosyne.core.memory import Mnemosyne


def _seed(db_path):
    """Populate an isolated DB with one working + one episodic + one triple."""
    from mnemosyne.core.triples import TripleStore
    mem = Mnemosyne(session_id="c23", db_path=db_path)
    wm_id = mem.remember("Working memory item", source="user", importance=0.5)
    mem.beam.consolidate_to_episodic(
        summary="Episodic summary",
        source_wm_ids=[wm_id],
        source="consolidation",
        importance=0.6,
    )
    triples = TripleStore(db_path=db_path)
    triples.add(subject="alice", predicate="likes", object="python", source="test")
    return mem


def _run_cmd_stats(monkeypatch, db_path, capsys):
    """Invoke cmd_stats with cli.DATA_DIR pointing at the isolated DB's parent."""
    from mnemosyne import cli
    monkeypatch.setattr(cli, "DATA_DIR", str(db_path.parent))
    cli.cmd_stats(argparse.Namespace())
    return capsys.readouterr().out


def _line_value(out, prefix):
    """Return the integer value after `<prefix>:` in cmd_stats output.
    Fails the test loudly if the line is missing or non-numeric."""
    for line in out.splitlines():
        if line.strip().startswith(prefix):
            value = line.split(":", 1)[1].strip()
            try:
                return int(value)
            except ValueError:
                pytest.fail(f"{prefix} value not an int: {value!r}")
    pytest.fail(f"{prefix!r} line missing from stats output:\n{out}")


class TestCliStatsRegression:
    def test_stats_prints_working_count_not_zero(self, tmp_path, monkeypatch, capsys):
        db_path = tmp_path / "mnemosyne.db"
        _seed(db_path)
        out = _run_cmd_stats(monkeypatch, db_path, capsys)
        assert _line_value(out, "Working memory") >= 1

    def test_stats_prints_episodic_count(self, tmp_path, monkeypatch, capsys):
        db_path = tmp_path / "mnemosyne.db"
        _seed(db_path)
        out = _run_cmd_stats(monkeypatch, db_path, capsys)
        assert _line_value(out, "Episodic memory") >= 1

    def test_stats_prints_triple_count(self, tmp_path, monkeypatch, capsys):
        db_path = tmp_path / "mnemosyne.db"
        _seed(db_path)
        out = _run_cmd_stats(monkeypatch, db_path, capsys)
        assert _line_value(out, "Knowledge triples") >= 1

    def test_stats_prints_zero_triples_on_fresh_db(self, tmp_path, monkeypatch, capsys):
        """Fresh DB with no triples must still show 'Knowledge triples: 0',
        consistent with how Working / Episodic always render 0."""
        db_path = tmp_path / "mnemosyne.db"
        Mnemosyne(session_id="c23-fresh", db_path=db_path)
        out = _run_cmd_stats(monkeypatch, db_path, capsys)
        assert _line_value(out, "Knowledge triples") == 0

    def test_stats_prints_real_db_path_not_na(self, tmp_path, monkeypatch, capsys):
        db_path = tmp_path / "mnemosyne.db"
        _seed(db_path)
        out = _run_cmd_stats(monkeypatch, db_path, capsys)
        for line in out.splitlines():
            if line.strip().startswith("DB path:"):
                value = line.split(":", 1)[1].strip()
                assert value != "N/A", "DB path printed as 'N/A' instead of real path"
                assert "mnemosyne.db" in value, \
                    f"DB path missing expected db filename: {value!r}"
                return
        pytest.fail("'DB path:' line missing from stats output")


class TestGetStatsShape:
    """Direct tests on get_stats() shape — independent of CLI rendering."""

    def test_get_stats_includes_triples_in_beam(self, tmp_path):
        """get_stats() should expose a triple count, not silently omit it."""
        from mnemosyne.core.triples import TripleStore
        db_path = tmp_path / "mnemosyne.db"
        mem = Mnemosyne(session_id="c23", db_path=db_path)
        triples = TripleStore(db_path=db_path)
        triples.add(subject="a", predicate="b", object="c", source="test")
        triples.add(subject="d", predicate="e", object="f", source="test")
        stats = mem.get_stats()
        # Canonical shape: nested under "beam" matching working_memory/episodic_memory.
        assert "triples" in stats["beam"], \
            "get_stats() must expose triples under stats['beam']"
        assert stats["beam"]["triples"]["total"] >= 2

    def test_get_stats_includes_banks_at_top(self, tmp_path):
        """get_stats() should expose bank list so CLI can render it."""
        db_path = tmp_path / "mnemosyne.db"
        mem = Mnemosyne(session_id="c23", db_path=db_path)
        stats = mem.get_stats()
        assert "banks" in stats, "get_stats() must expose top-level 'banks' list"
        assert isinstance(stats["banks"], list)
        # 'default' is always present per BankManager.list_banks() contract.
        assert "default" in stats["banks"]

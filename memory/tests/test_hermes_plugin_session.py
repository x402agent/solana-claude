"""Regression tests for [C20]: hermes_plugin caches `_triple_store` against
the first session's DB and never invalidates it. After a session change that
moves `_memory_instance` to a different DB (bank switch, custom MNEMOSYNE_DATA_DIR,
etc.), `_get_triples()` keeps returning the OLD store — so triple writes go
to the original DB while memory writes go to the new one.

Bug: hermes_plugin/__init__.py:42-68. `_get_memory()` rebinds `_memory_instance`
on session change, but `_triple_store` is never reset alongside it.

Tests:
1. After _get_memory(b) rebinds memory, _get_triples() returns a store
   aligned with b's db_path, not a's.
2. Triples written via the public `mnemosyne_triple_add` tool after a
   session switch land in the new DB, not the old one.
"""

import json
from pathlib import Path

import pytest

import hermes_plugin
from hermes_plugin import tools
from mnemosyne.core.memory import Mnemosyne
from mnemosyne.core.triples import TripleStore


def _route_mnemosyne(monkeypatch, session_to_db):
    """Patch hermes_plugin.Mnemosyne so each session_id resolves to a fixed db_path.

    Production code can move db_path between sessions via bank switches or
    runtime data-dir changes; this helper simulates that without depending on
    env-var resolution timing.
    """
    real_mnemosyne = hermes_plugin.Mnemosyne

    def fake_mnemosyne(session_id, **kwargs):
        kwargs.pop("db_path", None)
        if session_id in session_to_db:
            return real_mnemosyne(session_id=session_id,
                                  db_path=session_to_db[session_id],
                                  **kwargs)
        return real_mnemosyne(session_id=session_id, **kwargs)

    monkeypatch.setattr(hermes_plugin, "Mnemosyne", fake_mnemosyne)


class TestTripleStoreCacheInvalidation:

    def test_get_triples_follows_active_memory_after_session_switch(
        self, tmp_path, monkeypatch
    ):
        """_get_triples() must return a store aligned with the active
        Mnemosyne instance's db_path, not the first one captured.

        Sets HERMES_SESSION_ID env to mirror each explicit session, the
        way Hermes does in production, so any internal _get_memory() call
        that reads env stays consistent with the caller's intent.
        """
        db_a = tmp_path / "a.db"
        db_b = tmp_path / "b.db"
        _route_mnemosyne(monkeypatch, {"session_a": db_a, "session_b": db_b})

        # First session
        monkeypatch.setenv("HERMES_SESSION_ID", "session_a")
        mem_a = hermes_plugin._get_memory("session_a")
        assert Path(mem_a.db_path) == db_a
        triples_first = hermes_plugin._get_triples()
        assert Path(triples_first.db_path) == db_a

        # Second session — different db
        monkeypatch.setenv("HERMES_SESSION_ID", "session_b")
        mem_b = hermes_plugin._get_memory("session_b")
        assert Path(mem_b.db_path) == db_b

        # Critical: triples must follow the new memory, not stay cached at db_a
        triples_second = hermes_plugin._get_triples()
        assert Path(triples_second.db_path) == db_b, (
            f"Triple store cached at {triples_first.db_path} after session "
            f"switch; expected to follow new memory at {db_b}"
        )

    def test_triple_writes_route_to_new_db_after_session_switch(
        self, tmp_path, monkeypatch
    ):
        """End-to-end: mnemosyne_triple_add after a session switch must
        write to the new session's DB, not silently to the old one."""
        db_a = tmp_path / "a.db"
        db_b = tmp_path / "b.db"
        _route_mnemosyne(monkeypatch, {"session_a": db_a, "session_b": db_b})

        # Session a — write triple_a
        monkeypatch.setenv("HERMES_SESSION_ID", "session_a")
        hermes_plugin._get_memory("session_a")
        result_a = json.loads(tools.mnemosyne_triple_add({
            "subject": "alice",
            "predicate": "knows",
            "object": "bob",
            "source": "test",
        }))
        assert result_a.get("status") == "added", f"unexpected: {result_a}"

        # Session b — write triple_b
        monkeypatch.setenv("HERMES_SESSION_ID", "session_b")
        hermes_plugin._get_memory("session_b")
        result_b = json.loads(tools.mnemosyne_triple_add({
            "subject": "carol",
            "predicate": "owns",
            "object": "project_b",
            "source": "test",
        }))
        assert result_b.get("status") == "added", f"unexpected: {result_b}"

        # Read each DB directly — bypassing the plugin cache entirely.
        triples_in_a = TripleStore(db_path=db_a).query(subject="alice")
        triples_in_b = TripleStore(db_path=db_b).query(subject="carol")

        assert len(triples_in_a) == 1, (
            f"alice/knows/bob should live in db_a but found {len(triples_in_a)} matches"
        )
        assert len(triples_in_b) == 1, (
            f"carol/owns/project_b should live in db_b but found {len(triples_in_b)} matches"
        )

        # Cross-check: data must NOT have leaked across DBs.
        leaked_to_a = TripleStore(db_path=db_a).query(subject="carol")
        leaked_to_b = TripleStore(db_path=db_b).query(subject="alice")
        assert len(leaked_to_a) == 0, (
            f"carol triple leaked into db_a (the bug — cached store)"
        )
        assert len(leaked_to_b) == 0, (
            f"alice triple leaked into db_b"
        )

    def test_get_triples_honors_env_change_without_explicit_memory_call(
        self, tmp_path, monkeypatch
    ):
        """If HERMES_SESSION_ID env changes but no explicit _get_memory(session_id)
        is made before the next triple call, _get_triples() should still route
        to the new session's DB. Locks in env-honoring behavior; pre-review
        revisions of this fix regressed this scenario.
        """
        db_a = tmp_path / "a.db"
        db_b = tmp_path / "b.db"
        _route_mnemosyne(monkeypatch, {"session_a": db_a, "session_b": db_b})

        # Bind memory to session_a
        monkeypatch.setenv("HERMES_SESSION_ID", "session_a")
        hermes_plugin._get_memory("session_a")
        triples_a = hermes_plugin._get_triples()
        assert Path(triples_a.db_path) == db_a

        # Env changes to session_b — no explicit _get_memory call.
        monkeypatch.setenv("HERMES_SESSION_ID", "session_b")

        # Next _get_triples() call should follow env, not stay on session_a.
        triples_b = hermes_plugin._get_triples()
        assert Path(triples_b.db_path) == db_b, (
            f"_get_triples() did not honor env change: still at "
            f"{triples_b.db_path} after env switch to session_b"
        )

"""Regression tests for TripleStore default data-directory handling."""

import os
import subprocess
import sys
import textwrap
from pathlib import Path


def _run_python(script: str, *, home: Path, data_dir: Path) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    env["HOME"] = str(home)
    env["MNEMOSYNE_DATA_DIR"] = str(data_dir)
    env.pop("PYTHONHOME", None)

    return subprocess.run(
        [sys.executable, "-c", textwrap.dedent(script)],
        text=True,
        capture_output=True,
        env=env,
        check=False,
    )


def test_triplestore_default_db_uses_mnemosyne_data_dir(tmp_path):
    """TripleStore() should keep triples.db beside the configured memory DBs."""
    home = tmp_path / "home"
    data_dir = tmp_path / "configured-data"

    result = _run_python(
        """
        from mnemosyne.core.triples import TripleStore

        store = TripleStore()
        print(store.db_path)
        """,
        home=home,
        data_dir=data_dir,
    )

    assert result.returncode == 0, result.stderr
    assert Path(result.stdout.strip()) == data_dir / "triples.db"
    assert (data_dir / "triples.db").exists()
    assert not (home / ".hermes" / "mnemosyne" / "data" / "triples.db").exists()


def test_triplestore_copies_legacy_db_into_mnemosyne_data_dir(tmp_path):
    """Existing misplaced triples should be copied into the configured data dir."""
    home = tmp_path / "home"
    data_dir = tmp_path / "configured-data"
    legacy_db = home / ".hermes" / "mnemosyne" / "data" / "triples.db"

    seed = _run_python(
        """
        from pathlib import Path
        from mnemosyne.core.triples import TripleStore

        legacy_db = Path.home() / ".hermes" / "mnemosyne" / "data" / "triples.db"
        store = TripleStore(db_path=legacy_db)
        store.add(
            "legacy-subject",
            "legacy-predicate",
            "legacy-object",
            valid_from="2026-05-08",
        )
        print(legacy_db)
        """,
        home=home,
        data_dir=data_dir,
    )
    assert seed.returncode == 0, seed.stderr
    assert legacy_db.exists()
    assert not (data_dir / "triples.db").exists()

    result = _run_python(
        """
        from mnemosyne.core.triples import TripleStore

        store = TripleStore()
        print(store.db_path)
        print(store.query(subject="legacy-subject")[0]["object"])
        """,
        home=home,
        data_dir=data_dir,
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.splitlines() == [
        str(data_dir / "triples.db"),
        "legacy-object",
    ]
    assert legacy_db.exists()
    assert (data_dir / "triples.db").exists()

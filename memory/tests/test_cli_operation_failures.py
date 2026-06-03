"""CLI operation-failure regression tests."""

import os
import subprocess
import sys


def run_cli(args, tmp_path):
    env = os.environ.copy()
    env["HOME"] = str(tmp_path / "home")
    env["MNEMOSYNE_DATA_DIR"] = str(tmp_path / "mnemosyne-data")
    return subprocess.run(
        [sys.executable, "-m", "mnemosyne.cli", *args],
        text=True,
        capture_output=True,
        env=env,
        check=False,
    )


def test_update_delete_missing_memory_report_operation_failure(tmp_path):
    for args in (["update", "missing-id", "new content"], ["delete", "missing-id"]):
        result = run_cli(args, tmp_path)

        assert result.returncode == 1, args
        assert result.stdout == ""
        assert "Memory not found: missing-id" in result.stderr
        assert "Traceback" not in result.stderr

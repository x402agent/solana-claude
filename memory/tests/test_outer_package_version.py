"""[issue #53] Regression test for `hermes mnemosyne version` ImportError.

The repo has a nested-package layout:
    mnemosyne/                  ← outer: repo root + Hermes plugin entry stub
        __init__.py             ← used to NOT define __version__/__author__
        mnemosyne/              ← inner: actual library
            __init__.py         ← defines __version__ / __author__

When Hermes installs the plugin via repo-tree symlink, the OUTER package
becomes the resolved `mnemosyne` module on `sys.path`. Pre-fix,
`from mnemosyne import __version__, __author__` raised ImportError because
the outer stub didn't re-export those names. Post-fix, the outer stub
re-exports from `.mnemosyne` (the inner subpackage).

This test simulates the Hermes plugin-loader sys.path layout via subprocess
so it doesn't pollute the test process's already-loaded `mnemosyne` module
(pytest runs from the repo with the inner package directly on path, which
bypasses the failure mode).
"""

from __future__ import annotations

import subprocess
import sys
import textwrap
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def test_outer_package_reexports_version_and_author():
    """Simulate Hermes plugin-loader layout: parent of repo root on sys.path,
    so `import mnemosyne` resolves to the OUTER stub package. The outer must
    re-export __version__ and __author__ from the inner subpackage."""
    # Run a subprocess with sys.path manipulated so the outer mnemosyne stub
    # is the resolved `mnemosyne` module — exactly the layout Hermes' plugin
    # loader produces when symlinking the repo root into ~/.hermes/plugins.
    script = textwrap.dedent(f"""
        import sys
        # Put the parent of the repo first so `mnemosyne` resolves to the
        # outer __init__.py at the repo root, mirroring the plugin layout.
        sys.path.insert(0, {str(REPO_ROOT.parent)!r})
        # Drop the inner-package path (if present) so we don't accidentally
        # resolve to the inner __init__.py instead.
        sys.path = [p for p in sys.path if p != {str(REPO_ROOT)!r}]

        import mnemosyne
        # Sanity check: we loaded the OUTER stub, not the inner library.
        assert mnemosyne.__file__.endswith({str(REPO_ROOT / "__init__.py")!r}), (
            "test setup failed: did not load outer package, got " + mnemosyne.__file__
        )

        # The actual contract:
        from mnemosyne import __version__, __author__
        print("VERSION=" + __version__)
        print("AUTHOR=" + __author__)
    """)

    result = subprocess.run(
        [sys.executable, "-c", script],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT.parent),  # avoid CWD on path leaking inner package
    )

    assert result.returncode == 0, (
        f"subprocess failed:\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
    )
    assert "VERSION=" in result.stdout, result.stdout
    assert "AUTHOR=" in result.stdout, result.stdout

    # Don't pin a specific version (it bumps); just assert non-empty and not
    # the fallback "unknown" that the except-branch would emit if the inner
    # subpackage somehow couldn't be imported.
    version_line = next(
        ln for ln in result.stdout.splitlines() if ln.startswith("VERSION=")
    )
    version = version_line.split("=", 1)[1].strip()
    assert version and version != "unknown", (
        f"outer __init__.py exported VERSION={version!r}; expected a real "
        f"version string from the inner subpackage. Likely cause: the "
        f"`from .mnemosyne import __version__` re-export failed and we "
        f"fell through to the except-branch fallback."
    )

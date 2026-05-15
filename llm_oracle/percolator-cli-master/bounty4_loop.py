#!/usr/bin/env python3
"""
Percolator Bounty4 — persistent keeper loop.

Runs `npx tsx scripts/mainnet-bounty4-tick.ts` in a tight loop until
`INSURANCE_DROP` appears in the JSONL log. Never gives up.

Usage:
    python3 bounty4_loop.py [--rpc <url>] [--keypair <path>]
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# ── paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent.resolve()
LOG_FILE   = Path.home() / ".cache" / "percolator" / "bounty4-tick.log"
GOAL_DIR   = Path.home() / ".openclawd" / "goals"

# ── tunables ───────────────────────────────────────────────────────────────────
TICK_TIMEOUT_S  = 65        # 48s inner loop + npm/tsx startup headroom
BETWEEN_TICKS_S = 5         # pause between successful ticks
ERROR_BACKOFF_S = 15        # pause after subprocess error
WIN_FLAGS       = {"INSURANCE_DROP", "CONSERVATION_BROKEN", "ACCOUNTING_BROKEN"}


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def log(msg: str) -> None:
    print(f"[{now()}] {msg}", flush=True)


def tail_log(last_pos: int) -> tuple[list[dict], int]:
    """Read new lines from the JSONL log since last_pos. Returns (new_entries, new_pos)."""
    if not LOG_FILE.exists():
        return [], last_pos
    try:
        with LOG_FILE.open("r") as f:
            f.seek(last_pos)
            lines = f.readlines()
            new_pos = f.tell()
        entries = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                pass
        return entries, new_pos
    except OSError:
        return [], last_pos


def check_for_win(entries: list[dict]) -> dict | None:
    """Return the first entry containing a WIN_FLAG, or None."""
    for entry in entries:
        flags = set(entry.get("flags", []))
        hit = flags & WIN_FLAGS
        if hit:
            return entry
    return None


def format_insurance(entry: dict) -> str:
    # logged as entry.state.insurance (lamports as string)
    ins = (entry.get("state") or {}).get("insurance")
    if ins is None:
        return "n/a"
    try:
        lamports = int(ins)
        return f"{lamports / 1e9:.6f} SOL"
    except (TypeError, ValueError):
        return str(ins)


def register_goal() -> None:
    """Copy the repo goal doc into ~/.openclawd/goals/ for Leviathan pickup."""
    src = SCRIPT_DIR.parent.parent / "openclawd-framework" / "goals" / "percolator-bounty.md"
    if not src.exists():
        log(f"Goal source not found at {src}, skipping registration.")
        return
    GOAL_DIR.mkdir(parents=True, exist_ok=True)
    dst = GOAL_DIR / "percolator-bounty.md"
    dst.write_bytes(src.read_bytes())
    log(f"Goal registered → {dst}")


def build_env(rpc_url: str | None, keypair: str | None) -> dict:
    env = os.environ.copy()
    # PERCOLATOR_DIR avoids the import.meta.url %20-encoding bug when
    # the path contains spaces and tsx derives cwd from the file URL.
    env["PERCOLATOR_DIR"] = str(SCRIPT_DIR)
    if rpc_url:
        env["SOLANA_RPC_URL"] = rpc_url
    if keypair:
        env["SOLANA_KEYPAIR"] = keypair
    return env


def run_tick(env: dict) -> tuple[int, str]:
    """Run one tick. Returns (returncode, stderr_tail)."""
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    try:
        result = subprocess.run(
            ["npx", "tsx", "scripts/mainnet-bounty4-tick.ts"],
            cwd=str(SCRIPT_DIR),
            env=env,
            capture_output=True,
            text=True,
            timeout=TICK_TIMEOUT_S,
        )
        stderr = result.stderr.strip()
        if result.returncode != 0:
            tail = "\n".join(stderr.splitlines()[-6:]) if stderr else "(no stderr)"
            return result.returncode, tail
        return 0, ""
    except subprocess.TimeoutExpired:
        return -1, f"subprocess timed out after {TICK_TIMEOUT_S}s"
    except FileNotFoundError as e:
        return -2, f"command not found: {e}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Percolator bounty4 persistent keeper loop")
    parser.add_argument("--rpc",      help="Solana RPC URL (overrides env / ~/.helius)")
    parser.add_argument("--keypair",  help="Path to keypair JSON (overrides SOLANA_KEYPAIR env)")
    parser.add_argument("--no-goal",  action="store_true", help="Skip Leviathan goal registration")
    args = parser.parse_args()

    env = build_env(args.rpc, args.keypair)

    print()
    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  PERCOLATOR BOUNTY4 — persistent keeper loop                    ║")
    print("║  Win condition: INSURANCE_DROP in tick log                      ║")
    print("║  Press Ctrl-C once to stop gracefully.                          ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    print()

    if not args.no_goal:
        register_goal()

    log_pos       = LOG_FILE.stat().st_size if LOG_FILE.exists() else 0
    tick_count    = 0
    error_count   = 0
    last_insurance: str | None = None

    log(f"Starting loop. Log file: {LOG_FILE}")
    log(f"Working directory: {SCRIPT_DIR}")
    log("Tick 0 starting…")

    try:
        while True:
            tick_start = time.monotonic()
            tick_count += 1

            rc, err = run_tick(env)

            # read new log entries written during this tick
            new_entries, log_pos = tail_log(log_pos)

            # display insurance fund trend
            for entry in new_entries:
                ins = format_insurance(entry)
                if ins != last_insurance:
                    last_insurance = ins
                    log(f"  insurance fund: {ins}")
                flags = entry.get("flags", [])
                if flags:
                    log(f"  flags: {flags}")

            # check win condition
            winner = check_for_win(new_entries)
            if winner:
                print()
                print("█" * 68)
                print("  🎯  BOUNTY WIN DETECTED")
                print(f"  flag  : {list(set(winner.get('flags', [])) & WIN_FLAGS)}")
                print(f"  slot  : {winner.get('slot', 'unknown')}")
                print(f"  insur : {format_insurance(winner)}")
                print(f"  ticks : {tick_count}")
                print("█" * 68)
                print()
                sys.exit(0)

            elapsed = time.monotonic() - tick_start

            if rc != 0:
                error_count += 1
                log(f"Tick {tick_count} FAILED (rc={rc}, errors={error_count}): {err}")
                log(f"  backing off {ERROR_BACKOFF_S}s…")
                time.sleep(ERROR_BACKOFF_S)
            else:
                log(f"Tick {tick_count} ok ({elapsed:.1f}s). Next in {BETWEEN_TICKS_S}s…")
                time.sleep(BETWEEN_TICKS_S)

    except KeyboardInterrupt:
        print()
        log(f"Interrupted after {tick_count} ticks ({error_count} errors). Bounty not yet won.")
        sys.exit(1)


if __name__ == "__main__":
    main()

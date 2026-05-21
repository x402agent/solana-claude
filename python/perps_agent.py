#!/usr/bin/env python3
"""Solana CLAWD Perps Agent.

Official Python wrapper for Phoenix perpetuals through Vulcan/Rise SDK.

The agent deliberately delegates exchange interaction to the local `vulcan`
binary so Python code does not reimplement signing, lot conversion, strategy
ledgers, or MCP safety gates. Paper and read-only commands are available by
default. Live actions require an explicit `--yes` flag and still pass through
Vulcan's own confirmation/preflight checks.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]
VULCAN_ROOT = REPO_ROOT / "vulcan-cli-master"
VULCAN_SKILLS_ROOT = VULCAN_ROOT / "skills"
VULCAN_CONTEXT = VULCAN_ROOT / "CONTEXT.md"
VULCAN_TOOL_CATALOG = VULCAN_ROOT / "agents" / "tool-catalog.json"
VULCAN_ERROR_CATALOG = VULCAN_ROOT / "agents" / "error-catalog.json"

SKILL_NAMES = [
    "vulcan",
    "vulcan-error-recovery",
    "vulcan-execution-modes",
    "vulcan-grid-trading",
    "vulcan-lot-size-calculator",
    "vulcan-margin-operations",
    "vulcan-market-intel",
    "vulcan-onboarding",
    "vulcan-portfolio-intel",
    "vulcan-position-management",
    "vulcan-quickstart",
    "vulcan-risk-management",
    "vulcan-ta-strategy",
    "vulcan-technical-analysis",
    "vulcan-tpsl-management",
    "vulcan-trade-execution",
    "vulcan-twap-execution",
]


@dataclass(frozen=True)
class VulcanSkill:
    name: str
    path: Path
    summary: str


class PerpsAgentError(RuntimeError):
    """Raised for expected agent/runtime failures."""


class SolanaClawdPerpsAgent:
    """Paper-first Phoenix perps agent for Solana CLAWD."""

    def __init__(self, vulcan_bin: str | None = None, cwd: Path | None = None) -> None:
        self.vulcan_bin = vulcan_bin or self._resolve_vulcan()
        self.cwd = cwd or REPO_ROOT
        self.skills = self.load_skills()

    @staticmethod
    def _resolve_vulcan() -> str:
        local = VULCAN_ROOT / "target" / "debug" / "vulcan"
        if local.exists():
            return str(local)
        found = shutil.which("vulcan")
        if found:
            return found
        home_local = Path.home() / ".local" / "bin" / "vulcan"
        if home_local.exists():
            return str(home_local)
        raise PerpsAgentError(
            "Vulcan CLI not found. Install it with: "
            "curl -fsSL https://github.com/Ellipsis-Labs/vulcan-cli/releases/latest/download/install.sh | sh"
        )

    def load_skills(self) -> list[VulcanSkill]:
        skills: list[VulcanSkill] = []
        for name in SKILL_NAMES:
            path = VULCAN_SKILLS_ROOT / name / "SKILL.md"
            if not path.exists():
                raise PerpsAgentError(f"Missing Vulcan skill: {path}")
            skills.append(VulcanSkill(name=name, path=path, summary=self._first_heading(path)))
        return skills

    def context_summary(self) -> dict[str, Any]:
        return {
            "agent": "solana-clawd-perps-agent",
            "vulcan_bin": self.vulcan_bin,
            "vulcan_context": str(VULCAN_CONTEXT),
            "skills_root": str(VULCAN_SKILLS_ROOT),
            "skills": [skill.__dict__ | {"path": str(skill.path)} for skill in self.skills],
            "tool_catalog": str(VULCAN_TOOL_CATALOG),
            "error_catalog": str(VULCAN_ERROR_CATALOG),
            "safety": {
                "default_mode": "paper",
                "live_requires_yes": True,
                "never_reads_private_keys": True,
                "preflight_before_live_strategy": True,
            },
        }

    def health(self) -> dict[str, Any]:
        return self.vulcan(["agent", "health"], output="json").json_data

    def preflight(self) -> dict[str, Any]:
        return self.vulcan(["strategy", "preflight"], output="json").json_data

    def market(self, symbol: str = "SOL") -> dict[str, Any]:
        symbol = normalize_symbol(symbol)
        ticker = self.vulcan(["market", "ticker", symbol], output="json").json_data
        orderbook = self.vulcan(["market", "orderbook", symbol, "--depth", "5"], output="json").json_data
        ta = self.vulcan(["ta", "report", symbol, "--timeframe", "1h"], output="json").json_data
        return {"symbol": symbol, "ticker": ticker, "orderbook": orderbook, "ta": ta}

    def portfolio(self) -> dict[str, Any]:
        return self.vulcan(["portfolio"], output="json").json_data

    def paper_init(self, balance: float = 10_000.0) -> dict[str, Any]:
        return self.vulcan(["paper", "init", "--balance", str(balance)], output="json").json_data

    def paper_order(self, side: str, symbol: str, notional_usdc: float, order_type: str = "market") -> dict[str, Any]:
        side = normalize_side(side)
        command = "buy" if side == "buy" else "sell"
        return self.vulcan(
            ["paper", command, normalize_symbol(symbol), "--notional-usdc", str(notional_usdc), "--type", order_type],
            output="json",
        ).json_data

    def live_market_order(self, side: str, symbol: str, notional_usdc: float, approved: bool) -> dict[str, Any]:
        if not approved:
            raise PerpsAgentError("Live order refused: pass --yes after explicit operator approval.")
        side = normalize_side(side)
        command = "market-buy" if side == "buy" else "market-sell"
        return self.vulcan(
            ["trade", command, normalize_symbol(symbol), "--notional-usdc", str(notional_usdc), "--yes"],
            output="json",
        ).json_data

    def twap(
        self,
        symbol: str,
        side: str,
        notional_usdc: float | None,
        tokens: float | None,
        slices: int,
        interval_seconds: int,
        mode: str = "paper",
        margin_mode: str = "cross",
        isolated_collateral: float | None = None,
        run_label: str | None = None,
        detached: bool = False,
        guardrails: dict[str, float | int | None] | None = None,
        approved: bool = False,
    ) -> dict[str, Any]:
        mode = normalize_mode(mode)
        if notional_usdc is None and tokens is None:
            raise PerpsAgentError("TWAP requires --notional-usdc or --tokens.")
        if notional_usdc is not None and tokens is not None:
            raise PerpsAgentError("TWAP accepts either --notional-usdc or --tokens, not both.")
        args = [
            "strategy",
            "twap",
            "start",
            "--symbol",
            normalize_symbol(symbol),
            "--side",
            normalize_side(side),
            "--slices",
            str(slices),
            "--interval-seconds",
            str(interval_seconds),
            "--mode",
            mode,
            "--margin-mode",
            normalize_margin_mode(margin_mode),
        ]
        if notional_usdc is not None:
            args.extend(["--notional-usdc", str(notional_usdc)])
        if tokens is not None:
            args.extend(["--tokens", str(tokens)])
        append_optional(args, "--isolated-collateral", isolated_collateral)
        append_optional(args, "--run-label", run_label)
        append_guardrails(args, guardrails)
        if detached:
            args.append("--detached")
        if mode in LIVE_MODES:
            if not approved:
                raise PerpsAgentError(f"Live TWAP mode '{mode}' refused: pass --yes after explicit operator approval.")
            args.append("--yes")
        return self.vulcan(args, output="json").json_data

    def grid(
        self,
        symbol: str,
        levels_per_side: int,
        lower_price: float | None = None,
        upper_price: float | None = None,
        center_on_mark: bool = False,
        width_pct: float | None = None,
        tokens_per_level: float | None = None,
        size_lots_per_level: int | None = None,
        bid_levels: list[str] | None = None,
        ask_levels: list[str] | None = None,
        take_profit_spacing: float | None = None,
        stop_loss_spacing: float | None = None,
        interval_seconds: int = 60,
        ticks: int = 60,
        run_until_stopped: bool = False,
        stale_after_seconds: int | None = None,
        mode: str = "paper",
        margin_mode: str = "cross",
        isolated_collateral: float | None = None,
        run_label: str | None = None,
        slide: bool = False,
        detached: bool = False,
        guardrails: dict[str, float | int | None] | None = None,
        approved: bool = False,
    ) -> dict[str, Any]:
        mode = normalize_mode(mode)
        if center_on_mark and width_pct is None:
            raise PerpsAgentError("Grid --center-on-mark requires --width-pct.")
        if not center_on_mark and (lower_price is None or upper_price is None):
            raise PerpsAgentError("Grid requires --lower-price and --upper-price unless --center-on-mark is set.")
        if tokens_per_level is None and size_lots_per_level is None and not (bid_levels or ask_levels):
            raise PerpsAgentError("Grid requires --tokens-per-level, --size-lots-per-level, or custom levels.")
        if tokens_per_level is not None and size_lots_per_level is not None:
            raise PerpsAgentError("Grid accepts either --tokens-per-level or --size-lots-per-level, not both.")

        args = [
            "strategy",
            "grid",
            "start",
            "--symbol",
            normalize_symbol(symbol),
            "--levels-per-side",
            str(levels_per_side),
            "--interval-seconds",
            str(interval_seconds),
            "--ticks",
            str(ticks),
            "--mode",
            mode,
            "--margin-mode",
            normalize_margin_mode(margin_mode),
        ]
        append_optional(args, "--lower-price", lower_price)
        append_optional(args, "--upper-price", upper_price)
        append_optional(args, "--width-pct", width_pct)
        append_optional(args, "--tokens-per-level", tokens_per_level)
        append_optional(args, "--size-lots-per-level", size_lots_per_level)
        append_repeatable(args, "--bid-level", bid_levels)
        append_repeatable(args, "--ask-level", ask_levels)
        append_optional(args, "--take-profit-spacing", take_profit_spacing)
        append_optional(args, "--stop-loss-spacing", stop_loss_spacing)
        append_optional(args, "--stale-after-seconds", stale_after_seconds)
        append_optional(args, "--isolated-collateral", isolated_collateral)
        append_optional(args, "--run-label", run_label)
        append_guardrails(args, guardrails)
        for enabled, flag in [
            (center_on_mark, "--center-on-mark"),
            (run_until_stopped, "--run-until-stopped"),
            (slide, "--slide"),
            (detached, "--detached"),
        ]:
            if enabled:
                args.append(flag)
        if mode in LIVE_MODES:
            if not approved:
                raise PerpsAgentError(f"Live grid mode '{mode}' refused: pass --yes after explicit operator approval.")
            args.append("--yes")
        return self.vulcan(args, output="json").json_data

    def ta(
        self,
        config_file: str | None,
        config_json: str | None,
        mode: str = "paper",
        max_ticks: int = 60,
        run_until_stopped: bool = False,
        run_label: str | None = None,
        detached: bool = False,
        guardrails: dict[str, float | int | None] | None = None,
        approved: bool = False,
    ) -> dict[str, Any]:
        mode = normalize_mode(mode)
        if bool(config_file) == bool(config_json):
            raise PerpsAgentError("TA requires exactly one of --config-file or --config-json.")
        args = ["strategy", "ta", "start", "--mode", mode, "--max-ticks", str(max_ticks)]
        append_optional(args, "--config-file", config_file)
        append_optional(args, "--config-json", config_json)
        append_optional(args, "--run-label", run_label)
        append_guardrails(args, guardrails)
        if run_until_stopped:
            args.append("--run-until-stopped")
        if detached:
            args.append("--detached")
        if mode in LIVE_MODES:
            if not approved:
                raise PerpsAgentError(f"Live TA mode '{mode}' refused: pass --yes after explicit operator approval.")
            args.append("--yes")
        return self.vulcan(args, output="json").json_data

    def runs(self, limit: int = 20) -> dict[str, Any]:
        return self.vulcan(["strategy", "runs", "--limit", str(limit)], output="json").json_data

    def status(self, run_id: str, since_tick: int | None = None, include_ledger: bool = False) -> dict[str, Any]:
        args = ["strategy", "status", run_id]
        append_optional(args, "--since-tick", since_tick)
        if include_ledger:
            args.append("--include-ledger")
        return self.vulcan(args, output="json").json_data

    def monitor(self, run_id: str, include_ledger: bool = False) -> dict[str, Any]:
        args = ["strategy", "monitor", run_id]
        if include_ledger:
            args.append("--include-ledger")
        return self.vulcan(args, output="json").json_data

    def wait_next_tick(
        self,
        run_id: str,
        after_tick: int | None = None,
        timeout_seconds: int = 90,
        include_ledger: bool = False,
    ) -> dict[str, Any]:
        args = ["strategy", "wait-next-tick", run_id, "--timeout-seconds", str(timeout_seconds)]
        append_optional(args, "--after-tick", after_tick)
        if include_ledger:
            args.append("--include-ledger")
        return self.vulcan(args, output="json").json_data

    def report(self, run_id: str) -> dict[str, Any]:
        return self.vulcan(["strategy", "report", run_id], output="json").json_data

    def reconcile_grid(self, run_id: str) -> dict[str, Any]:
        return self.vulcan(["strategy", "reconcile-grid", run_id], output="json").json_data

    def control(self, action: str, run_id: str, reason: str | None = None) -> dict[str, Any]:
        if action not in {"pause", "stop"}:
            raise PerpsAgentError("control action must be pause or stop")
        args = ["strategy", action, run_id]
        append_optional(args, "--reason", reason)
        return self.vulcan(args, output="json").json_data

    def resume(self, run_id: str, from_step: int | None = None, strategy_type: str | None = None) -> dict[str, Any]:
        args = ["strategy"]
        if strategy_type in {"twap", "grid", "ta"}:
            args.append(strategy_type)
        elif strategy_type:
            raise PerpsAgentError("strategy type must be twap, grid, ta, or omitted")
        args.extend(["resume", run_id])
        append_optional(args, "--from-step", from_step)
        return self.vulcan(args, output="json").json_data

    def finalize(
        self,
        run_id: str,
        reason: str | None = None,
        cancel_orders: bool = False,
        close_position: bool = False,
        wait: bool = False,
        timeout_seconds: int = 90,
        approved: bool = False,
    ) -> dict[str, Any]:
        args = ["strategy", "finalize", run_id]
        append_optional(args, "--reason", reason)
        if cancel_orders:
            args.append("--cancel-orders")
        if close_position:
            args.append("--close-position")
        if wait:
            args.append("--wait")
        args.extend(["--timeout-seconds", str(timeout_seconds)])
        if cancel_orders or close_position:
            if not approved:
                raise PerpsAgentError("Finalize cleanup refused: pass --yes after explicit operator approval.")
            args.append("--yes")
        return self.vulcan(args, output="json").json_data

    def vulcan(self, args: list[str], output: str = "json") -> "VulcanRun":
        final_args = [self.vulcan_bin, *args]
        if output and "-o" not in args and "--output" not in args:
            final_args.extend(["-o", output])
        proc = subprocess.run(
            final_args,
            cwd=self.cwd,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            env=self._safe_env(),
        )
        return VulcanRun.from_process(final_args, proc)

    @staticmethod
    def _safe_env() -> dict[str, str]:
        env = os.environ.copy()
        # Do not synthesize or read wallet passwords. If already exported by
        # the operator, Vulcan may use it; the agent never prints env values.
        return env

    @staticmethod
    def _first_heading(path: Path) -> str:
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if stripped.startswith("#"):
                return stripped.lstrip("#").strip()
        return path.parent.name


@dataclass(frozen=True)
class VulcanRun:
    args: list[str]
    returncode: int
    stdout: str
    stderr: str
    json_data: dict[str, Any]

    @classmethod
    def from_process(cls, args: list[str], proc: subprocess.CompletedProcess[str]) -> "VulcanRun":
        data: dict[str, Any]
        if proc.stdout.strip():
            try:
                parsed = json.loads(proc.stdout)
                data = parsed if isinstance(parsed, dict) else {"ok": True, "data": parsed}
            except json.JSONDecodeError:
                data = {"ok": proc.returncode == 0, "text": proc.stdout}
        else:
            data = {"ok": proc.returncode == 0}

        if proc.returncode != 0:
            message = data.get("error", {}).get("message") if isinstance(data.get("error"), dict) else None
            raise PerpsAgentError(message or proc.stderr.strip() or f"Vulcan command failed: {' '.join(args)}")
        return cls(args=args, returncode=proc.returncode, stdout=proc.stdout, stderr=proc.stderr, json_data=data)


def normalize_symbol(symbol: str) -> str:
    return (symbol or "SOL").replace("-PERP", "").upper()


def normalize_side(side: str) -> str:
    lowered = (side or "").lower()
    if lowered in {"buy", "long"}:
        return "buy"
    if lowered in {"sell", "short"}:
        return "sell"
    raise PerpsAgentError("side must be buy/long or sell/short")


def normalize_mode(mode: str) -> str:
    normalized = (mode or "paper").replace("_", "-").lower()
    allowed = {"paper", "dry-run", "confirm-each", "auto-execute"}
    if normalized not in allowed:
        raise PerpsAgentError(f"mode must be one of {sorted(allowed)}")
    return normalized


def normalize_margin_mode(mode: str) -> str:
    normalized = (mode or "cross").replace("_", "-").lower()
    allowed = {"cross", "isolated"}
    if normalized not in allowed:
        raise PerpsAgentError(f"margin mode must be one of {sorted(allowed)}")
    return normalized


LIVE_MODES = {"confirm-each", "auto-execute"}


def append_optional(args: list[str], flag: str, value: Any | None) -> None:
    if value is not None:
        args.extend([flag, str(value)])


def append_repeatable(args: list[str], flag: str, values: list[str] | None) -> None:
    for value in values or []:
        args.extend([flag, value])


def append_guardrails(args: list[str], guardrails: dict[str, float | int | None] | None) -> None:
    for key, flag in [
        ("max_total_notional_usdc", "--max-total-notional-usdc"),
        ("max_step_notional_usdc", "--max-step-notional-usdc"),
        ("max_price_drift_bps", "--max-price-drift-bps"),
        ("max_exposure_ratio", "--max-exposure-ratio"),
        ("reconcile_attempts", "--reconcile-attempts"),
        ("reconcile_delay_ms", "--reconcile-delay-ms"),
    ]:
        append_optional(args, flag, (guardrails or {}).get(key))


def print_json(data: Any) -> None:
    print(json.dumps(data, indent=2, sort_keys=False))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Official Solana CLAWD perps agent for Phoenix via Vulcan/Rise SDK",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("context", help="Show loaded Vulcan context, skills, catalogs, and safety contract")
    sub.add_parser("health", help="Run Vulcan agent health")
    sub.add_parser("preflight", help="Run live strategy preflight")

    market = sub.add_parser("market", help="Read live ticker, orderbook, and TA report")
    market.add_argument("symbol", nargs="?", default="SOL")

    sub.add_parser("portfolio", help="Read portfolio, margin, positions, and orders")

    paper_init = sub.add_parser("paper-init", help="Initialize paper account")
    paper_init.add_argument("--balance", type=float, default=10_000.0)

    paper = sub.add_parser("paper-order", help="Place a paper order")
    paper.add_argument("side", choices=["buy", "sell", "long", "short"])
    paper.add_argument("symbol")
    paper.add_argument("--notional-usdc", type=float, required=True)
    paper.add_argument("--type", default="market", choices=["market", "limit"])

    live = sub.add_parser("live-market-order", help="Place a live market order after explicit approval")
    live.add_argument("side", choices=["buy", "sell", "long", "short"])
    live.add_argument("symbol")
    live.add_argument("--notional-usdc", type=float, required=True)
    live.add_argument("--yes", action="store_true", help="Required after explicit operator approval")

    twap = sub.add_parser("twap", help="Start a TWAP strategy, paper by default")
    twap.add_argument("symbol")
    twap.add_argument("--side", choices=["buy", "sell", "long", "short"], required=True)
    twap_size = twap.add_mutually_exclusive_group(required=True)
    twap_size.add_argument("--notional-usdc", type=float)
    twap_size.add_argument("--tokens", type=float)
    twap.add_argument("--slices", type=int, default=5)
    twap.add_argument("--interval-seconds", type=int, default=30)
    add_strategy_common_args(twap)
    twap.add_argument("--margin-mode", default="cross", choices=["cross", "isolated"])
    twap.add_argument("--isolated-collateral", type=float)
    twap.add_argument("--yes", action="store_true", help="Required for live modes")

    grid = sub.add_parser("grid", help="Start a grid strategy, paper by default")
    grid.add_argument("symbol")
    grid.add_argument("--lower-price", type=float)
    grid.add_argument("--upper-price", type=float)
    grid.add_argument("--center-on-mark", action="store_true")
    grid.add_argument("--width-pct", type=float)
    grid.add_argument("--levels-per-side", type=int, required=True)
    grid_size = grid.add_mutually_exclusive_group()
    grid_size.add_argument("--tokens-per-level", type=float)
    grid_size.add_argument("--size-lots-per-level", type=int)
    grid.add_argument("--bid-level", action="append", dest="bid_levels")
    grid.add_argument("--ask-level", action="append", dest="ask_levels")
    grid.add_argument("--take-profit-spacing", type=float)
    grid.add_argument("--stop-loss-spacing", type=float)
    grid.add_argument("--interval-seconds", type=int, default=60)
    grid.add_argument("--ticks", type=int, default=60)
    grid.add_argument("--run-until-stopped", action="store_true")
    grid.add_argument("--stale-after-seconds", type=int)
    add_strategy_common_args(grid)
    grid.add_argument("--margin-mode", default="cross", choices=["cross", "isolated"])
    grid.add_argument("--isolated-collateral", type=float)
    grid.add_argument("--slide", action="store_true")
    grid.add_argument("--yes", action="store_true", help="Required for live modes")

    ta = sub.add_parser("ta", help="Start a TA strategy from JSON config, paper by default")
    ta_config = ta.add_mutually_exclusive_group(required=True)
    ta_config.add_argument("--config-file")
    ta_config.add_argument("--config-json")
    ta.add_argument("--max-ticks", type=int, default=60)
    ta.add_argument("--run-until-stopped", action="store_true")
    add_strategy_common_args(ta)
    ta.add_argument("--yes", action="store_true", help="Required for live modes")

    runs = sub.add_parser("runs", help="List persisted strategy runs")
    runs.add_argument("--limit", type=int, default=20)

    status = sub.add_parser("status", help="Show latest strategy status")
    status.add_argument("run_id")
    status.add_argument("--since-tick", type=int)
    status.add_argument("--include-ledger", action="store_true")

    monitor = sub.add_parser("monitor", help="Monitor a strategy run")
    monitor.add_argument("run_id")
    monitor.add_argument("--include-ledger", action="store_true")

    wait = sub.add_parser("wait-next-tick", help="Wait for a new strategy tick")
    wait.add_argument("run_id")
    wait.add_argument("--after-tick", type=int)
    wait.add_argument("--timeout-seconds", type=int, default=90)
    wait.add_argument("--include-ledger", action="store_true")

    report = sub.add_parser("report", help="Show final or latest strategy report")
    report.add_argument("run_id")

    reconcile = sub.add_parser("reconcile-grid", help="Inspect live grid orders against the persisted ledger")
    reconcile.add_argument("run_id")

    pause = sub.add_parser("pause", help="Request a strategy pause")
    pause.add_argument("run_id")
    pause.add_argument("--reason")

    stop = sub.add_parser("stop", help="Request a strategy stop")
    stop.add_argument("run_id")
    stop.add_argument("--reason")

    resume = sub.add_parser("resume", help="Resume a paused/incomplete strategy run")
    resume.add_argument("run_id")
    resume.add_argument("--from-step", type=int)
    resume.add_argument("--strategy-type", choices=["twap", "grid", "ta"])

    finalize = sub.add_parser("finalize", help="Finalize a strategy run")
    finalize.add_argument("run_id")
    finalize.add_argument("--reason")
    finalize.add_argument("--cancel-orders", action="store_true")
    finalize.add_argument("--close-position", action="store_true")
    finalize.add_argument("--wait", action="store_true")
    finalize.add_argument("--timeout-seconds", type=int, default=90)
    finalize.add_argument("--yes", action="store_true", help="Required for cleanup actions")

    return parser


def add_strategy_common_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--mode", default="paper", choices=["paper", "dry-run", "dry_run", "confirm-each", "confirm_each", "auto-execute", "auto_execute"])
    parser.add_argument("--run-label")
    parser.add_argument("--detached", action="store_true")
    parser.add_argument("--max-total-notional-usdc", type=float)
    parser.add_argument("--max-step-notional-usdc", type=float)
    parser.add_argument("--max-price-drift-bps", type=float)
    parser.add_argument("--max-exposure-ratio", type=float)
    parser.add_argument("--reconcile-attempts", type=int)
    parser.add_argument("--reconcile-delay-ms", type=int)


def guardrails_from_args(args: argparse.Namespace) -> dict[str, float | int | None]:
    return {
        "max_total_notional_usdc": getattr(args, "max_total_notional_usdc", None),
        "max_step_notional_usdc": getattr(args, "max_step_notional_usdc", None),
        "max_price_drift_bps": getattr(args, "max_price_drift_bps", None),
        "max_exposure_ratio": getattr(args, "max_exposure_ratio", None),
        "reconcile_attempts": getattr(args, "reconcile_attempts", None),
        "reconcile_delay_ms": getattr(args, "reconcile_delay_ms", None),
    }


def main(argv: Iterable[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    try:
        agent = SolanaClawdPerpsAgent()
        if args.command == "context":
            print_json(agent.context_summary())
        elif args.command == "health":
            print_json(agent.health())
        elif args.command == "preflight":
            print_json(agent.preflight())
        elif args.command == "market":
            print_json(agent.market(args.symbol))
        elif args.command == "portfolio":
            print_json(agent.portfolio())
        elif args.command == "paper-init":
            print_json(agent.paper_init(args.balance))
        elif args.command == "paper-order":
            print_json(agent.paper_order(args.side, args.symbol, args.notional_usdc, args.type))
        elif args.command == "live-market-order":
            print_json(agent.live_market_order(args.side, args.symbol, args.notional_usdc, args.yes))
        elif args.command == "twap":
            print_json(agent.twap(
                args.symbol,
                args.side,
                args.notional_usdc,
                args.tokens,
                args.slices,
                args.interval_seconds,
                args.mode,
                args.margin_mode,
                args.isolated_collateral,
                args.run_label,
                args.detached,
                guardrails_from_args(args),
                args.yes,
            ))
        elif args.command == "grid":
            print_json(agent.grid(
                args.symbol,
                args.levels_per_side,
                args.lower_price,
                args.upper_price,
                args.center_on_mark,
                args.width_pct,
                args.tokens_per_level,
                args.size_lots_per_level,
                args.bid_levels,
                args.ask_levels,
                args.take_profit_spacing,
                args.stop_loss_spacing,
                args.interval_seconds,
                args.ticks,
                args.run_until_stopped,
                args.stale_after_seconds,
                args.mode,
                args.margin_mode,
                args.isolated_collateral,
                args.run_label,
                args.slide,
                args.detached,
                guardrails_from_args(args),
                args.yes,
            ))
        elif args.command == "ta":
            print_json(agent.ta(
                args.config_file,
                args.config_json,
                args.mode,
                args.max_ticks,
                args.run_until_stopped,
                args.run_label,
                args.detached,
                guardrails_from_args(args),
                args.yes,
            ))
        elif args.command == "runs":
            print_json(agent.runs(args.limit))
        elif args.command == "status":
            print_json(agent.status(args.run_id, args.since_tick, args.include_ledger))
        elif args.command == "monitor":
            print_json(agent.monitor(args.run_id, args.include_ledger))
        elif args.command == "wait-next-tick":
            print_json(agent.wait_next_tick(args.run_id, args.after_tick, args.timeout_seconds, args.include_ledger))
        elif args.command == "report":
            print_json(agent.report(args.run_id))
        elif args.command == "reconcile-grid":
            print_json(agent.reconcile_grid(args.run_id))
        elif args.command == "pause":
            print_json(agent.control("pause", args.run_id, args.reason))
        elif args.command == "stop":
            print_json(agent.control("stop", args.run_id, args.reason))
        elif args.command == "resume":
            print_json(agent.resume(args.run_id, args.from_step, args.strategy_type))
        elif args.command == "finalize":
            print_json(agent.finalize(args.run_id, args.reason, args.cancel_orders, args.close_position, args.wait, args.timeout_seconds, args.yes))
        else:
            parser.error(f"unknown command: {args.command}")
        return 0
    except PerpsAgentError as exc:
        print_json({"ok": False, "error": {"message": str(exc)}})
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

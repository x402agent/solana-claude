# Solana Data Worker — on-chain intelligence and wallet analytics
#
# Functions:
#   data-worker::transform       — generic data transform (backwards compat)
#   data-worker::wallet_balance  — SOL balance for an address
#   data-worker::wallet_tokens   — SPL token accounts for an address
#   data-worker::token_analytics — token metadata, supply, top holders

import asyncio
import os
import json
from typing import Optional

import httpx
from iii import register_worker, InitOptions, Logger
from pydantic import BaseModel, ValidationError

SOLANA_RPC = os.environ.get("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
HELIUS_API_KEY = os.environ.get("HELIUS_API_KEY", "")

iii = register_worker(
    os.environ.get("III_BRIDGE_URL", "ws://localhost:49134"),
    InitOptions(worker_name="data-worker"),
)
logger = Logger()

# ── Helpers ───────────────────────────────────────────────────────────────────

def rpc_url() -> str:
    """Use Helius RPC if key is available, otherwise default."""
    if HELIUS_API_KEY:
        return f"https://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}"
    return SOLANA_RPC


def rpc_call(method: str, params: list) -> dict:
    """Synchronous JSON-RPC call to Solana."""
    with httpx.Client(timeout=15) as client:
        resp = client.post(
            rpc_url(),
            json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
        )
        return resp.json()


# ── Generic transform (backwards compat) ─────────────────────────────────────

class TransformInput(BaseModel):
    data: dict


def transform_handler(payload: dict) -> dict:
    try:
        validated = TransformInput.model_validate(payload)
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        return {"error": "Invalid payload", "details": e.errors()}

    worker_version = iii.trigger(
        {"function_id": "state::get", "payload": {"scope": "shared", "key": "WORKER_VERSION"}}
    )

    return {
        "transformed": validated.data,
        "keys": list(validated.data.keys()),
        "source": "data-worker",
        "worker_version": str(worker_version),
    }


iii.register_function({"id": "data-worker::transform"}, transform_handler)

# ── Wallet balance ────────────────────────────────────────────────────────────

def wallet_balance_handler(payload: dict) -> dict:
    address = payload.get("address", "")
    if not address:
        return {"error": "address required"}

    try:
        result = rpc_call("getBalance", [address])
        lamports = result.get("result", {}).get("value", 0)
        sol = lamports / 1e9
        return {
            "source": "data-worker",
            "address": address,
            "lamports": lamports,
            "sol": round(sol, 9),
        }
    except Exception as e:
        return {"error": f"RPC error: {e}"}


iii.register_function({"id": "data-worker::wallet_balance"}, wallet_balance_handler)

# ── Wallet tokens ─────────────────────────────────────────────────────────────

def wallet_tokens_handler(payload: dict) -> dict:
    address = payload.get("address", "")
    if not address:
        return {"error": "address required"}

    try:
        result = rpc_call(
            "getTokenAccountsByOwner",
            [
                address,
                {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},
                {"encoding": "jsonParsed"},
            ],
        )

        accounts = result.get("result", {}).get("value", [])
        tokens = []
        for acct in accounts:
            info = acct.get("account", {}).get("data", {}).get("parsed", {}).get("info", {})
            token_amount = info.get("tokenAmount", {})
            ui_amount = token_amount.get("uiAmount", 0)
            if ui_amount and ui_amount > 0:
                tokens.append({
                    "mint": info.get("mint", ""),
                    "amount": token_amount.get("amount", "0"),
                    "ui_amount": ui_amount,
                    "decimals": token_amount.get("decimals", 0),
                })

        tokens.sort(key=lambda t: t["ui_amount"], reverse=True)

        return {
            "source": "data-worker",
            "address": address,
            "token_count": len(tokens),
            "tokens": tokens[:50],  # top 50
        }
    except Exception as e:
        return {"error": f"RPC error: {e}"}


iii.register_function({"id": "data-worker::wallet_tokens"}, wallet_tokens_handler)

# ── Token analytics ───────────────────────────────────────────────────────────

def token_analytics_handler(payload: dict) -> dict:
    mint = payload.get("mint", "")
    if not mint:
        return {"error": "mint required"}

    try:
        # Token supply
        supply_result = rpc_call("getTokenSupply", [mint])
        supply_info = supply_result.get("result", {}).get("value", {})

        # Largest holders
        holders_result = rpc_call("getTokenLargestAccounts", [mint])
        holders = holders_result.get("result", {}).get("value", [])

        top_holders = []
        total_top = 0
        for h in holders[:10]:
            ui = h.get("uiAmount", 0) or 0
            total_top += ui
            top_holders.append({
                "address": h.get("address", ""),
                "ui_amount": ui,
            })

        total_supply = supply_info.get("uiAmount", 0) or 1
        concentration = round((total_top / total_supply) * 100, 2) if total_supply > 0 else 0

        return {
            "source": "data-worker",
            "mint": mint,
            "supply": {
                "amount": supply_info.get("amount", "0"),
                "ui_amount": supply_info.get("uiAmount", 0),
                "decimals": supply_info.get("decimals", 0),
            },
            "top_holders": top_holders,
            "top10_concentration_pct": concentration,
            "holder_risk": "high" if concentration > 80 else "medium" if concentration > 50 else "low",
        }
    except Exception as e:
        return {"error": f"RPC error: {e}"}


iii.register_function({"id": "data-worker::token_analytics"}, token_analytics_handler)

# ── Run ───────────────────────────────────────────────────────────────────────

print("Solana data worker started — transform, wallet_balance, wallet_tokens, token_analytics")

loop = asyncio.new_event_loop()
try:
    loop.run_forever()
except KeyboardInterrupt:
    pass

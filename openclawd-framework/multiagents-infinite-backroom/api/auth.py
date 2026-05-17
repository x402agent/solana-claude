"""
CLAWD API authentication helpers.

FastAPI validates API keys through Convex when auth is enabled. The module also
supports a local bootstrap admin key so deployments can be brought up before the
Convex key-creation UI exists.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable

from fastapi import Header, HTTPException, Request


CONVEX_SITE_URL = os.getenv("CONVEX_SITE_URL") or os.getenv("CONVEX_URL", "")
AUTH_REQUIRED = os.getenv("CLAWD_API_AUTH_REQUIRED", "false").lower() in {"1", "true", "yes"}
ADMIN_API_KEY = os.getenv("CLAWD_ADMIN_API_KEY")
CONVEX_VERIFY_PATH = os.getenv("CONVEX_VERIFY_PATH", "/clawd/keys/verify")
CONVEX_CREATE_KEY_PATH = os.getenv("CONVEX_CREATE_KEY_PATH", "/clawd/keys/create")
CONVEX_MACHINE_HANDSHAKE_PATH = os.getenv(
    "CONVEX_MACHINE_HANDSHAKE_PATH",
    "/clawd/machines/handshake",
)
CONVEX_USAGE_PATH = os.getenv("CONVEX_USAGE_PATH", "/clawd/usage/log")


@dataclass(frozen=True)
class AuthContext:
    authenticated: bool
    subject: str = "anonymous"
    project_id: str | None = None
    api_key_id: str | None = None
    machine_id: str | None = None
    scopes: tuple[str, ...] = ()
    auth_mode: str = "none"


def _auth_disabled_context() -> AuthContext:
    return AuthContext(authenticated=False, subject="auth-disabled", auth_mode="disabled")


def _extract_bearer(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _convex_post(path: str, payload: dict[str, Any], timeout: float = 8.0) -> dict[str, Any]:
    if not CONVEX_SITE_URL:
        raise RuntimeError("CONVEX_SITE_URL is not configured")

    url = f"{CONVEX_SITE_URL.rstrip('/')}{path}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8") or "{}")


def _admin_context(token: str, required_scopes: list[str]) -> AuthContext | None:
    if not ADMIN_API_KEY or not hmac.compare_digest(token, ADMIN_API_KEY):
        return None
    return AuthContext(
        authenticated=True,
        subject="admin",
        scopes=tuple(required_scopes + ["admin:keys"]),
        auth_mode="admin",
    )


def _context_from_verify_response(data: dict[str, Any]) -> AuthContext:
    if not data.get("valid", data.get("ok", False)):
        raise HTTPException(status_code=401, detail=data.get("error", "invalid API key"))

    scopes = data.get("scopes") or []
    if not isinstance(scopes, list):
        scopes = []

    return AuthContext(
        authenticated=True,
        subject=str(data.get("subject") or data.get("userId") or data.get("projectId") or "api-key"),
        project_id=data.get("projectId"),
        api_key_id=data.get("apiKeyId") or data.get("keyId"),
        machine_id=data.get("machineId"),
        scopes=tuple(str(scope) for scope in scopes),
        auth_mode="convex",
    )


def require_scope(*required_scopes: str) -> Callable[..., AuthContext]:
    required = [scope for scope in required_scopes if scope]

    async def dependency(
        request: Request,
        authorization: str | None = Header(default=None),
        x_clawd_machine_id: str | None = Header(default=None),
    ) -> AuthContext:
        if not AUTH_REQUIRED and "admin:keys" not in required:
            ctx = _auth_disabled_context()
            request.state.auth = ctx
            request.state.required_scopes = required
            return ctx

        token = _extract_bearer(authorization)
        if not token:
            raise HTTPException(status_code=401, detail="missing bearer token")

        admin = _admin_context(token, required)
        if admin is not None:
            request.state.auth = admin
            request.state.required_scopes = required
            return admin

        try:
            data = _convex_post(
                CONVEX_VERIFY_PATH,
                {
                    "tokenHash": _hash_token(token),
                    "tokenPrefix": token[:16],
                    "requiredScopes": required,
                    "route": request.url.path,
                    "method": request.method,
                    "machineId": x_clawd_machine_id,
                },
            )
        except urllib.error.HTTPError as exc:
            raise HTTPException(status_code=exc.code, detail=exc.read().decode("utf-8")) from exc
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"auth backend unavailable: {exc}") from exc

        ctx = _context_from_verify_response(data)
        if required and not set(required).issubset(set(ctx.scopes)):
            raise HTTPException(status_code=403, detail="API key lacks required scope")

        request.state.auth = ctx
        request.state.required_scopes = required
        return ctx

    return dependency


def create_api_key_via_convex(payload: dict[str, Any]) -> dict[str, Any]:
    return _convex_post(CONVEX_CREATE_KEY_PATH, payload)


def machine_handshake_via_convex(payload: dict[str, Any]) -> dict[str, Any]:
    return _convex_post(CONVEX_MACHINE_HANDSHAKE_PATH, payload)


def log_usage(request: Request, status_code: int, latency_ms: float) -> None:
    if not CONVEX_SITE_URL:
        return

    ctx = getattr(request.state, "auth", None)
    if not isinstance(ctx, AuthContext):
        return

    payload = {
        "projectId": ctx.project_id,
        "apiKeyId": ctx.api_key_id,
        "machineId": ctx.machine_id,
        "subject": ctx.subject,
        "authMode": ctx.auth_mode,
        "route": request.url.path,
        "method": request.method,
        "statusCode": status_code,
        "latencyMs": round(latency_ms, 2),
        "requiredScopes": getattr(request.state, "required_scopes", []),
        "createdAt": int(time.time() * 1000),
    }
    try:
        _convex_post(CONVEX_USAGE_PATH, payload, timeout=2.0)
    except Exception:
        # Usage logging must never break user-facing API calls.
        return


def auth_status() -> dict[str, Any]:
    return {
        "authRequired": AUTH_REQUIRED,
        "convexConfigured": bool(CONVEX_SITE_URL),
        "adminBootstrapConfigured": bool(ADMIN_API_KEY),
        "verifyPath": CONVEX_VERIFY_PATH,
        "createKeyPath": CONVEX_CREATE_KEY_PATH,
        "machineHandshakePath": CONVEX_MACHINE_HANDSHAKE_PATH,
        "usagePath": CONVEX_USAGE_PATH,
    }

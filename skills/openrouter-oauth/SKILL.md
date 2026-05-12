---
name: openrouter-oauth
version: 2.0.0
description: "Sign in with OpenRouter via OAuth PKCE — framework-agnostic, no client registration, no backend, no secrets. Produces an `sk-or-...` API key for any OpenClawd/solana-clawd agent that needs LLM inference."
compatibility: browser (requires Web Crypto API, localStorage, sessionStorage)
metadata:
  openclaw:
    category: "auth"
    verified: true
    attested_via: "OpenClawd Skill Authority"
    bundled_at_birth: true
    provides:
      - "OPENROUTER_API_KEY"
  requires:
    runtimes: ["browser"]
    apis: ["crypto.subtle", "localStorage", "sessionStorage"]
---

# openrouter-oauth

Add "Sign in with OpenRouter" to any openclawd surface (TailClawd UI, Clawd Desktop pairing page, chrome-extension, clawd-tui web shell). Users authorize on OpenRouter and your app receives an `sk-or-...` API key — no client registration, no backend, no secrets. Works with any framework.

This is the recommended way to populate the `OPENROUTER_API_KEY` slot that openclawd writes into `~/.openclawd/.env` at birth. Before this skill, users had to paste a key by hand after running `curl -fsSL solanaclawd.com/install.sh | bash`. With this skill, the "pair device" step in the birth flow drops them into a PKCE handshake instead.

Use this skill when the user asks for:
- "sign in with OpenRouter" / "OpenRouter login" / "OAuth for OpenRouter"
- a button to onboard an agent that needs an LLM key
- a browser-only flow for a solana-clawd buddy to earn its own inference key

For the typed SDK that consumes the resulting key (`callModel`, streaming, tool use), see the `openrouter-typescript-sdk` skill in the main hub.

Live demo: [openrouterteam.github.io/sign-in-with-openrouter](https://openrouterteam.github.io/sign-in-with-openrouter/)

## Decision Tree

| User wants to… | Do this |
|---|---|
| Add sign-in / login to a web app | Follow the full PKCE flow + button guidance below |
| Get an API key programmatically (no UI) | Just implement the PKCE flow — skip the button section |
| Pair the key into `~/.openclawd/.env` after exchange | See "Handing the key to openclawd" below |
| Use the OpenRouter SDK after auth | Do PKCE here for the key, then see `openrouter-typescript-sdk` skill for `callModel`/streaming |

---

## OAuth PKCE Flow

No client ID or secret — the PKCE challenge is the only proof of identity.

### Step 1: Generate verifier and challenge

```
code_verifier  = base64url(32 random bytes)
code_challenge = base64url(SHA-256(code_verifier))
```

- Use `crypto.getRandomValues(new Uint8Array(32))` for the random bytes
- base64url encoding: standard base64, then replace `+` → `-`, `/` → `_`, strip trailing `=`
- Store `code_verifier` in **`sessionStorage`** (not `localStorage`) — so the verifier doesn't persist after the tab closes or leak to other tabs (security: the verifier is a one-time secret)

### Step 2: Redirect to OpenRouter

```
https://openrouter.ai/auth?callback_url={url}&code_challenge={challenge}&code_challenge_method=S256
```

| Param | Value |
|---|---|
| `callback_url` | Your app's URL (where the user returns after auth) |
| `code_challenge` | The S256 challenge from Step 1 |
| `code_challenge_method` | Always `S256` |

### Step 3: Handle the redirect back

User returns to your `callback_url` with `?code=` appended. Extract the `code` query parameter.

**Important:** Before processing `?code=`, check that a `code_verifier` exists in `sessionStorage`. Other routes or third-party code might use `?code=` query params for unrelated purposes — a `hasOAuthCallbackPending()` guard ensures you only consume codes that belong to your OAuth flow.

### Step 4: Exchange code for API key

```
POST https://openrouter.ai/api/v1/auth/keys
Content-Type: application/json

{
  "code": "<code from query param>",
  "code_verifier": "<verifier from sessionStorage>",
  "code_challenge_method": "S256"
}

→ { "key": "sk-or-..." }
```

Remove the verifier from `sessionStorage` before or after the exchange.

### Step 5: Store the key and clean up

- Store `key` in `localStorage`
- Clean the URL: `history.replaceState({}, "", location.pathname)` to remove `?code=`
- **Cross-tab sync:** Listen for `storage` events on the API key's `localStorage` entry so other tabs update when the user signs in or out

---

## Auth Module Reference

Drop-in module implementing the full PKCE flow. Reduces risk of getting base64url encoding, sessionStorage handling, or the key exchange wrong.

```typescript
// lib/openrouter-auth.ts
const STORAGE_KEY = "openrouter_api_key";
const VERIFIER_KEY = "openrouter_code_verifier";

type AuthListener = () => void;
const listeners = new Set<AuthListener>();
export const onAuthChange = (fn: AuthListener) => { listeners.add(fn); return () => listeners.delete(fn); };
const notify = () => listeners.forEach((fn) => fn());

// Cross-tab sync: other tabs update when user signs in/out
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => { if (e.key === STORAGE_KEY) notify(); });
}

export const getApiKey = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

export const setApiKey = (key: string) => { localStorage.setItem(STORAGE_KEY, key); notify(); };
export const clearApiKey = () => { localStorage.removeItem(STORAGE_KEY); notify(); };

// Guard: only process ?code= if we initiated an OAuth flow in this tab
export const hasOAuthCallbackPending = (): boolean =>
  typeof window !== "undefined" && sessionStorage.getItem(VERIFIER_KEY) !== null;

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function computeS256Challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function initiateOAuth(callbackUrl?: string): Promise<void> {
  const verifier = generateCodeVerifier();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const challenge = await computeS256Challenge(verifier);
  const url = callbackUrl ?? window.location.origin + window.location.pathname;
  window.location.href = `https://openrouter.ai/auth?${new URLSearchParams({
    callback_url: url, code_challenge: challenge, code_challenge_method: "S256",
  })}`;
}

export async function handleOAuthCallback(code: string): Promise<void> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error("Missing code verifier");
  sessionStorage.removeItem(VERIFIER_KEY);
  const res = await fetch("https://openrouter.ai/api/v1/auth/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: "S256" }),
  });
  if (!res.ok) throw new Error(`Key exchange failed (${res.status})`);
  const { key } = await res.json();
  setApiKey(key);
}
```

---

## Sign-in Button

Build a button component that calls `initiateOAuth()` on click. Include the OpenRouter logo and provide multiple visual variants.

### OpenRouter Logo SVG

```svg
<svg viewBox="0 0 512 512" fill="currentColor" stroke="currentColor">
  <path d="M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945" stroke-width="90"/>
  <path d="M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z"/>
  <path d="M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377" stroke-width="90"/>
  <path d="M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z"/>
</svg>
```

### Variants (Tailwind)

Recommended classes for visual consistency with the reference implementation:

| Variant | Classes |
|---|---|
| `default` | `rounded-lg border border-neutral-300 bg-white text-neutral-900 shadow-sm hover:bg-neutral-50` |
| `minimal` | `text-neutral-700 underline-offset-4 hover:underline` |
| `branded` | `rounded-lg bg-neutral-900 text-white shadow hover:bg-neutral-800` |
| `icon` | Same as `default` + `aspect-square` (logo only, no text) |
| `cta` | `rounded-xl bg-neutral-900 text-white shadow-lg hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98]` |

### Sizes

| Size | Classes |
|---|---|
| `sm` | `h-8 px-3 text-xs` |
| `default` | `h-10 px-5 text-sm` |
| `lg` | `h-12 px-8 text-base` |
| `xl` | `h-14 px-10 text-lg` |

All variants use: `inline-flex items-center justify-center gap-2 font-medium transition-all cursor-pointer disabled:opacity-50`

Show a loading indicator while the key exchange is in progress. Default label: "Sign in with OpenRouter".

### Dark mode

For dark mode support, add dark variants: swap light backgrounds to dark (`dark:bg-neutral-900 dark:text-white`) and vice versa for `branded`/`cta` (`dark:bg-white dark:text-neutral-900`).

---

## Using the API Key

```typescript
const response = await fetch("https://openrouter.ai/api/v1/responses", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "openai/gpt-4o-mini",
    input: [{ type: "message", role: "user", content: "Hello!" }],
  }),
});
```

For the type-safe SDK approach (`callModel`, streaming, tool use), see the `openrouter-typescript-sdk` skill.

---

## Handing the key to openclawd

The openclawd bootstrap (`install.sh`) writes a scaffolded `~/.openclawd/.env` with `OPENROUTER_API_KEY=` empty. After a successful PKCE exchange, the agent-birth pairing page should patch that line in place rather than asking the user to copy-paste.

Two supported sink paths:

1. **Tailclawd / local sidecar** — POST the key to the tailclawd endpoint that serves the birth UI. Tailclawd runs on `127.0.0.1:3110` by default (exposed over the tailnet via `tailscale serve`). It owns write access to `~/.openclawd/.env` on the host it runs on.

   ```typescript
   await fetch("/api/openclawd/env", {
     method: "PATCH",
     headers: {
       "Content-Type": "application/json",
       "Authorization": `Bearer ${TAILCLAWD_TOKEN}`,
     },
     body: JSON.stringify({ OPENROUTER_API_KEY: key }),
   });
   ```

2. **clawdrouter direct** — if the consuming surface is `clawdrouter` (the model router that reads `OPENROUTER_API_KEY`), stash the key in `localStorage` under `openrouter_api_key` (as the module does) and let clawdrouter's browser runtime pick it up on the next request.

The flow a solana-clawd buddy gets at birth:

```
solana-clawd birth
   └─ wallet + SAS attestation
   └─ "Sign in with OpenRouter" button  ← this skill
        └─ PKCE handshake
        └─ key written to ~/.openclawd/.env (via tailclawd sidecar)
        └─ buddy can now call LLMs through clawdrouter
```

---

## Security notes specific to openclawd

- **Never log the `sk-or-...` key.** The clawd-vault scanner (`vault-scan --type secrets`) flags OpenRouter keys alongside Solana private keys and Kraken API keys; a logged key will fail the vault audit.
- **The verifier is a one-time secret** — keep it in `sessionStorage` only. The solana-clawd buddy UI must not persist it across tabs.
- **PKCE ≠ wallet custody.** This skill only gets an inference key. It does not grant access to funds. For vault/wallet auth at birth, see the `solana-attestation-skill` and `clawd-vault` skills instead.
- **Verified skill status.** This skill is marked `verified: true` and attested via the OpenClawd Skill Authority. The birth flow trusts it to write `OPENROUTER_API_KEY` but only that key — broader env mutation requires a different attestation.

---

## Resources

- [OAuth PKCE guide](https://openrouter.ai/docs/guides/overview/auth/oauth) — full parameter reference and key management
- [Authentication guide](https://openrouter.ai/docs/api/reference/authentication) — API key usage and Bearer token setup
- [Live demo](https://openrouterteam.github.io/sign-in-with-openrouter/) — interactive button playground
- [OpenRouter TypeScript SDK](https://openrouter.ai/docs/sdks/typescript/overview) — `callModel` pattern for completions and streaming
- OpenClawd `install.sh` — the bootstrap that seeds `~/.openclawd/.env` with the empty `OPENROUTER_API_KEY` slot this skill populates
- `skills/openrouter-oauth/` in the main openclawd skills dir — mirrored copy for non-kraken agent surfaces

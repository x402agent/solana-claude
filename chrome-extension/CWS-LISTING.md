# Chrome Web Store — Listing Copy

Paste-ready fields for [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole).

## Package

Run:

```bash
./build-cws.sh
```

Upload `build/clawd-popup-vX.Y.Z.zip`.

## Item Details

**Name** (max 45 chars)
```
Solana Clawd — Wallet, Vault & AI Agent
```

**Summary / Short description** (max 132 chars — already enforced in `manifest.json`)
```
Solana wallet, AI chat, and an air-gapped local vault — in one extension. Your keys never leave your machine.
```

**Category**
```
Productivity
```

**Language**
```
English
```

## Detailed Description

```
Solana Clawd is the first AI-powered browser companion for Solana that keeps your private keys on your machine. Not "encrypted in the cloud." Not "we promise we'll never look." Actually on your machine — talking only to localhost.

WHAT YOU GET

• Wallet Dashboard — SOL balance, SPL portfolio, USD value, OODA trade history with P&L
• AI Chat — multi-turn conversation with Clawd trading intelligence, powered by your own OpenRouter key (pick any model)
• Tools — live Helius RPC health, trending Solana tokens, system status, on-chain agent identity mint
• Vault Tab — AES-256-GCM encrypted local wallet vault, bearer-auth, localhost only (no internet calls, ever)
• Seeker Bridge — connect a Solana Seeker phone to your local Clawd daemon
• Mining Fleet — Bitaxe fleet dashboard with live SSE updates

CLAWD PRO — HOLD $CLAWD, UNLOCK EVERYTHING

Tier detection is automatic and local. The extension reads your connected wallet's $CLAWD balance from the Clawd daemon's portfolio endpoint, maps it to a tier, and unlocks features in the UI:

• FREE    — 5 daily runs, core 6 tabs
• BRONZE  — 1+ $CLAWD, 20 runs, watchlist & price alerts
• SILVER  — 1,000+ $CLAWD, 50 runs, OODA autopilot, Telegram mirroring
• GOLD    — 10,000+ $CLAWD, 100 runs, multi-agent research, X/Twitter alpha feed
• DIAMOND — 100,000+ $CLAWD, 250 runs, Pump.fun sniper, MEV-aware routing, priority RPC

PRIVACY & SECURITY

• Zero internet calls from the extension itself — the manifest only whitelists 127.0.0.1 and localhost
• No bundled API keys, no telemetry, no analytics
• Vault files are chmod 0600, AES-256-GCM encrypted, stored in ~/.agentwallet/
• Source is MIT on GitHub — audit it yourself

REQUIREMENTS

• Clawd daemon running locally (one-shot install at github.com/x402agent/solana-clawd)
• OpenRouter API key (for AI chat — you supply your own)
• Optional: agentwallet-vault running on port 9099 for the Vault tab

LINKS
• GitHub: github.com/x402agent/solana-clawd
• $CLAWD on pump.fun: pump.fun/8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump
```

## Screenshots (1280×800 or 640×400, PNG/JPG, up to 5)

Suggested shots:
1. **Wallet tab** showing SOL balance, portfolio, OODA trades
2. **Chat tab** mid-conversation with Clawd
3. **Vault tab** with a generated keypair and the "0600 · AES-256-GCM" footer
4. **Settings panel** showing OpenRouter key config
5. **Pro badge** glowing gold/diamond (requires holding $CLAWD to capture the live state)

Take them at 1280×800 against a dark desktop for consistency with the cyberpunk theme.

## Promotional Images

| Asset | Size | Required |
|---|---|---|
| Small promo tile | 440×280 | Required |
| Large promo tile | 920×680 | Optional |
| Marquee | 1400×560 | Optional |

## Privacy

**Single purpose**
```
Solana wallet dashboard and AI chat companion that talks only to a local Clawd daemon.
```

**Permission justification**

- `storage` — persist the user's settings (daemon URL, API key, tier state) in `chrome.storage.local`
- `activeTab` — used only when the user clicks "Open in Solscan" to open the current wallet's explorer page
- `alarms` — periodic health check (every 30s) against the local daemon to update the toolbar badge
- `host_permissions` for `127.0.0.1:*` and `localhost:*` — required to talk to the local Clawd daemon, Seeker gateway, MawdAxe miner API, and agentwallet-vault. No remote hosts are whitelisted.

**Data usage disclosures** — check all of:
- [x] I do not sell or transfer user data to third parties
- [x] I do not use or transfer user data for unrelated purposes
- [x] I do not use or transfer user data to determine creditworthiness

**Data collection**: None. Set all categories to "Not collected."

## Support

**Support email**
```
support@solanaclawd.com
```

**Website**
```
https://github.com/x402agent/solana-clawd
```

## Release Checklist

Before publishing:

- [ ] `./build-cws.sh` runs clean and produces `build/clawd-popup-vX.Y.Z.zip`
- [ ] Version bumped in `manifest.json` (CWS rejects re-uploads with the same version)
- [ ] No `console.log` debug statements in `popup.js` or `background.js`
- [ ] No hardcoded API keys (check `OR_BUNDLED_KEY` is empty)
- [ ] Manifest description ≤ 132 chars
- [ ] Icons are exactly 16 / 32 / 48 / 128 px PNG
- [ ] `host_permissions` contains only localhost/127.0.0.1 entries
- [ ] Screenshots captured at 1280×800
- [ ] Privacy policy URL added in the dashboard (required for extensions that handle wallet data)
- [ ] Tested on Chrome, Brave, and Edge with `Load unpacked`

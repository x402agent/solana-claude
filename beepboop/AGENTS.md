# Beep Boop Clawd - Agent Instructions

<!-- This is the single source of truth for all AI coding agents. AGENTS.md is a symlink to this file. -->
<!-- AGENTS.md spec: https://github.com/agentsmd/agents.md — supported by Claude Code, Cursor, Copilot, Gemini CLI, and others. -->

## Overview

Beep Boop is a Solana blockchain clawd pointer — a lobster claw companion that lives in the macOS menu bar. It follows you during daily tasks: seeing your screen, explaining things, generating code, talking to you with voice, and connecting to Solana blockchain gateways. Push-to-talk (ctrl+option) captures voice, transcribes via AssemblyAI, sends transcript + screenshot to Claude, which responds with streamed text and ElevenLabs TTS voice. A lobster claw overlay flies to and points at UI elements Claude references on any monitor. Claude embeds `[CLAW:x,y:label:screenN]` tags to direct the claw.

All API keys (including Solana RPC) live on a Cloudflare Worker proxy (the "Clawd Gateway") — nothing sensitive ships in the app.

## Architecture

- **App Type**: Menu bar-only (`LSUIElement=true`), no dock icon or main window
- **Framework**: SwiftUI (macOS native) with AppKit bridging for menu bar panel and claw overlay
- **Pattern**: MVVM with `@StateObject` / `@Published` state management
- **AI Chat**: Claude (Sonnet 4.6 default, Opus 4.6 optional) via Clawd Gateway with SSE streaming
- **Speech-to-Text**: AssemblyAI real-time streaming (`u3-rt-pro` model) via websocket, with OpenAI and Apple Speech as fallbacks
- **Text-to-Speech**: ElevenLabs (`eleven_flash_v2_5` model) via Clawd Gateway
- **Screen Capture**: ScreenCaptureKit (macOS 14.2+), multi-monitor support
- **Voice Input**: Push-to-talk via `AVAudioEngine` + pluggable transcription-provider layer. System-wide keyboard shortcut via listen-only CGEvent tap.
- **Claw Pointing**: Claude embeds `[CLAW:x,y:label:screenN]` tags in responses. The overlay parses these, maps coordinates to the correct monitor, and animates the lobster claw along a bezier arc to the target.
- **Solana Integration**: Clawd Gateway proxies Solana JSON-RPC calls. Balance lookups, token account queries, and raw RPC pass-through for on-chain operations.
- **Concurrency**: `@MainActor` isolation, async/await throughout
- **Analytics**: PostHog via `ClickyAnalytics.swift`

### API Proxy (Clawd Gateway — Cloudflare Worker)

The app never calls external APIs directly. All requests go through the Clawd Gateway (`worker/src/index.ts`) that holds API keys as secrets.

| Route | Upstream | Purpose |
|-------|----------|---------|
| `POST /chat` | `api.anthropic.com/v1/messages` | Claude vision + streaming chat |
| `POST /tts` | `api.elevenlabs.io/v1/text-to-speech/{voiceId}` | ElevenLabs TTS (lobster voice) |
| `POST /transcribe-token` | `streaming.assemblyai.com/v3/token` | Short-lived (480s) AssemblyAI websocket token |
| `POST /solana/rpc` | Solana JSON-RPC endpoint | Raw RPC proxy to mainnet/devnet |
| `POST /solana/balance` | Solana JSON-RPC endpoint | Quick SOL balance for a wallet address |
| `POST /solana/tokens` | Solana JSON-RPC endpoint | Token accounts (SPL) for a wallet |
| `GET /health` | — | Clawd Gateway health check |

Worker secrets: `ANTHROPIC_API_KEY`, `ASSEMBLYAI_API_KEY`, `ELEVENLABS_API_KEY`, `SOLANA_RPC_URL` (optional)
Worker vars: `ELEVENLABS_VOICE_ID`, `SOLANA_NETWORK`

### Key Architecture Decisions

**Menu Bar Panel Pattern**: The companion panel uses `NSStatusItem` for the menu bar icon and a custom borderless `NSPanel` for the floating control panel. Dark lobster-themed aesthetic with rounded corners and custom shadow. Non-activating so it doesn't steal focus.

**Claw Overlay**: A full-screen transparent `NSPanel` hosts the lobster claw companion. It's non-activating, joins all Spaces, and never steals focus. The claw position, response text, waveform, and pointing animations all render in this overlay via SwiftUI through `NSHostingView`. The cursor is themed as a lobster claw in red/orange.

**Global Push-To-Talk Shortcut**: Background push-to-talk uses a listen-only `CGEvent` tap instead of an AppKit global monitor so modifier-based shortcuts like `ctrl + option` are detected reliably.

**Shared URLSession for AssemblyAI**: A single long-lived `URLSession` is shared across all AssemblyAI streaming sessions. Creating and invalidating per-session URLSessions corrupts the OS connection pool.

**Transient Claw Mode**: When "Show Beep Boop" is off, pressing the hotkey fades in the claw overlay for the duration of the interaction (recording -> response -> TTS -> optional pointing), then fades it out after 1 second of inactivity.

**Solana Clawd Gateway**: All Solana RPC calls go through the Cloudflare Worker. This allows using a private RPC endpoint (Helius, Quicknode) without shipping the URL in the app binary. The gateway supports raw RPC passthrough and convenience endpoints for balance/token lookups.

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `leanring_buddyApp.swift` | ~89 | Menu bar app entry point. `@NSApplicationDelegateAdaptor` with `CompanionAppDelegate`. |
| `CompanionManager.swift` | ~1026 | Central state machine. Coordinates push-to-talk -> screenshot -> Claude -> TTS -> claw pointing pipeline. |
| `MenuBarPanelManager.swift` | ~243 | NSStatusItem + custom NSPanel lifecycle for the menu bar. |
| `CompanionPanelView.swift` | ~761 | SwiftUI panel content — status, push-to-talk, model picker, permissions UI. |
| `OverlayWindow.swift` | ~881 | Full-screen transparent overlay hosting the lobster claw, response text, waveform. |
| `CompanionResponseOverlay.swift` | ~217 | Response text bubble and waveform next to the claw. |
| `CompanionScreenCaptureUtility.swift` | ~132 | Multi-monitor screenshot capture via ScreenCaptureKit. |
| `BuddyDictationManager.swift` | ~866 | Push-to-talk voice pipeline. Mic capture, transcript finalization, audio levels. |
| `BuddyTranscriptionProvider.swift` | ~100 | Transcription provider protocol and factory (AssemblyAI/OpenAI/Apple). |
| `AssemblyAIStreamingTranscriptionProvider.swift` | ~478 | Real-time streaming transcription via websocket. |
| `OpenAIAudioTranscriptionProvider.swift` | ~317 | Upload-based transcription fallback. |
| `AppleSpeechTranscriptionProvider.swift` | ~147 | Local fallback via Apple Speech framework. |
| `BuddyAudioConversionSupport.swift` | ~108 | Audio conversion helpers (PCM16 mono, WAV building). |
| `GlobalPushToTalkShortcutMonitor.swift` | ~132 | System-wide CGEvent tap for push-to-talk. |
| `ClaudeAPI.swift` | ~291 | Claude vision API client with SSE streaming. |
| `OpenAIAPI.swift` | ~142 | OpenAI GPT vision API client. |
| `ElevenLabsTTSClient.swift` | ~81 | ElevenLabs TTS client via Clawd Gateway. |
| `ElementLocationDetector.swift` | ~335 | UI element location detection for claw pointing. |
| `DesignSystem.swift` | ~880 | Design system — lobster red/orange theme, claw colors, button styles. |
| `ClickyAnalytics.swift` | ~121 | PostHog analytics. |
| `WindowPositionManager.swift` | ~262 | Window placement, Screen Recording permission flow. |
| `AppBundleConfiguration.swift` | ~28 | Runtime config from Info.plist. |
| `worker/src/index.ts` | ~280 | Clawd Gateway Worker. Routes: /chat, /tts, /transcribe-token, /solana/*. |

## Build & Run

```bash
# Open in Xcode
open leanring-buddy.xcodeproj

# Select the leanring-buddy scheme, set signing team, Cmd+R to build and run

# Known non-blocking warnings: Swift 6 concurrency warnings,
# deprecated onChange warning in OverlayWindow.swift. Do NOT attempt to fix these.
```

**Do NOT run `xcodebuild` from the terminal** — it invalidates TCC permissions.

## Clawd Gateway (Cloudflare Worker)

```bash
cd worker
npm install

# Add secrets
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ASSEMBLYAI_API_KEY
npx wrangler secret put ELEVENLABS_API_KEY
npx wrangler secret put SOLANA_RPC_URL    # optional — for private RPC

# Deploy
npx wrangler deploy

# Local dev (create worker/.dev.vars with your keys)
npx wrangler dev
```

## Code Style & Conventions

### Variable and Method Naming

IMPORTANT: Follow these naming rules strictly. Clarity is the top priority.

- Be as clear and specific with variable and method names as possible
- **Optimize for clarity over concision.** A developer with zero context should immediately understand what a variable or method does from its name
- Use longer names when it improves clarity. Do NOT use single-character variable names
- When passing props or arguments, keep the same names as the original variable

### Code Clarity

- **Clear is better than clever.** Do not write functionality in fewer lines if it makes the code harder to understand
- Write more lines if additional lines improve readability
- When a variable or method name alone cannot fully explain something, add a comment

### Swift/SwiftUI Conventions

- Use SwiftUI for all UI unless a feature is only supported in AppKit (e.g., `NSPanel`)
- All UI state updates must be on `@MainActor`
- Use async/await for all asynchronous operations
- Comments should explain "why" not just "what"
- AppKit `NSPanel`/`NSWindow` bridged into SwiftUI via `NSHostingView`
- All buttons must show a pointer cursor on hover

### Do NOT

- Do not add features, refactor code, or make "improvements" beyond what was asked
- Do not add docstrings, comments, or type annotations to code you did not change
- Do not try to fix the known non-blocking warnings (Swift 6 concurrency, deprecated onChange)
- Do not rename the project directory or scheme (the "leanring" typo is legacy)
- Do not run `xcodebuild` from the terminal — it invalidates TCC permissions

## Git Workflow

- Branch naming: `feature/description` or `fix/description`
- Commit messages: imperative mood, concise, explain the "why" not the "what"
- Do not force-push to main

## Self-Update Instructions

When you make changes that affect this file, update it:

1. **New files**: Add to the Key Files table
2. **Deleted files**: Remove from the table
3. **Architecture changes**: Update the architecture section
4. **Build changes**: Update build commands
5. **New conventions**: Add to the conventions section
6. **Line count drift**: Update approximate counts (>50 lines change)

Do NOT update for minor edits or bug fixes.

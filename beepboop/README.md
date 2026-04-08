# Beep Boop - The Solana Clawd

A lobster claw pointer that follows you during your daily tasks on macOS. It can see your screen, explain things, prompt you, generate code, talk to you with voice, and connect to Solana blockchain gateways. Part lobster, part claw, all clawd.

Built on Anthropic Claude, AssemblyAI, ElevenLabs, and Solana.

## How It Works

1. **Push-to-talk** (Ctrl+Option) captures your voice
2. **AssemblyAI** transcribes speech in real-time via websocket
3. **ScreenCaptureKit** takes a screenshot of your current screen
4. Transcript + screenshot are sent to **Claude** (Sonnet/Opus) via streaming SSE
5. Claude responds with text and can embed `[CLAW:x,y:label:screenN]` tags
6. **ElevenLabs** converts the response to lobster speech
7. A lobster claw overlay flies to and points at UI elements Claude references
8. **Solana RPC** calls are proxied through the Clawd Gateway for on-chain lookups

All API keys (including Solana RPC) are proxied through the **Clawd Gateway** (Cloudflare Worker) -- nothing sensitive ships in the app binary.

## Architecture

| Component | Technology | Details |
| --------- | ---------- | ------- |
| App Type | macOS menu bar (`LSUIElement=true`) | No dock icon, no main window |
| Framework | SwiftUI + AppKit bridging | `NSPanel` for floating windows, `NSHostingView` bridge |
| Pattern | MVVM | `@StateObject` / `@Published` state management |
| AI Chat | Claude (Sonnet 4.6 / Opus 4.6) | SSE streaming via Clawd Gateway |
| Speech-to-Text | AssemblyAI (`u3-rt-pro`) | Real-time websocket streaming; OpenAI and Apple Speech fallbacks |
| Text-to-Speech | ElevenLabs (`eleven_flash_v2_5`) | Via Clawd Gateway |
| Screen Capture | ScreenCaptureKit (macOS 14.2+) | Multi-monitor support |
| Voice Input | `AVAudioEngine` + pluggable providers | System-wide shortcut via listen-only `CGEvent` tap |
| Solana | JSON-RPC via Clawd Gateway | Balance, token accounts, raw RPC proxy |
| Analytics | PostHog | Via `ClickyAnalytics.swift` |
| Concurrency | `@MainActor` isolation | async/await throughout |

### Clawd Gateway (Cloudflare Worker)

The app never calls external APIs directly. All requests go through the Clawd Gateway (`worker/src/index.ts`):

| Route | Upstream | Purpose |
| ----- | -------- | ------- |
| `POST /chat` | `api.anthropic.com/v1/messages` | Claude vision + streaming chat |
| `POST /tts` | `api.elevenlabs.io/v1/text-to-speech/{voiceId}` | ElevenLabs TTS (lobster voice) |
| `POST /transcribe-token` | `streaming.assemblyai.com/v3/token` | Short-lived (480s) AssemblyAI websocket token |
| `POST /solana/rpc` | Solana JSON-RPC endpoint | Raw RPC proxy to mainnet/devnet |
| `POST /solana/balance` | Solana JSON-RPC endpoint | Quick SOL balance lookup |
| `POST /solana/tokens` | Solana JSON-RPC endpoint | Token accounts (SPL) for a wallet |
| `GET /health` | -- | Clawd Gateway health check |

**Worker secrets**: `ANTHROPIC_API_KEY`, `ASSEMBLYAI_API_KEY`, `ELEVENLABS_API_KEY`, `SOLANA_RPC_URL` (optional)
**Worker vars**: `ELEVENLABS_VOICE_ID`, `SOLANA_NETWORK`

### Key Architecture Decisions

- **Menu Bar Panel**: Custom borderless `NSPanel` via `NSStatusItem` -- lobster-themed dark aesthetic, non-activating, auto-dismisses on outside clicks
- **Claw Overlay**: Full-screen transparent `NSPanel` hosting the lobster claw companion. Non-activating, joins all Spaces. Claw, response text, waveform, and pointing animations rendered via SwiftUI through `NSHostingView`
- **Global Push-To-Talk**: Listen-only `CGEvent` tap so `Ctrl+Option` is detected reliably in the background
- **Shared URLSession for AssemblyAI**: Single long-lived session to avoid OS connection pool corruption
- **Transient Claw Mode**: When "Show Beep Boop" is off, the claw fades in for the interaction, then fades out after 1 second of inactivity
- **Solana Clawd Gateway**: All Solana RPC calls proxied through Cloudflare Worker so private RPC URLs never ship in the binary

## Project Structure

```
beepboop/
  leanring-buddy/                    # Swift source (the lobster den, typo is legacy)
    leanring_buddyApp.swift            # Menu bar app entry point, CompanionAppDelegate
    CompanionManager.swift             # Central state machine (~1026 lines)
    MenuBarPanelManager.swift          # NSStatusItem + NSPanel lifecycle
    CompanionPanelView.swift           # Menu bar dropdown UI (model picker, status, permissions)
    OverlayWindow.swift                # Full-screen claw overlay, bezier pointing, multi-monitor
    CompanionResponseOverlay.swift     # Response text bubble + waveform next to claw
    CompanionScreenCaptureUtility.swift # Multi-monitor screenshot via ScreenCaptureKit
    BuddyDictationManager.swift        # Push-to-talk voice pipeline via AVAudioEngine
    BuddyTranscriptionProvider.swift   # Protocol + factory for transcription backends
    AssemblyAIStreamingTranscriptionProvider.swift  # Real-time websocket STT
    OpenAIAudioTranscriptionProvider.swift          # Upload-based STT fallback
    AppleSpeechTranscriptionProvider.swift          # Local Apple Speech fallback
    BuddyAudioConversionSupport.swift  # PCM16 mono conversion, WAV builder
    GlobalPushToTalkShortcutMonitor.swift # CGEvent tap for system-wide shortcut
    ClaudeAPI.swift                    # Claude vision client (SSE + non-streaming)
    OpenAIAPI.swift                    # OpenAI GPT vision client
    ElevenLabsTTSClient.swift          # ElevenLabs TTS playback
    ElementLocationDetector.swift      # UI element location detection for claw pointing
    DesignSystem.swift                 # Lobster red/orange theme, DS.Colors, DS.CornerRadius
    ClickyAnalytics.swift              # PostHog analytics
    WindowPositionManager.swift        # Window placement, permission flows
    AppBundleConfiguration.swift       # Runtime config from Info.plist
    Assets.xcassets/                   # App icons, screenshots, images
  leanring-buddy.xcodeproj/          # Xcode project
  leanring-buddyTests/               # Unit tests
  leanring-buddyUITests/             # UI tests
  worker/                            # Clawd Gateway (Cloudflare Worker)
    src/index.ts                       # Routes: /chat, /tts, /transcribe-token, /solana/*
    wrangler.toml                      # Worker config (name: beepboop-clawd-gateway)
    package.json                       # Worker dependencies
  scripts/
    release.sh                         # Full release pipeline
  AGENTS.md                          # Agent instructions (CLAUDE.md symlinks here)
  CLAUDE.md                          # Full architecture doc for AI agents
  appcast.xml                        # Sparkle auto-update feed
  dmg-background.png                 # DMG installer background image
  LICENSE                            # MIT License
```

## Prerequisites

- macOS 14.2+ (for ScreenCaptureKit)
- Xcode 15+
- Node.js 18+ (for the Cloudflare Worker)
- A [Cloudflare](https://cloudflare.com) account (free tier works)
- API keys for:
  - [Anthropic](https://console.anthropic.com) (Claude)
  - [AssemblyAI](https://www.assemblyai.com) (speech-to-text)
  - [ElevenLabs](https://elevenlabs.io) (text-to-speech)
- A Solana RPC endpoint (public works, [Helius](https://helius.dev) or [Quicknode](https://quicknode.com) recommended)

## Quick Start with Claude Code

```
Hi Claude.

Read the CLAUDE.md in the beepboop directory. I want to get Beep Boop running locally on my Mac.

Help me set up everything -- the Clawd Gateway with my API keys, the Solana RPC config, the proxy URLs, and getting it building in Xcode.
```

## Manual Setup

### 1. Set Up the Clawd Gateway

```bash
cd worker
npm install

# Add your API key secrets
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ASSEMBLYAI_API_KEY
npx wrangler secret put ELEVENLABS_API_KEY
npx wrangler secret put SOLANA_RPC_URL    # optional -- for private RPC endpoints

# Configure voice and network in wrangler.toml:
# [vars]
# ELEVENLABS_VOICE_ID = "your-voice-id-here"
# SOLANA_NETWORK = "mainnet-beta"

# Deploy
npx wrangler deploy
```

Copy the Worker URL (e.g. `https://beepboop-clawd-gateway.your-subdomain.workers.dev`).

### 2. Run Locally (for development)

```bash
cd worker
npx wrangler dev
```

Create `worker/.dev.vars`:

```
ANTHROPIC_API_KEY=sk-ant-...
ASSEMBLYAI_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

Update proxy URLs in Swift code to `http://localhost:8787`. Find them with:

```bash
grep -r "beepboop-clawd" leanring-buddy/
```

Locations: `CompanionManager.swift` (Claude chat + TTS + Solana), `AssemblyAIStreamingTranscriptionProvider.swift` (token endpoint).

### 3. Open in Xcode and Run

```bash
open leanring-buddy.xcodeproj
```

1. Select the `leanring-buddy` scheme
2. Set your signing team under Signing & Capabilities
3. **Cmd+R** to build and run

The app appears in your menu bar. Click the lobster icon, grant permissions, and you're clawing.

**Do NOT run `xcodebuild` from the terminal** -- it invalidates TCC permissions.

### Required Permissions

| Permission | Reason |
| ---------- | ------ |
| Microphone | Push-to-talk voice capture |
| Accessibility | Global keyboard shortcut (Ctrl+Option) |
| Screen Recording | Taking screenshots on hotkey press |
| Screen Content | ScreenCaptureKit access |

## Release Pipeline

```bash
# Auto-bumps version from latest GitHub Release
./scripts/release.sh

# Or set specific version
./scripts/release.sh 2.0
./scripts/release.sh 2.0 10  # version + build number
```

Pipeline: Archive -> Sign -> DMG -> Notarize -> Sparkle appcast -> GitHub Release

## Code Style

- **Clarity over concision** -- longer names are fine if they improve readability
- **SwiftUI first**, AppKit only when required (`NSPanel`, floating windows)
- **`@MainActor` isolation** for all UI state
- **async/await** for all async operations
- Comments explain "why" not "what"
- All buttons show pointer cursor on hover
- Do NOT rename the project directory (the "leanring" typo is legacy)

## Contributing

PRs welcome. If you're using Claude Code, point it at `CLAUDE.md` and go wild.

## License

MIT License -- see [LICENSE](LICENSE).

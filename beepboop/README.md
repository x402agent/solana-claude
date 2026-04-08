# Clicky (beepboop)

An AI teaching companion that lives as a buddy next to your cursor on macOS. It can see your screen, talk to you, and point at stuff -- like having a real teacher sitting next to you.

Based on the open-source [Clicky](https://www.clicky.so/) project by [@FarzaTV](https://x.com/FarzaTV). See the [original demo tweet](https://x.com/FarzaTV/status/2041314633978659092).

![Clicky — an ai buddy that lives on your mac](clicky-demo.gif)

## How It Works

1. **Push-to-talk** (Ctrl+Option) captures your voice
2. **AssemblyAI** transcribes speech in real-time via websocket
3. **ScreenCaptureKit** takes a screenshot of your current screen
4. Transcript + screenshot are sent to **Claude** (Sonnet/Opus) via streaming SSE
5. Claude responds with text and can embed `[POINT:x,y:label:screenN]` tags
6. **ElevenLabs** converts the response to speech
7. A blue cursor overlay flies to and points at UI elements Claude references

All API keys are proxied through a **Cloudflare Worker** -- nothing sensitive ships in the app binary.

## Architecture

| Component | Technology | Details |
|-----------|-----------|---------|
| App Type | macOS menu bar (`LSUIElement=true`) | No dock icon, no main window |
| Framework | SwiftUI + AppKit bridging | `NSPanel` for floating windows, `NSHostingView` bridge |
| Pattern | MVVM | `@StateObject` / `@Published` state management |
| AI Chat | Claude (Sonnet 4.6 / Opus 4.6) | SSE streaming via Cloudflare Worker proxy |
| Speech-to-Text | AssemblyAI (`u3-rt-pro`) | Real-time websocket streaming; OpenAI and Apple Speech fallbacks |
| Text-to-Speech | ElevenLabs (`eleven_flash_v2_5`) | Via Cloudflare Worker proxy |
| Screen Capture | ScreenCaptureKit (macOS 14.2+) | Multi-monitor support |
| Voice Input | `AVAudioEngine` + pluggable providers | System-wide shortcut via listen-only `CGEvent` tap |
| Analytics | PostHog | Via `ClickyAnalytics.swift` |
| Concurrency | `@MainActor` isolation | async/await throughout |

### API Proxy (Cloudflare Worker)

The app never calls external APIs directly. All requests go through a Cloudflare Worker (`worker/src/index.ts`):

| Route | Upstream | Purpose |
|-------|----------|---------|
| `POST /chat` | `api.anthropic.com/v1/messages` | Claude vision + streaming chat |
| `POST /tts` | `api.elevenlabs.io/v1/text-to-speech/{voiceId}` | ElevenLabs TTS audio |
| `POST /transcribe-token` | `streaming.assemblyai.com/v3/token` | Short-lived (480s) AssemblyAI websocket token |

**Worker secrets**: `ANTHROPIC_API_KEY`, `ASSEMBLYAI_API_KEY`, `ELEVENLABS_API_KEY`
**Worker vars**: `ELEVENLABS_VOICE_ID`

### Key Architecture Decisions

- **Menu Bar Panel**: Custom borderless `NSPanel` via `NSStatusItem` -- full appearance control, non-activating (doesn't steal focus), auto-dismisses on outside clicks
- **Cursor Overlay**: Full-screen transparent `NSPanel` hosting the blue cursor companion. Non-activating, joins all Spaces, never steals focus. Cursor, response text, waveform, and pointing animations rendered via SwiftUI through `NSHostingView`
- **Global Push-To-Talk**: Listen-only `CGEvent` tap (not AppKit global monitor) so `Ctrl+Option` is detected reliably in the background
- **Shared URLSession for AssemblyAI**: Single long-lived session shared across all streaming sessions to avoid OS connection pool corruption
- **Transient Cursor Mode**: When "Show Clicky" is off, the cursor fades in for the interaction duration, then fades out after 1 second of inactivity

## Project Structure

```
beepboop/
  leanring-buddy/                    # Swift source (the typo is intentional/legacy)
    leanring_buddyApp.swift            # Menu bar app entry point, CompanionAppDelegate
    CompanionManager.swift             # Central state machine (~1026 lines)
    MenuBarPanelManager.swift          # NSStatusItem + NSPanel lifecycle
    CompanionPanelView.swift           # Menu bar dropdown UI (model picker, status, permissions)
    OverlayWindow.swift                # Full-screen cursor overlay, bezier pointing, multi-monitor
    CompanionResponseOverlay.swift     # Response text bubble + waveform next to cursor
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
    ElementLocationDetector.swift      # UI element location detection for pointing
    DesignSystem.swift                 # DS.Colors, DS.CornerRadius design tokens
    ClickyAnalytics.swift              # PostHog analytics
    WindowPositionManager.swift        # Window placement, permission flows
    AppBundleConfiguration.swift       # Runtime config from Info.plist
    Assets.xcassets/                   # App icons, screenshots, images
  leanring-buddy.xcodeproj/          # Xcode project
  leanring-buddyTests/               # Unit tests
  leanring-buddyUITests/             # UI tests
  worker/                            # Cloudflare Worker proxy
    src/index.ts                       # Three routes: /chat, /tts, /transcribe-token
    wrangler.toml                      # Worker config (name: clicky-proxy)
    package.json                       # Worker dependencies
  scripts/
    release.sh                         # Full release pipeline: build -> sign -> DMG -> notarize -> GitHub Release
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

## Quick Start with Claude Code

The fastest way to get running:

```
Hi Claude.

Clone https://github.com/farzaa/clicky.git into my current directory.

Then read the CLAUDE.md. I want to get Clicky running locally on my Mac.

Help me set up everything -- the Cloudflare Worker with my own API keys, the proxy URLs, and getting it building in Xcode. Walk me through it.
```

## Manual Setup

### 1. Set Up the Cloudflare Worker

```bash
cd worker
npm install

# Add your API key secrets
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ASSEMBLYAI_API_KEY
npx wrangler secret put ELEVENLABS_API_KEY

# Set the voice ID in wrangler.toml (not sensitive)
# [vars]
# ELEVENLABS_VOICE_ID = "your-voice-id-here"

# Deploy
npx wrangler deploy
```

Copy the Worker URL it gives you (e.g. `https://your-worker-name.your-subdomain.workers.dev`).

### 2. Run the Worker Locally (for development)

```bash
cd worker
npx wrangler dev
```

Create `worker/.dev.vars` with your keys:

```
ANTHROPIC_API_KEY=sk-ant-...
ASSEMBLYAI_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
```

Update proxy URLs in Swift code to `http://localhost:8787` while developing. Find them with:

```bash
grep -r "clicky-proxy" leanring-buddy/
```

Locations: `CompanionManager.swift` (Claude chat + TTS), `AssemblyAIStreamingTranscriptionProvider.swift` (token endpoint).

### 3. Open in Xcode and Run

```bash
open leanring-buddy.xcodeproj
```

In Xcode:
1. Select the `leanring-buddy` scheme
2. Set your signing team under Signing & Capabilities
3. **Cmd+R** to build and run

The app appears in your menu bar (not the dock). Click the icon, grant permissions, and you're set.

**Do NOT run `xcodebuild` from the terminal** -- it invalidates TCC permissions and the app will need to re-request screen recording, accessibility, etc.

### Required Permissions

| Permission | Reason |
|-----------|--------|
| Microphone | Push-to-talk voice capture |
| Accessibility | Global keyboard shortcut (Ctrl+Option) |
| Screen Recording | Taking screenshots on hotkey press |
| Screen Content | ScreenCaptureKit access |

## Release Pipeline

The release script automates the full pipeline:

```bash
# Auto-bumps version from latest GitHub Release
./scripts/release.sh

# Or set specific version
./scripts/release.sh 2.0
./scripts/release.sh 2.0 10  # version + build number
```

Pipeline: Archive -> Sign -> DMG -> Notarize -> Sparkle appcast -> GitHub Release

### Release Prerequisites (one-time)

- Xcode with Developer ID signing certificate
- `brew install create-dmg gh`
- `gh auth login`
- Apple notarization credentials in Keychain:
  ```bash
  xcrun notarytool store-credentials "AC_PASSWORD" \
      --apple-id YOUR_APPLE_ID \
      --team-id YOUR_TEAM_ID
  ```
- Sparkle EdDSA key in Keychain
- Build project in Xcode once (for SPM to download Sparkle)

## Code Style

- **Clarity over concision** -- longer names are fine if they improve readability
- **SwiftUI first**, AppKit only when required (`NSPanel`, floating windows)
- **`@MainActor` isolation** for all UI state
- **async/await** for all async operations
- Comments explain "why" not "what"
- All buttons show pointer cursor on hover
- Do NOT rename the project directory (the "leanring" typo is intentional/legacy)

## Contributing

PRs welcome. If you're using Claude Code, point it at `CLAUDE.md` and it'll understand the full codebase.

## License

MIT License -- see [LICENSE](LICENSE).

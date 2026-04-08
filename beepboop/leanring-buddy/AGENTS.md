# AGENTS.md - leanring-buddy (Beep Boop Clawd -- Main App Target)

macOS menu bar companion app built with SwiftUI. Push-to-talk voice pipeline with Claude vision, multi-screen capture, streaming AI responses, and a lobster claw overlay that points at UI elements.

## Architecture

```
leanring_buddyApp (entry)
    |
    +-- CompanionManager (central state machine)
    |       |
    |       +-- BuddyDictationManager (audio capture + transcription)
    |       |       |
    |       |       +-- BuddyTranscriptionProvider (protocol)
    |       |       |       +-- AssemblyAIStreamingTranscriptionProvider (WebSocket STT)
    |       |       |       +-- OpenAIAudioTranscriptionProvider (Whisper STT)
    |       |       |       +-- AppleSpeechTranscriptionProvider (on-device fallback)
    |       |       |
    |       |       +-- GlobalPushToTalkShortcutMonitor (global hotkey)
    |       |       +-- BuddyPCM16AudioConverter (format conversion)
    |       |
    |       +-- ClaudeAPI (streaming Claude vision)
    |       +-- OpenAIAPI (GPT-4o alternative)
    |       +-- ElevenLabsTTSClient (voice output)
    |       +-- CompanionScreenCaptureUtility (multi-display capture)
    |       +-- ElementLocationDetector (UI element parsing from AI response)
    |       +-- CompanionResponseOverlayManager (cursor-following response)
    |
    +-- MenuBarPanelManager (NSPanel menu bar popover)
    |       +-- CompanionPanelView (settings, model picker, permissions)
    |
    +-- FloatingSessionButtonManager (lobster claw NSPanel)
    |       +-- FloatingButtonView (gradient circle, hover animation)
    |
    +-- WindowPositionManager (multi-display window positioning)
    +-- OverlayWindow (lobster claw pointer overlay)
    +-- DesignSystem (colors, button styles, typography)
    +-- ClickyAnalytics (PostHog event tracking)
    +-- AppBundleConfiguration (Info.plist key reader)
```

## Source Files

### leanring_buddyApp.swift
- Entry point; `@main` App struct
- Owns `FloatingSessionButtonManager` as `@StateObject`
- Owns `CompanionManager` as `@StateObject`
- Injects both into ContentView via `.environmentObject()`
- Configures PostHog analytics on launch

### CompanionManager.swift
- `CompanionManager` -- `@MainActor` class, central state machine (~1026 lines)
- `CompanionVoiceState` -- enum: `.idle`, `.listening`, `.processing`, `.responding`
- `@Published voiceState` -- current pipeline phase
- `@Published lastTranscript` -- most recent voice transcription
- `@Published currentAudioPowerLevel` -- real-time mic level for UI meters
- `@Published hasAccessibilityPermission` / `hasScreenRecordingPermission` / `hasMicrophonePermission` / `hasScreenContentPermission` -- permission tracking
- `@Published detectedElementScreenLocation` -- parsed from Claude response, drives claw flight animation
- `@Published detectedElementDisplayFrame` -- which display the detected element is on
- Owns `BuddyDictationManager`, `ClaudeAPI`, `ElevenLabsTTSClient`, `CompanionResponseOverlayManager`
- `startListening()` -- begins push-to-talk capture pipeline
- `stopListening()` -- finalizes transcript, triggers screen capture + Claude call
- Voice flow: mic capture -> transcription -> screenshot -> Claude vision -> TTS -> overlay

### CompanionPanelView.swift
- SwiftUI view hosted inside the menu bar panel (~761 lines)
- Dark rounded panel design (Loom-style recording panel aesthetic)
- Shows voice status, push-to-talk shortcut display, model picker
- Permission onboarding flow (mic, screen recording, accessibility)
- `@ObservedObject companionManager` -- reads state from CompanionManager

### CompanionResponseOverlay.swift
- `CompanionResponseOverlayViewModel` -- `@MainActor` ObservableObject with streaming text + visibility
- `CompanionResponseOverlayManager` -- manages a non-activating `NSPanel` that follows the cursor
- Cursor-tracking timer repositions overlay near mouse each frame
- Auto-hide after response completes (configurable delay)
- Panel floats above all apps without stealing focus

### CompanionScreenCaptureUtility.swift
- `CompanionScreenCapture` -- struct: `imageData`, `label`, `isCursorScreen`, display dimensions, `displayFrame`
- `CompanionScreenCaptureUtility` -- `@MainActor` enum with static capture methods
- `captureAllScreensAsJPEG()` -- captures all connected displays, labels which has the cursor
- Excludes app's own windows from capture so AI sees the user's actual screen
- Uses ScreenCaptureKit (`SCShareableContent`, `SCScreenshotManager`)

### FloatingSessionButton.swift
- `FloatingSessionButtonManager` -- `@MainActor` class managing the lobster claw `NSPanel` lifecycle
  - `showFloatingButton()` -- creates/shows the panel in top-right of primary screen
  - `hideFloatingButton()` -- hides panel (keeps it alive for quick re-show)
  - `destroyFloatingButton()` -- removes panel permanently (session ended)
  - `onFloatingButtonClicked` -- callback closure, set by ContentView to bring main window to front
  - `floatingButtonPanel` -- exposed `NSPanel` reference for screenshot exclusion
- `FloatingButtonView` -- private SwiftUI view with lobster gradient circle, scale+glow hover animation, pointer cursor

### ContentView.swift
- Receives `FloatingSessionButtonManager` via `@EnvironmentObject`
- `isMainWindowCurrentlyFocused` -- tracks main window focus state
- `configureFloatingButtonManager()` -- wires up the click callback
- `startObservingMainWindowFocusChanges()` -- sets up `NSWindow` notification observers
- `updateFloatingButtonVisibility()` -- core logic: show if running + not focused, hide otherwise
- `bringMainWindowToFront()` -- activates app and orders main window front

### ScreenshotManager.swift
- `floatingButtonWindowToExcludeFromCaptures` -- `NSWindow?` reference set by ContentView
- `captureScreen()` -- matches the floating window to an `SCWindow` and excludes it from capture filter

### MenuBarPanelManager.swift
- Manages the NSPanel that appears when clicking the menu bar icon (~243 lines)
- Non-activating panel that doesn't steal focus from other apps
- Handles show/hide toggling and click-outside-to-dismiss

### OverlayWindow.swift
- Full-screen transparent overlay hosting the lobster claw, response text, waveform (~881 lines)
- Non-activating transparent `NSPanel` layered above all other windows
- Flight animation from current position to `detectedElementScreenLocation`
- Claw pinch/open animation on arrival
- Joins all Spaces, never steals focus

### WindowPositionManager.swift
- Multi-display window positioning logic (~262 lines)
- Calculates optimal panel placement across screen boundaries
- Handles display arrangement changes
- Screen Recording permission flow

---

## Voice Pipeline

### BuddyDictationManager.swift
- Push-to-talk dictation manager (~866 lines)
- `AVAudioEngine` capture pipeline: system mic -> tap -> PCM buffer -> transcription provider
- `BuddyPushToTalkShortcut` -- enum with 5 shortcut options:
  - `shiftFunction` (shift + fn)
  - `controlOption` (ctrl + option) -- default
  - `shiftControl` (shift + control)
  - `controlOptionSpace` (ctrl + option + space)
  - `shiftControlSpace` (shift + control + space)
- Handles audio session lifecycle, mic permissions, and format negotiation
- Routes final transcript back to CompanionManager for Claude API call

### BuddyTranscriptionProvider.swift
- `BuddyStreamingTranscriptionSession` protocol:
  - `finalTranscriptFallbackDelaySeconds` -- timeout for final transcript
  - `appendAudioBuffer(_:)` -- feed PCM audio
  - `requestFinalTranscript()` -- trigger finalization
  - `cancel()` -- abort session
- `BuddyTranscriptionProvider` protocol:
  - `displayName`, `requiresSpeechRecognitionPermission`, `isConfigured`, `unavailableExplanation`
  - `startStreamingSession(keyterms:onTranscriptUpdate:onFinalTranscriptReady:onError:)`
- `BuddyTranscriptionProviderFactory` -- resolves provider preference order: AssemblyAI > OpenAI > Apple Speech

### AssemblyAIStreamingTranscriptionProvider.swift
- WebSocket-based streaming STT via AssemblyAI (~478 lines)
- Token proxy through Cloudflare Worker (`beepboop-clawd-gateway.x402.workers.dev/transcribe-token`)
- Real API key never leaves the server
- Shared `URLSession` to avoid TLS connection pool corruption on rapid reconnects
- Uses `u3-rt-pro` model for real-time transcription

### OpenAIAudioTranscriptionProvider.swift
- Whisper-based transcription via OpenAI API (~317 lines)
- Upload-based transcription fallback for users with OpenAI keys

### AppleSpeechTranscriptionProvider.swift
- On-device fallback using Apple's `Speech` framework (`SFSpeechRecognizer`) (~147 lines)
- No API key required; works offline
- Uses best available speech recognizer for the system locale

### BuddyAudioConversionSupport.swift
- `BuddyPCM16AudioConverter` -- converts `AVAudioPCMBuffer` to PCM16 `Data` (~108 lines)
- Handles sample rate conversion and format bridging between mic input and transcription providers
- Lazy converter re-creation when input format changes

### GlobalPushToTalkShortcutMonitor.swift
- System-wide keyboard shortcut monitoring via `CGEvent` tap (~132 lines)
- Listen-only tap (not AppKit global monitor) for reliable modifier-based shortcut detection
- Detects configured push-to-talk key combinations regardless of focused app
- Requires Accessibility permission

---

## AI Providers

### ClaudeAPI.swift
- `ClaudeAPI` -- streaming Claude API client with vision support (~291 lines)
- Proxy-based architecture: requests go through Clawd Gateway Worker, API key stays server-side
- TLS connection warmup on init (HEAD request) to avoid cold-handshake errors with large image payloads
- `URLSessionConfiguration.default` with cached TLS sessions (not `.ephemeral`)
- Model default: `claude-sonnet-4-6`
- Streaming SSE parsing for progressive text display

### OpenAIAPI.swift
- `OpenAIAPI` -- GPT-4o alternative to Claude (~142 lines)
- Same proxy architecture and streaming pattern
- Used when user selects GPT-4o in the model picker

### ElevenLabsTTSClient.swift
- Text-to-speech output via ElevenLabs API (~81 lines)
- Routes through Clawd Gateway `/tts` endpoint
- Streams audio chunks for low-latency voice response
- Uses `eleven_flash_v2_5` model
- Voice selection configurable via `ELEVENLABS_VOICE_ID` worker var

---

## UI & Design

### DesignSystem.swift
- `DS` namespace with centralized design tokens (~880 lines)
- Lobster red/orange accent palette on dark surfaces
- `DS.Colors` -- border, background, accent, text colors
- `DS.ButtonStyles` -- unified button style system with hover/press states
- Claw-themed cursor and interaction states
- Single source of truth for all visual styling

### ElementLocationDetector.swift
- Parses Claude's `[CLAW:x,y:label:screenN]` tags from response text (~335 lines)
- Maps coordinates to correct monitor in multi-display setups
- Feeds `detectedElementScreenLocation` + `detectedElementDisplayFrame` to trigger claw flight animation

---

## Analytics & Configuration

### ClickyAnalytics.swift
- `ClickyAnalytics` -- centralized PostHog analytics wrapper (~121 lines)
- `configure()` -- reads API key from `AppBundleConfiguration`
- `trackAppOpened()` -- fired once per launch with app version
- All event names and properties defined in one enum for audit consistency

### AppBundleConfiguration.swift
- `AppBundleConfiguration` -- enum with static helpers for reading `Info.plist` keys (~28 lines)
- `stringValue(forKey:)` -- reads from `Bundle.main` with fallback to resource Info.plist
- Used for API keys, PostHog host, feature flags

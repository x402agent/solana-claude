"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

type VoiceState = "idle" | "connecting" | "connected" | "speaking" | "error";
type Provider = "elevenlabs" | "grok";

const EL_VOICES: Array<{ id: string; name: string; desc: string }> = [
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", desc: "Laid-back, casual" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", desc: "Confident, mature" },
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River", desc: "Relaxed, neutral" },
  { id: "bIHbv24MWmeRgasZH58o", name: "Will", desc: "Relaxed optimist" },
];

const GROK_VOICES: Array<{ id: string; name: string; desc: string }> = [
  { id: "rex", name: "Rex", desc: "Confident, professional" },
  { id: "eve", name: "Eve", desc: "Energetic, upbeat" },
  { id: "ara", name: "Ara", desc: "Warm, friendly" },
  { id: "sal", name: "Sal", desc: "Smooth, balanced" },
  { id: "leo", name: "Leo", desc: "Authoritative, strong" },
];

const QUICK_PHRASES = [
  "GM! Let's check what's pumping on Solana today.",
  "Scan this wallet for recent trades and PnL.",
  "What's the floor price on Mad Lads right now?",
  "Give me a risk assessment on this new pump.fun token.",
  "How's the SOL/USDC liquidity looking on Jupiter?",
];

const SOLANA_SYSTEM_PROMPT = "You are Grok, powered by xAI, serving as a Solana blockchain assistant inside the Clawd trading platform. You specialize in Solana token analysis, DeFi protocols (Jupiter, Raydium, pump.fun), memecoin scouting, wallet analysis, and on-chain data. Personality: Sharp, direct, slightly irreverent with crypto/degen slang. Bullish on Solana but realistic about risks. Never give financial advice — frame as analysis. Keep responses concise and punchy for voice conversation.";

function stopMediaTracks(stream: MediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

function getStatusLabel(state: VoiceState): string {
  switch (state) {
    case "idle": return "Offline";
    case "connecting": return "Connecting...";
    case "connected": return "Live";
    case "speaking": return "Speaking";
    case "error": return "Error";
  }
}

function pcm16ToFloat32(base64Audio: string): Float32Array | null {
  try {
    const bin = atob(base64Audio);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
    return float32;
  } catch {
    return null;
  }
}

function float32ToBase64PCM16(float32: Float32Array): string {
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ── Spinner SVG ─────────────────────────────────────────
function Spinner({ label }: { label: string }) {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" role="img" aria-label={label}>
      <title>{label}</title>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function VoicePage() {
  // ── Provider state ────────────────────────────────────
  const [provider, setProvider] = useState<Provider>("elevenlabs");
  const voices = provider === "grok" ? GROK_VOICES : EL_VOICES;

  // ── TTS state ─────────────────────────────────────────
  const [ttsText, setTtsText] = useState("");
  const [ttsVoice, setTtsVoice] = useState(voices[0].id);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);

  // ── Agent state ───────────────────────────────────────
  const [agentState, setAgentState] = useState<VoiceState>("idle");
  const [agentTranscript, setAgentTranscript] = useState<Array<{ role: string; text: string; id: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const msgCounter = useRef(0);

  // Reset voice selection when switching provider
  useEffect(() => {
    const list = provider === "grok" ? GROK_VOICES : EL_VOICES;
    setTtsVoice(list[0].id);
  }, [provider]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const cleanupMedia = useCallback(() => {
    stopMediaTracks(mediaStreamRef.current);
    mediaStreamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  const disconnectAgent = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    cleanupMedia();
    setAgentState("idle");
  }, [cleanupMedia]);

  useEffect(() => {
    const url = ttsAudioUrl;
    return () => {
      disconnectAgent();
      if (url) URL.revokeObjectURL(url);
    };
  }, [disconnectAgent, ttsAudioUrl]);

  // ── Play PCM audio chunk ──────────────────────────────
  const playPcmChunk = useCallback((base64: string, sampleRate: number) => {
    const float32 = pcm16ToFloat32(base64);
    if (!float32) return;
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, float32.length, sampleRate);
    buffer.getChannelData(0).set(float32);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  }, []);

  // ── TTS ───────────────────────────────────────────────
  const handleTTS = useCallback(async () => {
    if (!ttsText.trim() || ttsLoading) return;
    setTtsLoading(true);
    setError(null);

    const endpoint = provider === "grok" ? "/api/voice/grok-tts" : "/api/voice/tts";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ttsText.trim(), voiceId: ttsVoice }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "TTS failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      if (ttsAudioUrl) URL.revokeObjectURL(ttsAudioUrl);
      const url = URL.createObjectURL(blob);
      setTtsAudioUrl(url);
      setTimeout(() => audioRef.current?.play(), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "TTS failed");
    } finally {
      setTtsLoading(false);
    }
  }, [ttsText, ttsVoice, ttsLoading, ttsAudioUrl, provider]);

  // ── Connect ElevenLabs Agent ──────────────────────────
  const connectElevenLabs = useCallback(async () => {
    const res = await fetch("/api/voice/agent");
    if (!res.ok) throw new Error("Failed to get ElevenLabs agent config");
    const { signedUrl } = await res.json();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    const ws = new WebSocket(signedUrl);
    wsRef.current = ws;

    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    ws.onopen = () => {
      setAgentState("connected");
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const input = event.inputBuffer.getChannelData(0);
        const base64 = float32ToBase64PCM16(new Float32Array(input));
        ws.send(JSON.stringify({ user_audio_chunk: base64 }));
      };
      source.connect(processor);
      processor.connect(audioContext.destination);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "agent_response") {
          msgCounter.current += 1;
          setAgentTranscript((prev) => [...prev, { role: "agent", text: msg.agent_response_event?.agent_response ?? "", id: `msg-${String(msgCounter.current)}` }]);
        } else if (msg.type === "user_transcript") {
          msgCounter.current += 1;
          setAgentTranscript((prev) => [...prev, { role: "user", text: msg.user_transcription_event?.user_transcript ?? "", id: `msg-${String(msgCounter.current)}` }]);
        } else if (msg.type === "audio" && msg.audio_event?.audio_base_64) {
          playPcmChunk(msg.audio_event.audio_base_64, 16000);
        }
      } catch { /* ignore */ }
    };

    ws.onerror = () => { setError("ElevenLabs connection error"); setAgentState("error"); };
    ws.onclose = () => { setAgentState("idle"); cleanupMedia(); };
  }, [cleanupMedia, playPcmChunk]);

  // ── Connect Grok Agent ────────────────────────────────
  const connectGrok = useCallback(async () => {
    const res = await fetch("/api/voice/grok");
    if (!res.ok) throw new Error("Failed to get Grok session");
    const { clientSecret } = await res.json();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    // Connect with ephemeral token via sec-websocket-protocol
    const ws = new WebSocket("wss://api.x.ai/v1/realtime", [`xai-client-secret.${clientSecret}`]);
    wsRef.current = ws;

    const audioContext = new AudioContext({ sampleRate: 24000 });
    audioContextRef.current = audioContext;

    ws.onopen = () => {
      // Configure Grok session
      ws.send(JSON.stringify({
        type: "session.update",
        session: {
          voice: "rex",
          instructions: SOLANA_SYSTEM_PROMPT,
          turn_detection: { type: "server_vad" },
          tools: [{ type: "web_search" }],
          audio: {
            input: { format: { type: "audio/pcm", rate: 24000 } },
            output: { format: { type: "audio/pcm", rate: 24000 } },
          },
        },
      }));

      setAgentState("connected");

      // Start sending mic audio
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const input = event.inputBuffer.getChannelData(0);
        const base64 = float32ToBase64PCM16(new Float32Array(input));
        ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: base64 }));
      };
      source.connect(processor);
      processor.connect(audioContext.destination);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "response.output_audio.delta" && msg.delta) {
          playPcmChunk(msg.delta, 24000);
        } else if (msg.type === "response.output_audio_transcript.done" && msg.transcript) {
          msgCounter.current += 1;
          setAgentTranscript((prev) => [...prev, { role: "agent", text: msg.transcript, id: `msg-${String(msgCounter.current)}` }]);
        } else if (msg.type === "conversation.item.input_audio_transcription.completed" && msg.transcript) {
          msgCounter.current += 1;
          setAgentTranscript((prev) => [...prev, { role: "user", text: msg.transcript, id: `msg-${String(msgCounter.current)}` }]);
        } else if (msg.type === "error") {
          setError(msg.error?.message ?? "Grok error");
        }
      } catch { /* ignore */ }
    };

    ws.onerror = () => { setError("Grok connection error"); setAgentState("error"); };
    ws.onclose = () => { setAgentState("idle"); cleanupMedia(); };
  }, [cleanupMedia, playPcmChunk]);

  // ── Connect (dispatches to provider) ──────────────────
  const connectAgent = useCallback(async () => {
    setAgentState("connecting");
    setError(null);
    setAgentTranscript([]);
    try {
      if (provider === "grok") {
        await connectGrok();
      } else {
        await connectElevenLabs();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setAgentState("error");
      cleanupMedia();
    }
  }, [provider, connectGrok, connectElevenLabs, cleanupMedia]);

  const isAgentActive = agentState === "connected" || agentState === "speaking";
  const providerColor = provider === "grok" ? "text-red-400" : "text-[var(--color-accent)]";
  const providerLabel = provider === "grok" ? "Grok" : "Clawd";

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
              &larr; Back
            </Link>
            <div className="h-4 w-px bg-[var(--color-border)]" />
            <h1 className="text-lg font-semibold">
              <span className={providerColor}>{providerLabel}</span> Voice
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Provider toggle */}
            <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => { if (!isAgentActive) setProvider("elevenlabs"); }}
                disabled={isAgentActive}
                className={`px-3 py-1.5 transition-colors ${provider === "elevenlabs" ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"} disabled:opacity-50`}
              >
                ElevenLabs
              </button>
              <button
                type="button"
                onClick={() => { if (!isAgentActive) setProvider("grok"); }}
                disabled={isAgentActive}
                className={`px-3 py-1.5 transition-colors ${provider === "grok" ? "bg-red-500/20 text-red-400" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"} disabled:opacity-50`}
              >
                Grok
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${isAgentActive ? "bg-[var(--color-success)] animate-pulse" : "bg-[var(--color-text-muted)]"}`} />
              <span className="text-xs text-[var(--color-text-muted)]">{getStatusLabel(agentState)}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error-bg)] px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
            <button type="button" onClick={() => setError(null)} className="ml-2 opacity-60 hover:opacity-100">&times;</button>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* ── Voice Agent Panel ──────────────────────────── */}
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${provider === "grok" ? "bg-red-500/10" : "bg-[var(--color-accent)]/10"}`}>
                <svg className={`h-5 w-5 ${provider === "grok" ? "text-red-400" : "text-[var(--color-accent)]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} role="img" aria-label="Microphone">
                  <title>Microphone</title>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold">Voice Agent</h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {provider === "grok" ? "Talk to Grok about Solana (with web search)" : "Talk to Clawd about Solana"}
                </p>
              </div>
            </div>

            {/* Orb */}
            <div className="mb-6 flex justify-center">
              <div className={`relative flex h-32 w-32 items-center justify-center rounded-full transition-all duration-500 ${
                isAgentActive
                  ? provider === "grok"
                    ? "bg-gradient-to-br from-red-500 to-red-900 shadow-[0_0_60px_rgba(239,68,68,0.4)]"
                    : "bg-gradient-to-br from-[var(--color-accent)] to-purple-900 shadow-[0_0_60px_rgba(139,92,246,0.4)]"
                  : "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
              }`}>
                {isAgentActive && (
                  <>
                    <div className={`absolute inset-0 rounded-full animate-ping ${provider === "grok" ? "bg-red-500/20" : "bg-[var(--color-accent)]/20"}`} />
                    <div className={`absolute inset-2 rounded-full animate-pulse ${provider === "grok" ? "bg-red-500/10" : "bg-[var(--color-accent)]/10"}`} />
                  </>
                )}
                <svg className={`h-12 w-12 transition-colors ${isAgentActive ? "text-white" : "text-[var(--color-text-muted)]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} role="img" aria-label="Voice orb">
                  <title>Voice orb</title>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>

            <Button
              onClick={isAgentActive ? disconnectAgent : connectAgent}
              disabled={agentState === "connecting"}
              variant={isAgentActive ? "destructive" : "default"}
              className="w-full"
            >
              {agentState === "connecting" ? (
                <span className="flex items-center gap-2"><Spinner label="Loading" /> Connecting...</span>
              ) : isAgentActive ? "End Conversation" : `Start Talking to ${providerLabel}`}
            </Button>

            {/* Transcript */}
            {agentTranscript.length > 0 && (
              <div className="mt-4 max-h-64 overflow-y-auto rounded-lg bg-[var(--color-bg-primary)] p-3 space-y-2">
                {agentTranscript.map((msg) => (
                  <div key={msg.id} className={`text-sm ${msg.role === "agent" ? providerColor : "text-[var(--color-text-secondary)]"}`}>
                    <span className="font-mono text-xs opacity-60">{msg.role === "agent" ? providerLabel.toLowerCase() : "you"}: </span>
                    {msg.text}
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </section>

          {/* ── Text-to-Speech Panel ──────────────────────── */}
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-success)]/10">
                <svg className="h-5 w-5 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} role="img" aria-label="Speaker">
                  <title>Speaker</title>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold">Text to Speech</h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {provider === "grok" ? "Grok TTS with expressive speech tags" : "ElevenLabs TTS"}
                </p>
              </div>
            </div>

            {/* Voice selector */}
            <fieldset className="mb-4">
              <legend className="mb-1.5 block text-xs text-[var(--color-text-muted)]">Voice</legend>
              <div className="grid grid-cols-2 gap-2">
                {voices.map((v) => (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => setTtsVoice(v.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                      ttsVoice === v.id
                        ? provider === "grok"
                          ? "border-red-500 bg-red-500/10 text-red-400"
                          : "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-hover)] text-[var(--color-text-secondary)]"
                    }`}
                  >
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs opacity-60">{v.desc}</div>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Text input */}
            <div className="mb-4">
              <label htmlFor="tts-text" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">Text</label>
              <textarea
                id="tts-text"
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder={provider === "grok" ? "Try: Hello! [pause] Let me check what's <emphasis>pumping</emphasis> on Solana." : "Type something for Clawd to say..."}
                rows={4}
                maxLength={5000}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
              <div className="mt-1 text-right text-xs text-[var(--color-text-muted)]">
                {ttsText.length}/5000
              </div>
            </div>

            <Button onClick={handleTTS} disabled={!ttsText.trim() || ttsLoading} className="w-full">
              {ttsLoading ? (
                <span className="flex items-center gap-2"><Spinner label="Generating" /> Generating...</span>
              ) : `Generate with ${provider === "grok" ? "Grok" : "ElevenLabs"}`}
            </Button>

            {ttsAudioUrl && (
              <div className="mt-4 rounded-lg bg-[var(--color-bg-primary)] p-3">
                <audio ref={audioRef} src={ttsAudioUrl} controls className="w-full h-10">
                  <track kind="captions" />
                </audio>
              </div>
            )}
          </section>
        </div>

        {/* ── Quick Phrases ───────────────────────────────── */}
        <section className="mt-8">
          <h3 className="mb-3 text-sm font-medium text-[var(--color-text-muted)]">Quick phrases</h3>
          <div className="flex flex-wrap gap-2">
            {QUICK_PHRASES.map((phrase) => (
              <button
                type="button"
                key={phrase}
                onClick={() => setTtsText(phrase)}
                className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                {phrase}
              </button>
            ))}
          </div>
        </section>

        {/* ── Grok speech tags hint ──────────────────────── */}
        {provider === "grok" && (
          <section className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <h3 className="mb-2 text-sm font-medium text-red-400">Grok Speech Tags</h3>
            <div className="grid gap-3 text-xs text-[var(--color-text-muted)] sm:grid-cols-2">
              <div>
                <div className="font-medium text-[var(--color-text-secondary)] mb-1">Inline</div>
                <code className="text-red-300">[pause] [laugh] [sigh] [whisper] [breath]</code>
              </div>
              <div>
                <div className="font-medium text-[var(--color-text-secondary)] mb-1">Wrapping</div>
                <code className="text-red-300">&lt;emphasis&gt; &lt;whisper&gt; &lt;slow&gt; &lt;loud&gt; &lt;singing&gt;</code>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

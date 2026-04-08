"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

type VoiceState = "idle" | "connecting" | "connected" | "speaking" | "error";

const VOICES = [
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", desc: "Laid-back, casual" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", desc: "Confident, mature" },
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River", desc: "Relaxed, neutral" },
  { id: "bIHbv24MWmeRgasZH58o", name: "Will", desc: "Relaxed optimist" },
] as const;

export default function VoicePage() {
  const [ttsText, setTtsText] = useState("");
  const [ttsVoice, setTtsVoice] = useState(VOICES[0].id);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [agentState, setAgentState] = useState<VoiceState>("idle");
  const [agentTranscript, setAgentTranscript] = useState<Array<{ role: string; text: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectAgent();
      if (ttsAudioUrl) URL.revokeObjectURL(ttsAudioUrl);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── TTS ──────────────────────────────────────────────────
  const handleTTS = useCallback(async () => {
    if (!ttsText.trim() || ttsLoading) return;
    setTtsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/voice/tts", {
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

      // Auto-play
      setTimeout(() => audioRef.current?.play(), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "TTS failed");
    } finally {
      setTtsLoading(false);
    }
  }, [ttsText, ttsVoice, ttsLoading, ttsAudioUrl]);

  // ── Conversational Agent ─────────────────────────────────
  const connectAgent = useCallback(async () => {
    setAgentState("connecting");
    setError(null);
    setAgentTranscript([]);

    try {
      // Get signed URL from our API
      const res = await fetch("/api/voice/agent");
      if (!res.ok) throw new Error("Failed to get agent config");
      const { signedUrl } = await res.json();

      // Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Set up WebSocket to ElevenLabs Conversational AI
      const ws = new WebSocket(signedUrl);
      wsRef.current = ws;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      ws.onopen = () => {
        setAgentState("connected");

        // Start sending audio from mic
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (event) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = event.inputBuffer.getChannelData(0);
          // Convert Float32 to Int16 PCM
          const pcm = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm.buffer)));
          ws.send(JSON.stringify({ user_audio_chunk: base64 }));
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "agent_response") {
            setAgentTranscript((prev) => [...prev, { role: "agent", text: msg.agent_response_event?.agent_response ?? "" }]);
          } else if (msg.type === "user_transcript") {
            setAgentTranscript((prev) => [...prev, { role: "user", text: msg.user_transcription_event?.user_transcript ?? "" }]);
          } else if (msg.type === "audio") {
            // Play agent audio response
            if (msg.audio_event?.audio_base_64) {
              playAudioChunk(msg.audio_event.audio_base_64);
            }
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        setError("Voice agent connection error");
        setAgentState("error");
      };

      ws.onclose = () => {
        setAgentState("idle");
        cleanup();
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setAgentState("error");
      cleanup();
    }
  }, []);

  const playAudioChunk = (base64Audio: string) => {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const ctx = audioContextRef.current;
      if (!ctx) return;

      // PCM 16-bit to Float32
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const buffer = ctx.createBuffer(1, float32.length, 16000);
      buffer.getChannelData(0).set(float32);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch {
      // ignore audio decode errors
    }
  };

  const cleanup = () => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
  };

  const disconnectAgent = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    cleanup();
    setAgentState("idle");
  }, []);

  const isAgentActive = agentState === "connected" || agentState === "speaking";

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
              <span className="text-[var(--color-accent)]">Clawd</span> Voice
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${
              isAgentActive ? "bg-[var(--color-success)] animate-pulse" : "bg-[var(--color-text-muted)]"
            }`} />
            <span className="text-xs text-[var(--color-text-muted)]">
              {agentState === "idle" ? "Offline" : agentState === "connecting" ? "Connecting..." : agentState === "connected" ? "Live" : agentState === "speaking" ? "Speaking" : "Error"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error-bg)] px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
            <button onClick={() => setError(null)} className="ml-2 opacity-60 hover:opacity-100">&times;</button>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* ── Voice Agent Panel ──────────────────────────── */}
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent)]/10">
                <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold">Voice Agent</h2>
                <p className="text-xs text-[var(--color-text-muted)]">Talk to Clawd about Solana</p>
              </div>
            </div>

            {/* Orb visualization */}
            <div className="mb-6 flex justify-center">
              <div className={`relative flex h-32 w-32 items-center justify-center rounded-full transition-all duration-500 ${
                isAgentActive
                  ? "bg-gradient-to-br from-[var(--color-accent)] to-purple-900 shadow-[0_0_60px_rgba(139,92,246,0.4)]"
                  : "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
              }`}>
                {isAgentActive && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-[var(--color-accent)]/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full bg-[var(--color-accent)]/10 animate-pulse" />
                  </>
                )}
                <svg className={`h-12 w-12 transition-colors ${isAgentActive ? "text-white" : "text-[var(--color-text-muted)]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Connecting...
                </span>
              ) : isAgentActive ? "End Conversation" : "Start Talking to Clawd"}
            </Button>

            {/* Transcript */}
            {agentTranscript.length > 0 && (
              <div className="mt-4 max-h-64 overflow-y-auto rounded-lg bg-[var(--color-bg-primary)] p-3 space-y-2">
                {agentTranscript.map((msg, i) => (
                  <div key={i} className={`text-sm ${msg.role === "agent" ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]"}`}>
                    <span className="font-mono text-xs opacity-60">{msg.role === "agent" ? "clawd" : "you"}: </span>
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
                <svg className="h-5 w-5 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold">Text to Speech</h2>
                <p className="text-xs text-[var(--color-text-muted)]">Generate Clawd voice from text</p>
              </div>
            </div>

            {/* Voice selector */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs text-[var(--color-text-muted)]">Voice</label>
              <div className="grid grid-cols-2 gap-2">
                {VOICES.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setTtsVoice(v.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                      ttsVoice === v.id
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-hover)] text-[var(--color-text-secondary)]"
                    }`}
                  >
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs opacity-60">{v.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Text input */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs text-[var(--color-text-muted)]">Text</label>
              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="Type something for Clawd to say..."
                rows={4}
                maxLength={5000}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
              <div className="mt-1 text-right text-xs text-[var(--color-text-muted)]">
                {ttsText.length}/5000
              </div>
            </div>

            <Button
              onClick={handleTTS}
              disabled={!ttsText.trim() || ttsLoading}
              className="w-full"
            >
              {ttsLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Generating...
                </span>
              ) : "Generate Speech"}
            </Button>

            {/* Audio player */}
            {ttsAudioUrl && (
              <div className="mt-4 rounded-lg bg-[var(--color-bg-primary)] p-3">
                <audio ref={audioRef} src={ttsAudioUrl} controls className="w-full h-10" />
              </div>
            )}
          </section>
        </div>

        {/* ── Quick Phrases ───────────────────────────────── */}
        <section className="mt-8">
          <h3 className="mb-3 text-sm font-medium text-[var(--color-text-muted)]">Quick phrases</h3>
          <div className="flex flex-wrap gap-2">
            {[
              "GM! Let's check what's pumping on Solana today.",
              "Scan this wallet for recent trades and PnL.",
              "What's the floor price on Mad Lads right now?",
              "Give me a risk assessment on this new pump.fun token.",
              "How's the SOL/USDC liquidity looking on Jupiter?",
            ].map((phrase) => (
              <button
                key={phrase}
                onClick={() => setTtsText(phrase)}
                className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                {phrase}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Mail, Mic, Phone, RefreshCcw, Send, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";

type ProvisionResponse = {
  holderInboxId: string;
  supportInboxId: string;
  communications: {
    supportInboxId: string;
    agentNumber: string;
    voiceAgentId: string;
    voicePath: string;
  };
};

type HolderMessage = {
  message_id: string;
  subject?: string;
  from?: string;
  extracted_text?: string;
  text?: string;
  created_at?: string;
};

export function ClawdCommsPanel(props: {
  agentNumber: string;
  supportEmail: string;
  voicePath: string;
}) {
  const [holderEmail, setHolderEmail] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [focus, setFocus] = useState("$CLAWD market structure, dSolana thesis tracking, and Solana execution planning");
  const [holderInboxId, setHolderInboxId] = useState("");
  const [supportInboxId, setSupportInboxId] = useState(props.supportEmail);
  const [subject, setSubject] = useState("Need a $CLAWD market brief");
  const [message, setMessage] = useState(
    "GM. I want a Solana market brief focused on $CLAWD holder flows, wallet clustering, and any autonomous trade ideas that still respect permission gates."
  );
  const [timeline, setTimeline] = useState<HolderMessage[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState<"provision" | "send" | "refresh" | "">("");

  const canProvision = useMemo(
    () => Boolean(holderEmail.trim() && walletAddress.trim()),
    [holderEmail, walletAddress]
  );

  async function provisionHolderInbox() {
    if (!canProvision) return;
    setLoading("provision");
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/agentmail/holders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holderEmail, walletAddress, displayName, focus }),
      });

      const data = (await response.json()) as ProvisionResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to provision holder inbox.");
      }

      setHolderInboxId(data.holderInboxId);
      setSupportInboxId(data.supportInboxId);
      setNotice(`Holder inbox ready: ${data.holderInboxId}. Welcome email sent to ${holderEmail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to provision holder inbox.");
    } finally {
      setLoading("");
    }
  }

  async function sendHolderMessage() {
    if (!canProvision || !subject.trim() || !message.trim()) return;
    setLoading("send");
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/agentmail/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holderEmail,
          walletAddress,
          displayName,
          holderInboxId,
          subject,
          message,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        holderInboxId?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to send message to $CLAWD.");
      }

      if (data.holderInboxId) {
        setHolderInboxId(data.holderInboxId);
      }

      setNotice("Message routed to $CLAWD. Refresh the holder inbox to watch the thread.");
      await refreshMessages(data.holderInboxId ?? holderInboxId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message to $CLAWD.");
    } finally {
      setLoading("");
    }
  }

  async function refreshMessages(inboxOverride?: string) {
    const inboxId = inboxOverride ?? holderInboxId;
    if (!inboxId) return;
    setLoading("refresh");
    setError("");

    try {
      const response = await fetch(`/api/agentmail/messages?inboxId=${encodeURIComponent(inboxId)}&limit=8`);
      const data = (await response.json()) as { error?: string; messages?: HolderMessage[] };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load holder inbox.");
      }
      setTimeline(data.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load holder inbox.");
    } finally {
      setLoading("");
    }
  }

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-cyan-500/20 bg-black/40 p-6 backdrop-blur">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-300/80">
            Call Or Email $CLAWD
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Solana holders can talk to the agent by voice or inbox.
          </h2>
          <p className="mt-4 text-sm leading-6 text-green-100/70">
            The ElevenLabs widget is live across the site, and this panel provisions an AgentMail inbox for
            $CLAWD holders who want async research threads, wallet notes, and autonomous strategy follow-ups.
          </p>

          <div className="mt-6 grid gap-4">
            <a
              href={`tel:${props.agentNumber}`}
              className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 transition hover:border-green-400/40 hover:bg-green-500/15"
            >
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-green-300" />
                <div>
                  <div className="text-sm font-semibold text-white">Call the agent</div>
                  <div className="font-mono text-sm text-green-200">{props.agentNumber}</div>
                </div>
              </div>
            </a>

            <a
              href={`mailto:${supportInboxId}`}
              className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 transition hover:border-cyan-400/40 hover:bg-cyan-500/15"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-cyan-300" />
                <div>
                  <div className="text-sm font-semibold text-white">Email the agent</div>
                  <div className="font-mono text-sm text-cyan-200">{supportInboxId}</div>
                </div>
              </div>
            </a>

            <Link
              href={props.voicePath}
              className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 transition hover:border-purple-400/40 hover:bg-purple-500/15"
            >
              <div className="flex items-center gap-3">
                <Mic className="h-5 w-5 text-purple-300" />
                <div>
                  <div className="text-sm font-semibold text-white">Open voice mode</div>
                  <div className="text-sm text-purple-200">Use the floating ElevenLabs widget or jump into /voice.</div>
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-green-100/70">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-green-300/80">What this unlocks</div>
            <ul className="mt-3 space-y-2">
              <li>Dedicated holder inboxes for $CLAWD and Solana research threads</li>
              <li>Async strategy requests, wallet monitoring notes, and post-trade reviews</li>
              <li>Voice escalation through ElevenLabs when you want the agent live</li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-orange-500/20 bg-black/40 p-6 backdrop-blur">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-green-100/70">
              Holder email
              <input
                value={holderEmail}
                onChange={(e) => setHolderEmail(e.target.value)}
                type="email"
                placeholder="you@domain.com"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder:text-zinc-500"
              />
            </label>

            <label className="text-sm text-green-100/70">
              Solana wallet
              <div className="relative mt-2">
                <Wallet className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump"
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-10 py-3 text-white placeholder:text-zinc-500"
                />
              </div>
            </label>

            <label className="text-sm text-green-100/70">
              Display name
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="$CLAWD Holder"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder:text-zinc-500"
              />
            </label>

            <label className="text-sm text-green-100/70">
              Research focus
              <input
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="OODA loop, wallet clustering, execution planning"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder:text-zinc-500"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={provisionHolderInbox} disabled={!canProvision || loading !== ""}>
              {loading === "provision" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Provision holder inbox
            </Button>

            <Button variant="outline" asChild>
              <a href={`mailto:${supportInboxId}`}>Email {supportInboxId}</a>
            </Button>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="text-sm text-green-100/70">
              Subject
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder:text-zinc-500"
              />
            </label>

            <label className="text-sm text-green-100/70">
              Message to $CLAWD
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder:text-zinc-500"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={sendHolderMessage} disabled={!canProvision || !subject.trim() || !message.trim() || loading !== ""}>
              {loading === "send" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send to $CLAWD
            </Button>
            <Button
              variant="outline"
              onClick={() => refreshMessages()}
              disabled={!holderInboxId || loading !== ""}
            >
              {loading === "refresh" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Refresh holder inbox
            </Button>
          </div>

          {notice ? (
            <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-orange-300/80">Provisioned inbox</div>
              <div className="mt-3 font-mono text-sm text-white">{holderInboxId || "Provision a holder inbox to get started."}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300/80">Clawd desk</div>
              <div className="mt-3 font-mono text-sm text-white">{supportInboxId}</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-green-300/80">Recent holder thread</div>
            <div className="mt-4 space-y-3">
              {timeline.length === 0 ? (
                <p className="text-sm text-green-100/60">
                  No synced messages yet. Provision an inbox, send a message, or email {supportInboxId} directly.
                </p>
              ) : (
                timeline.map((entry) => (
                  <div key={entry.message_id} className="rounded-xl border border-white/10 bg-black/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-white">{entry.subject || "Untitled thread"}</div>
                      <div className="text-xs text-zinc-500">{entry.created_at || entry.message_id}</div>
                    </div>
                    <div className="mt-2 text-xs text-cyan-300">{entry.from || "AgentMail"}</div>
                    <p className="mt-2 text-sm text-green-100/75">
                      {entry.extracted_text || entry.text || "No preview available."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

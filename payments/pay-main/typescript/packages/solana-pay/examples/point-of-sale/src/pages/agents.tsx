import type { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import React, { useState } from 'react';
import { getGateConfig, getGateSession } from '../server/core/gate';

interface AgentsProps {
    gate: {
        amount: string;
        asset: string;
        mint: string;
    };
    session: {
        expiresAt: string;
    };
}

const AgentsPage: NextPage<AgentsProps> = ({ gate, session }) => {
    const [prompt, setPrompt] = useState('');
    const [reply, setReply] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    return (
        <main
            style={{
                minHeight: '100vh',
                padding: '40px 20px 64px',
                color: '#f7efe2',
                background:
                    'radial-gradient(circle at top right, rgba(71,224,185,0.18), transparent 22%), linear-gradient(180deg, #0a0e14 0%, #040507 100%)',
                fontFamily: 'Inter, system-ui, sans-serif',
            }}
        >
            <div style={{ width: 'min(1080px, 100%)', margin: '0 auto' }}>
                <div
                    style={{
                        display: 'grid',
                        gap: 20,
                        gridTemplateColumns: '1.2fr 0.8fr',
                        border: '1px solid rgba(255,255,255,0.10)',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 28,
                        padding: 28,
                    }}
                >
                    <div>
                        <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8df7c6' }}>
                            CLAWD Agent District
                        </div>
                        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.6rem)', lineHeight: 1.03, margin: '8px 0 16px' }}>
                            Access granted.
                        </h1>
                        <p style={{ color: '#cfc1a6', lineHeight: 1.65, maxWidth: 720 }}>
                            Your CLAWD gate payment is verified. This area is locked behind a signed access session, and the agent endpoints now require that session before responding.
                        </p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                            <Link href="/" style={buttonStyle}>
                                Back to Store
                            </Link>
                            <a href="/api/skills" style={secondaryButtonStyle}>
                                Open Gated Skills API
                            </a>
                        </div>
                    </div>
                    <div style={cardStyle}>
                        <h2 style={{ marginTop: 0 }}>Gate Session</h2>
                        <p style={mutedStyle}>
                            Paid: <strong>{gate.amount} {gate.asset}</strong>
                        </p>
                        <p style={{ ...mutedStyle, wordBreak: 'break-all' }}>
                            Mint: <code>{gate.mint}</code>
                        </p>
                        <p style={mutedStyle}>
                            Expires: <strong>{session.expiresAt}</strong>
                        </p>
                    </div>
                </div>

                <section style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: 24 }}>
                    {[
                        ['Dark Ralph', 'Signal routing, ops loops, tactical prompts'],
                        ['Dexter', 'Merchant intents, checkout, settlement'],
                        ['Eliza', 'Concierge routing and premium service intake'],
                    ].map(([name, desc]) => (
                        <article key={name} style={cardStyle}>
                            <div style={{ color: '#8df7c6', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                CLAWD Agent
                            </div>
                            <h2>{name}</h2>
                            <p style={mutedStyle}>{desc}</p>
                        </article>
                    ))}
                </section>

                <section style={{ ...cardStyle, marginTop: 24 }}>
                    <h2 style={{ marginTop: 0 }}>Talk to Concierge</h2>
                    <p style={mutedStyle}>This posts to a gated agent endpoint. Without the access cookie, it returns `401`.</p>
                    <form
                        onSubmit={async (event) => {
                            event.preventDefault();
                            setLoading(true);
                            setError(null);
                            setReply(null);
                            try {
                                const response = await fetch('/api/agents/concierge', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ prompt }),
                                });
                                const body = await response.json();
                                if (!response.ok) {
                                    throw new Error(body.error || 'concierge_failed');
                                }
                                setReply(body.reply);
                            } catch (cause) {
                                setError(cause instanceof Error ? cause.message : 'concierge_failed');
                            } finally {
                                setLoading(false);
                            }
                        }}
                    >
                        <textarea
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            placeholder="Ask a CLAWD agent what to route next."
                            style={{
                                width: '100%',
                                minHeight: 140,
                                borderRadius: 18,
                                border: '1px solid rgba(255,255,255,0.12)',
                                background: 'rgba(0,0,0,0.22)',
                                color: '#f7efe2',
                                padding: 16,
                                resize: 'vertical',
                            }}
                        />
                        <button type="submit" style={{ ...buttonStyle, border: 0, cursor: 'pointer' }} disabled={loading}>
                            {loading ? 'Contacting Agent…' : 'Send to CLAWD Concierge'}
                        </button>
                    </form>
                    {reply ? <p style={{ ...mutedStyle, color: '#8df7c6', marginTop: 16 }}>{reply}</p> : null}
                    {error ? <p style={{ ...mutedStyle, color: '#ff8f8f', marginTop: 16 }}>{error}</p> : null}
                </section>
            </div>
        </main>
    );
};

const cardStyle: React.CSSProperties = {
    padding: 22,
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.03)',
};

const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    padding: '0 18px',
    borderRadius: 999,
    background: 'linear-gradient(135deg, #8df7c6, #53d2ff)',
    color: '#081018',
    textDecoration: 'none',
    fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'transparent',
    color: '#f7efe2',
    border: '1px solid rgba(255,255,255,0.16)',
};

const mutedStyle: React.CSSProperties = {
    color: '#cfc1a6',
    lineHeight: 1.6,
};

export const getServerSideProps: GetServerSideProps<AgentsProps> = async ({ req }) => {
    const session = req ? getGateSession(req) : null;
    if (!session) {
        return {
            redirect: {
                destination: '/',
                permanent: false,
            },
        };
    }

    const gate = getGateConfig();
    return {
        props: {
            gate: {
                amount: gate.amount,
                asset: gate.asset,
                mint: gate.mint,
            },
            session: {
                expiresAt: new Date(session.exp).toISOString(),
            },
        },
    };
};

export default AgentsPage;

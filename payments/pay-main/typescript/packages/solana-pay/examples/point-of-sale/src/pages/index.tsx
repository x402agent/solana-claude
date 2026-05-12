import type { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import React from 'react';
import { getMerchantCatalog, type MerchantProduct, type TokenPrice } from '../server/core/catalog';
import { getPosRecipient } from '../server/core/runtime';
import { getHostedSkillSummary, type HostedSkill } from '../server/core/skills';

interface LandingProps {
    recipient: string;
    label: string;
    products: MerchantProduct[];
    domain: string;
    gateActive: boolean;
    tokenEconomy?: {
        token?: { symbol: string; mint: string };
        entryGate?: { enabled: boolean; amount: string; asset?: string; token?: string; mint: string; rule: string };
    };
    featuredPumpSkills: HostedSkill[];
    hostedSkillTotal: number;
    pumpSkillTotal: number;
}

const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background:
        'radial-gradient(circle at top left, rgba(255,62,62,0.20), transparent 28%), linear-gradient(180deg, #0d1117 0%, #05070b 100%)',
    color: '#f7efe2',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: '40px 20px 64px',
};

const shellStyle: React.CSSProperties = {
    width: 'min(1120px, 100%)',
    margin: '0 auto',
};

const heroStyle: React.CSSProperties = {
    display: 'grid',
    gap: 24,
    gridTemplateColumns: '1.2fr 0.8fr',
    padding: 32,
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 28,
    background: 'rgba(255,255,255,0.03)',
};

const cardGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 18,
    marginTop: 24,
};

const twoColumnGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 18,
    marginTop: 24,
};

const cardStyle: React.CSSProperties = {
    padding: 20,
    borderRadius: 22,
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
    background: 'linear-gradient(135deg, #ffce72, #ff7b51)',
    color: '#180d06',
    textDecoration: 'none',
    fontWeight: 700,
    marginTop: 16,
};

const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'transparent',
    color: '#f7efe2',
    border: '1px solid rgba(255,255,255,0.16)',
};

function renderTokenPrice(price?: TokenPrice) {
    if (!price) return null;
    return (
        <div style={{ color: '#8df7c6', fontWeight: 700, marginTop: 6 }}>
            {price.amount} {price.asset}
        </div>
    );
}

const Home: NextPage<LandingProps> = ({
    recipient,
    label,
    products,
    domain,
    tokenEconomy,
    featuredPumpSkills,
    hostedSkillTotal,
    pumpSkillTotal,
    gateActive,
}) => {
    const gate = tokenEconomy?.entryGate;
    const pumpProducts = products.filter((product) => product.category === 'pump-skills');
    const gateAsset = gate?.asset ?? gate?.token ?? tokenEconomy?.token?.symbol ?? 'CLAWD';

    return (
        <main style={pageStyle}>
            <div style={shellStyle}>
                <section style={heroStyle}>
                    <div>
                        <p style={{ textTransform: 'uppercase', letterSpacing: '0.16em', color: '#ffce72', fontSize: 12 }}>
                            OpenClawd Agentic POS
                        </p>
                        <h1 style={{ fontSize: 'clamp(2.8rem, 7vw, 5rem)', lineHeight: 1.02, margin: '0 0 16px' }}>
                            Solana-native checkout for paid agents, private sessions, and USDC settlement.
                        </h1>
                        <p style={{ color: '#cfc1a6', lineHeight: 1.65, maxWidth: 720 }}>
                            This point of sale is wired to the OpenClawd merchant catalog, uses Solana Pay transaction requests,
                            and exposes facilitator endpoints for x402-style verification and settlement flows on the same host.
                        </p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <a
                                href={`/new?recipient=${encodeURIComponent(recipient)}&label=${encodeURIComponent(label)}`}
                                style={buttonStyle}
                            >
                                Open Custom Amount Checkout
                            </a>
                            {gate ? (
                                <a
                                    href={`/new?recipient=${encodeURIComponent(recipient)}&label=${encodeURIComponent(
                                        'CLAWD Agent Entry Gate',
                                    )}&amount=${encodeURIComponent(gate.amount)}&spl-token=${encodeURIComponent(
                                        gate.mint,
                                    )}&symbol=${encodeURIComponent(gateAsset)}&gate=1`}
                                    style={secondaryButtonStyle}
                                >
                                    Unlock Agent Access with {gate.amount} {gateAsset}
                                </a>
                            ) : null}
                            {gateActive ? (
                                <Link href="/agents" style={secondaryButtonStyle}>
                                    Enter Agents
                                </Link>
                            ) : null}
                        </div>
                    </div>
                    <div style={cardStyle}>
                        <h2 style={{ marginTop: 0 }}>Token Gate</h2>
                        {gate ? (
                            <>
                                <p style={{ color: '#cfc1a6', lineHeight: 1.55 }}>
                                    Entry fee: <strong>{gate.amount} {gateAsset}</strong>
                                </p>
                                <p style={{ color: '#cfc1a6', lineHeight: 1.55, wordBreak: 'break-all' }}>
                                    Mint: <code>{gate.mint}</code>
                                </p>
                                <p style={{ color: '#cfc1a6', lineHeight: 1.55 }}>{gate.rule}</p>
                            </>
                        ) : null}
                        <p style={{ color: '#cfc1a6', lineHeight: 1.55 }}>
                            Hosted skills: <strong>{hostedSkillTotal}</strong> total, <strong>{pumpSkillTotal}</strong> for Pump and Pump.fun
                        </p>
                        <p style={{ color: '#cfc1a6', lineHeight: 1.55 }}>
                            Domain target: <strong>{domain}</strong>
                        </p>
                        <p style={{ color: '#cfc1a6', lineHeight: 1.55 }}>
                            Core routes: <code>/new</code>, <code>/api</code>, <code>/api/catalog</code>, <code>/api/skills</code>, <code>/api/facilitator/*</code>
                        </p>
                    </div>
                </section>

                <section style={twoColumnGridStyle}>
                    <article style={cardStyle}>
                        <h2 style={{ marginTop: 0 }}>Deployment Surface</h2>
                        <p style={{ color: '#cfc1a6', lineHeight: 1.55 }}>
                            Settlement path: <strong>Solana Pay + x402 facilitator</strong>
                        </p>
                        <p style={{ color: '#cfc1a6', lineHeight: 1.55 }}>
                            Default asset: <strong>USDC</strong>. Special token pricing: <strong>{tokenEconomy?.token?.symbol ?? 'CLAWD'}</strong>
                        </p>
                    </article>
                    <article style={cardStyle}>
                        <h2 style={{ marginTop: 0 }}>Featured Pump Skills</h2>
                        <div style={{ color: '#cfc1a6', lineHeight: 1.7 }}>
                            {featuredPumpSkills.map((skill) => (
                                <div key={skill.id}>
                                    {skill.name} · <code>{skill.merchantPath}</code>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>

                <section style={cardGridStyle}>
                    {products.map((product) => (
                        <article key={product.id} style={cardStyle}>
                            <div style={{ color: '#ffce72', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                                {product.category}
                            </div>
                            <h2>{product.title}</h2>
                            <p style={{ color: '#cfc1a6', lineHeight: 1.6 }}>{product.description}</p>
                            <div style={{ color: '#ffce72', fontWeight: 700 }}>
                                {product.price.amount} {product.price.asset}
                            </div>
                            {renderTokenPrice(product.clawdPrice)}
                            <div style={{ color: '#cfc1a6', marginTop: 8 }}>{product.protocols.join(' · ')}</div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <Link
                                    href={`/new?recipient=${encodeURIComponent(recipient)}&label=${encodeURIComponent(
                                        product.title,
                                    )}&amount=${encodeURIComponent(product.price.amount)}&item=${encodeURIComponent(product.id)}`}
                                    style={buttonStyle}
                                >
                                    Pay in {product.price.asset}
                                </Link>
                                {product.clawdPrice ? (
                                    <Link
                                        href={`/new?recipient=${encodeURIComponent(recipient)}&label=${encodeURIComponent(
                                            `${product.title} · CLAWD`,
                                        )}&amount=${encodeURIComponent(product.clawdPrice.amount)}&item=${encodeURIComponent(
                                            product.id,
                                        )}&spl-token=${encodeURIComponent(product.clawdPrice.mint)}&symbol=${encodeURIComponent(
                                            product.clawdPrice.asset,
                                        )}`}
                                        style={secondaryButtonStyle}
                                    >
                                        Pay in {product.clawdPrice.asset}
                                    </Link>
                                ) : null}
                            </div>
                        </article>
                    ))}
                </section>

                <section style={{ marginTop: 32 }}>
                    <h2>Pump Skill Store</h2>
                    <p style={{ color: '#cfc1a6', lineHeight: 1.6, maxWidth: 760 }}>
                        These Pump and Pump.fun operator skills are hosted in the OpenClawd catalog and exposed on this domain for agentic commerce flows.
                    </p>
                    <div style={cardGridStyle}>
                        {pumpProducts.map((product) => (
                            <article key={product.id} style={cardStyle}>
                                <div style={{ color: '#ffce72', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                                    {product.category}
                                </div>
                                <h3>{product.title}</h3>
                                <p style={{ color: '#cfc1a6', lineHeight: 1.6 }}>{product.merchantPath}</p>
                                <div style={{ color: '#ffce72', fontWeight: 700 }}>
                                    {product.price.amount} {product.price.asset}
                                </div>
                                {renderTokenPrice(product.clawdPrice)}
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
};

export const getServerSideProps: GetServerSideProps<LandingProps> = async () => {
    const catalog = getMerchantCatalog();
    const skillSummary = getHostedSkillSummary();
    return {
        props: {
            recipient: getPosRecipient(),
            label: catalog.merchant.name,
            products: catalog.products,
            domain: catalog.merchant.domain,
            gateActive: Boolean(context.req && getGateSession(context.req)),
            tokenEconomy: catalog.tokenEconomy,
            featuredPumpSkills: skillSummary.featured,
            hostedSkillTotal: skillSummary.total,
            pumpSkillTotal: skillSummary.pump,
        },
    };
};

export default Home;

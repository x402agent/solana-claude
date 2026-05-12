import type { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import React from 'react';
import { getMerchantCatalog, type MerchantProduct } from '../server/core/catalog';

interface LandingProps {
    recipient: string;
    label: string;
    products: MerchantProduct[];
    domain: string;
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

const Home: NextPage<LandingProps> = ({ recipient, label, products, domain }) => {
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
                        <a
                            href={`/new?recipient=${encodeURIComponent(recipient)}&label=${encodeURIComponent(label)}`}
                            style={buttonStyle}
                        >
                            Open Custom Amount Checkout
                        </a>
                    </div>
                    <div style={cardStyle}>
                        <h2 style={{ marginTop: 0 }}>Deployment Surface</h2>
                        <p style={{ color: '#cfc1a6', lineHeight: 1.55 }}>
                            Domain target: <strong>{domain}</strong>
                        </p>
                        <p style={{ color: '#cfc1a6', lineHeight: 1.55 }}>
                            Core routes: <code>/new</code>, <code>/api</code>, <code>/api/catalog</code>, <code>/api/facilitator/*</code>
                        </p>
                        <p style={{ color: '#cfc1a6', lineHeight: 1.55 }}>
                            Asset: <strong>USDC on Solana mainnet</strong>
                        </p>
                    </div>
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
                            <div style={{ color: '#cfc1a6', marginTop: 8 }}>{product.protocols.join(' · ')}</div>
                            <Link
                                href={`/new?recipient=${encodeURIComponent(recipient)}&label=${encodeURIComponent(
                                    product.title,
                                )}&amount=${encodeURIComponent(product.price.amount)}&item=${encodeURIComponent(product.id)}`}
                                style={buttonStyle}
                            >
                                Launch Checkout
                            </Link>
                        </article>
                    ))}
                </section>
            </div>
        </main>
    );
};

export const getServerSideProps: GetServerSideProps<LandingProps> = async () => {
    const catalog = getMerchantCatalog();
    return {
        props: {
            recipient: process.env.POS_RECIPIENT || process.env.MERCHANT_RECIPIENT || '',
            label: catalog.merchant.name,
            products: catalog.products,
            domain: catalog.merchant.domain,
        },
    };
};

export default Home;

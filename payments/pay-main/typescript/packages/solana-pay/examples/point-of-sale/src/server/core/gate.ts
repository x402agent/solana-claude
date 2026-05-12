import { validateTransfer } from '@solana/pay';
import type { Address, Signature } from '@solana/kit';
import { address } from '@solana/kit';
import crypto from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { rpc } from './connection';
import { getMerchantCatalog } from './catalog';
import { getPosRecipient } from './runtime';

const COOKIE_NAME = 'clawd_agent_gate';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_GATE_SECRET = 'change-me-in-production-clawd-gate-secret';

interface GateSessionPayload {
    asset: string;
    amount: string;
    exp: number;
    mint: string;
    recipient: string;
    reference: string;
    signature: string;
}

function getGateSecret(): string {
    return process.env.CLAWD_GATE_SECRET || DEFAULT_GATE_SECRET;
}

function encodeBase64Url(value: string): string {
    return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload: string): string {
    return crypto.createHmac('sha256', getGateSecret()).update(payload).digest('base64url');
}

function buildCookieValue(payload: GateSessionPayload): string {
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

function parseCookieHeader(cookieHeader?: string): Record<string, string> {
    if (!cookieHeader) return {};
    return Object.fromEntries(
        cookieHeader
            .split(';')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => {
                const index = part.indexOf('=');
                return index === -1 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
            })
    );
}

function readCookie(request: IncomingMessage, name: string): string | undefined {
    return parseCookieHeader(request.headers.cookie)[name];
}

function verifyCookieValue(value: string | undefined): GateSessionPayload | null {
    if (!value) return null;
    const [encodedPayload, signature] = value.split('.');
    if (!encodedPayload || !signature) return null;

    const expectedSignature = signPayload(encodedPayload);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
    }

    try {
        const payload = JSON.parse(decodeBase64Url(encodedPayload)) as GateSessionPayload;
        if (payload.exp <= Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}

function appendSetCookie(response: ServerResponse, cookie: string) {
    const existing = response.getHeader('Set-Cookie');
    if (!existing) {
        response.setHeader('Set-Cookie', cookie);
        return;
    }
    if (Array.isArray(existing)) {
        response.setHeader('Set-Cookie', [...existing, cookie]);
        return;
    }
    response.setHeader('Set-Cookie', [String(existing), cookie]);
}

export function getGateConfig() {
    const catalog = getMerchantCatalog();
    const entryGate = catalog.tokenEconomy?.entryGate;
    if (!entryGate?.enabled) {
        throw new Error('clawd_gate_disabled');
    }

    return {
        amount: entryGate.amount,
        asset: entryGate.asset ?? entryGate.token ?? catalog.tokenEconomy?.token?.symbol ?? 'CLAWD',
        mint: entryGate.mint,
        recipient: getPosRecipient(),
        ttlMs: SESSION_TTL_MS,
    };
}

export async function verifyGatePayment(input: { signature: string; reference: string }) {
    const gate = getGateConfig();
    await validateTransfer(rpc, input.signature as Signature, {
        recipient: address(gate.recipient),
        amount: Number(gate.amount),
        splToken: address(gate.mint) as Address,
        reference: address(input.reference) as Address,
    });

    return gate;
}

export function activateGateSession(response: ServerResponse, input: { signature: string; reference: string }) {
    const gate = getGateConfig();
    const payload: GateSessionPayload = {
        asset: gate.asset,
        amount: gate.amount,
        exp: Date.now() + gate.ttlMs,
        mint: gate.mint,
        recipient: gate.recipient,
        reference: input.reference,
        signature: input.signature,
    };

    appendSetCookie(
        response,
        `${COOKIE_NAME}=${buildCookieValue(payload)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${Math.floor(
            gate.ttlMs / 1000
        )}`
    );

    return payload;
}

export function clearGateSession(response: ServerResponse) {
    appendSetCookie(response, `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`);
}

export function getGateSession(request: IncomingMessage) {
    return verifyCookieValue(readCookie(request, COOKIE_NAME));
}

export function requireGateSession(request: IncomingMessage) {
    const session = getGateSession(request);
    if (!session) {
        throw new Error('clawd_gate_required');
    }
    return session;
}

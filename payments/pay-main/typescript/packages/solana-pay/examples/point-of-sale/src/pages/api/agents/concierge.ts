import type { NextApiHandler } from 'next';
import { requireGateSession } from '../../../server/core/gate';

const handler: NextApiHandler = async (request, response) => {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        response.status(405).json({ error: 'method_not_allowed' });
        return;
    }

    try {
        const session = requireGateSession(request);
        const prompt = typeof request.body?.prompt === 'string' ? request.body.prompt.trim() : '';
        response.status(200).json({
            ok: true,
            access: 'granted',
            gate: {
                asset: session.asset,
                amount: session.amount,
                expiresAt: new Date(session.exp).toISOString(),
            },
            reply: prompt
                ? `CLAWD concierge received: ${prompt}`
                : 'CLAWD concierge is live. Your gate session is active.',
        });
    } catch {
        response.status(401).json({ ok: false, error: 'clawd_gate_required' });
    }
};

export default handler;

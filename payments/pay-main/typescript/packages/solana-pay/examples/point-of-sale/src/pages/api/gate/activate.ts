import type { NextApiHandler } from 'next';
import { activateGateSession, verifyGatePayment } from '../../../server/core/gate';

const handler: NextApiHandler = async (request, response) => {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        response.status(405).json({ error: 'method_not_allowed' });
        return;
    }

    const signature = typeof request.body?.signature === 'string' ? request.body.signature : null;
    const reference = typeof request.body?.reference === 'string' ? request.body.reference : null;

    if (!signature || !reference) {
        response.status(400).json({ error: 'missing_signature_or_reference' });
        return;
    }

    try {
        const gate = await verifyGatePayment({ signature, reference });
        const session = activateGateSession(response, { signature, reference });
        response.status(200).json({
            ok: true,
            gate,
            session: {
                active: true,
                expiresAt: new Date(session.exp).toISOString(),
            },
        });
    } catch (error) {
        response.status(400).json({
            ok: false,
            error: error instanceof Error ? error.message : 'gate_verification_failed',
        });
    }
};

export default handler;

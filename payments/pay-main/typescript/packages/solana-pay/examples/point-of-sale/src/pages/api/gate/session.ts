import type { NextApiHandler } from 'next';
import { clearGateSession, getGateConfig, getGateSession } from '../../../server/core/gate';

const handler: NextApiHandler = async (request, response) => {
    if (request.method === 'DELETE') {
        clearGateSession(response);
        response.status(200).json({ ok: true, active: false });
        return;
    }

    const session = getGateSession(request);
    response.status(200).json({
        active: Boolean(session),
        gate: getGateConfig(),
        session: session
            ? {
                  asset: session.asset,
                  amount: session.amount,
                  expiresAt: new Date(session.exp).toISOString(),
                  mint: session.mint,
              }
            : null,
    });
};

export default handler;

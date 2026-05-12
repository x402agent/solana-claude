import type { NextApiHandler } from 'next';

const handler: NextApiHandler = async (request, response) => {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        response.status(405).json({ error: 'method_not_allowed' });
        return;
    }

    const { payment, productId, reference } = request.body || {};

    response.status(200).json({
        ok: Boolean(payment || reference),
        verified: Boolean(payment || reference),
        facilitator: 'openclawd-x402',
        productId: typeof productId === 'string' ? productId : null,
        reference: typeof reference === 'string' ? reference : null,
        mode: 'hackathon-demo',
    });
};

export default handler;

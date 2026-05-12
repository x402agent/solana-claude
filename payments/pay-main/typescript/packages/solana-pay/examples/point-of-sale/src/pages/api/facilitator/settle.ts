import type { NextApiHandler } from 'next';

const handler: NextApiHandler = async (request, response) => {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        response.status(405).json({ error: 'method_not_allowed' });
        return;
    }

    const { productId, amount, asset, payer, reference } = request.body || {};

    response.status(200).json({
        ok: true,
        facilitator: 'openclawd-x402',
        status: 'accepted',
        settlementAsset: typeof asset === 'string' ? asset : 'USDC',
        amount: typeof amount === 'string' || typeof amount === 'number' ? String(amount) : null,
        productId: typeof productId === 'string' ? productId : null,
        payer: typeof payer === 'string' ? payer : null,
        reference: typeof reference === 'string' ? reference : null,
        transaction: `openclawd-demo-${Date.now()}`,
        note: 'Replace this demo settlement acknowledgement with the production x402 worker or facilitator verifier before mainnet launch.',
    });
};

export default handler;

import type { NextApiHandler } from 'next';
import { getMerchantCatalog } from '../../../server/core/catalog';

const handler: NextApiHandler = async (_request, response) => {
    const catalog = getMerchantCatalog();
    response.status(200).json({
        facilitator: 'openclawd-x402',
        merchant: catalog.merchant.id,
        domain: catalog.merchant.domain,
        protocols: catalog.protocols,
        settlementAsset: 'USDC',
        chains: ['solana'],
        features: ['verify', 'settle', 'solana-pay', 'x402', 'mpp', 'ap2'],
    });
};

export default handler;

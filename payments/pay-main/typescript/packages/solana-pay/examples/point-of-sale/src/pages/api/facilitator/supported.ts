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
        supportedAssets: [
            { asset: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
            { asset: 'CLAWD', mint: catalog.tokenEconomy?.token.mint ?? null },
        ],
        chains: ['solana'],
        features: ['verify', 'settle', 'solana-pay', 'x402', 'mpp', 'ap2', 'token-gated-access', 'pump-skills'],
    });
};

export default handler;

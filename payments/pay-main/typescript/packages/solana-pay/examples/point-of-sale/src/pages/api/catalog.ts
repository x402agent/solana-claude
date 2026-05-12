import type { NextApiHandler } from 'next';
import { getMerchantCatalog } from '../../server/core/catalog';

const handler: NextApiHandler = async (_request, response) => {
    const catalog = getMerchantCatalog();
    response.status(200).json({
        merchant: catalog.merchant,
        protocols: catalog.protocols,
        tokenEconomy: catalog.tokenEconomy,
        products: catalog.products,
    });
};

export default handler;

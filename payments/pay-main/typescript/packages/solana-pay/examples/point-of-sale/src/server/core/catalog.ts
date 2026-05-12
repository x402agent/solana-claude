import { readFileSync } from 'fs';
import { join } from 'path';

export interface MerchantProduct {
    id: string;
    title: string;
    category: string;
    description: string;
    price: { amount: string; asset: string };
    protocols: string[];
    merchantPath: string;
    digital?: boolean;
}

export interface MerchantCatalog {
    protocols: string[];
    merchant: {
        id: string;
        name: string;
        domain: string;
        storefrontPath: string;
        checkoutPath: string;
        brandColor?: string;
        contactEmail?: string;
    };
    products: MerchantProduct[];
}

let cachedCatalog: MerchantCatalog | null = null;

export function getMerchantCatalog(): MerchantCatalog {
    if (cachedCatalog) return cachedCatalog;
    const path = join(process.cwd(), '../../../../../../agent-store/catalog.json');
    cachedCatalog = JSON.parse(readFileSync(path, 'utf8')) as MerchantCatalog;
    return cachedCatalog;
}

export function getMerchantProduct(productId: string | undefined): MerchantProduct | undefined {
    if (!productId) return undefined;
    return getMerchantCatalog().products.find((product) => product.id === productId);
}

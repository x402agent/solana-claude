import catalogJson from '../../../../../../../../../agent-store/catalog.json';

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

export function getMerchantCatalog(): MerchantCatalog {
    return catalogJson as MerchantCatalog;
}

export function getMerchantProduct(productId: string | undefined): MerchantProduct | undefined {
    if (!productId) return undefined;
    return getMerchantCatalog().products.find((product) => product.id === productId);
}

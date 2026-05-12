import catalogJson from '../../../../../../../../../agent-store/catalog.json';

export interface TokenPrice {
    amount: string;
    asset: string;
    mint: string;
}

export interface MerchantProduct {
    id: string;
    title: string;
    category: string;
    description: string;
    price: { amount: string; asset: string };
    clawdPrice?: TokenPrice;
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
    tokenEconomy?: {
        token?: {
            symbol: string;
            mint: string;
        };
        entryGate?: {
            enabled: boolean;
            amount: string;
            asset?: string;
            token?: string;
            mint: string;
            rule: string;
        };
        pricing?: {
            token?: string;
            mint?: string;
            specialsEnabled: boolean;
        };
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

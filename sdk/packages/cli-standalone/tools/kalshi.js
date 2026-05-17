import axios, { isAxiosError } from "axios";
import crypto from "node:crypto";
function wrap(err, prefix) {
    if (isAxiosError(err)) {
        if (err.response)
            return { success: false, error: `${prefix}: ${err.response.status} ${JSON.stringify(err.response.data || {})}` };
        if (err.request)
            return { success: false, error: `${prefix}: network error` };
    }
    return { success: false, error: `${prefix}: ${err instanceof Error ? err.message : "unknown"}` };
}
/**
 * Kalshi direct API with RSA-PSS request signing.
 * Env:
 *   KALSHI_KEY_ID         — API key UUID
 *   KALSHI_PRIVATE_KEY    — RSA PEM (use \n for newlines or provide path via KALSHI_PRIVATE_KEY_FILE)
 *   KALSHI_ENV            — 'prod' (default) or 'demo'
 * Docs: https://trading-api.readme.io/reference/
 */
export class KalshiTool {
    api;
    keyId;
    privateKey;
    constructor() {
        this.keyId = process.env.KALSHI_KEY_ID || "";
        const pemEnv = process.env.KALSHI_PRIVATE_KEY || "";
        const pemFile = process.env.KALSHI_PRIVATE_KEY_FILE || "";
        let pem = pemEnv.replace(/\\n/g, "\n");
        if (!pem && pemFile) {
            try {
                pem = require("node:fs").readFileSync(pemFile, "utf8");
            }
            catch { /* ignore */ }
        }
        this.privateKey = pem || null;
        const base = process.env.KALSHI_ENV === "demo"
            ? "https://demo-api.kalshi.co/trade-api/v2"
            : "https://api.elections.kalshi.com/trade-api/v2";
        this.api = axios.create({ baseURL: base, timeout: 20000 });
    }
    requireAuth() {
        if (!this.keyId || !this.privateKey) {
            return { success: false, error: "Kalshi auth not configured — set KALSHI_KEY_ID and KALSHI_PRIVATE_KEY (PEM)" };
        }
        return null;
    }
    sign(method, path) {
        const ts = Date.now().toString();
        const msg = `${ts}${method.toUpperCase()}${path}`;
        const signer = crypto.createSign("SHA256");
        signer.update(msg);
        signer.end();
        const sig = signer.sign({ key: this.privateKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST }, "base64");
        return {
            "KALSHI-ACCESS-KEY": this.keyId,
            "KALSHI-ACCESS-TIMESTAMP": ts,
            "KALSHI-ACCESS-SIGNATURE": sig,
        };
    }
    async req(method, path, params, body) {
        const miss = this.requireAuth();
        if (miss)
            return miss;
        try {
            const resp = await this.api.request({
                method,
                url: path,
                params,
                data: body,
                headers: { ...this.sign(method, `/trade-api/v2${path}`), "content-type": "application/json" },
            });
            return { success: true, output: JSON.stringify(resp.data, null, 2), data: resp.data };
        }
        catch (e) {
            return wrap(e, `kalshi ${method} ${path}`);
        }
    }
    // Public-ish reads still require auth on Kalshi prod
    async getBalance() { return this.req("GET", "/portfolio/balance"); }
    async getPositions(params = {}) { return this.req("GET", "/portfolio/positions", params); }
    async getOrders(params = {}) { return this.req("GET", "/portfolio/orders", params); }
    async getFills(params = {}) { return this.req("GET", "/portfolio/fills", params); }
    async placeOrder(order) {
        const body = {
            ticker: order.ticker,
            side: order.side,
            action: order.action,
            count: order.count,
            type: order.type,
            ...(order.yes_price ? { yes_price: order.yes_price } : {}),
            ...(order.no_price ? { no_price: order.no_price } : {}),
            time_in_force: order.time_in_force ?? "GTC",
            client_order_id: order.client_order_id ?? crypto.randomUUID(),
        };
        return this.req("POST", "/portfolio/orders", undefined, body);
    }
    async cancelOrder(orderId) {
        return this.req("DELETE", `/portfolio/orders/${encodeURIComponent(orderId)}`);
    }
    async getMarkets(params = {}) { return this.req("GET", "/markets", params); }
    async getMarket(ticker) { return this.req("GET", `/markets/${encodeURIComponent(ticker)}`); }
    async getMarketOrderbook(ticker, depth = 10) {
        return this.req("GET", `/markets/${encodeURIComponent(ticker)}/orderbook`, { depth });
    }
}
//# sourceMappingURL=kalshi.js.map
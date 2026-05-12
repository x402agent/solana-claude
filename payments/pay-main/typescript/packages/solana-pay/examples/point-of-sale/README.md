# OpenClawd Agentic Point of Sale

This app is the OpenClawd hackathon POS surface. It uses the Solana Pay point-of-sale example as a base, but is adapted to:

- sell products from a local merchant catalog
- default to **USDC on Solana mainnet**
- use **transaction requests** through `/api`
- expose an OpenClawd-branded facilitator surface at `/api/facilitator/*`
- provide a landing page at `/` for product-driven checkout

The original Solana Pay example remains the underlying reference implementation.

You can [check out the app](https://app.solanapay.com?recipient=GvHeR432g7MjN9uKyX3Dzg66TqwrEWgANLnnFZXMeyyj&label=Solana+Pay), use the code as a reference, or run it yourself to start accepting decentralized payments in-person.

## Prerequisites

To build and run this app locally, you'll need:

-   Node.js 20+
-   npm
-   <details>
        <summary> Setup two wallets on <a href="https://phantom.app">Phantom</a> (Merchant and Customer) </summary>

    #### 1. Create merchant wallet

    Follow the [guide][1] on how to create a wallet. This wallet will provide the recipient address.

    #### 2. Create customer wallet

    Follow the [guide][1] on how to create another wallet. This wallet will be paying for the goods/services.

    #### 3. Set Phantom to connect to devnet

    1. Click the settings icon in the Phantom window
    2. Select the "Change network" option and select "Devnet"

    #### 4. Airdrop SOL to customer wallet

    Use [solfaucet][3] to airdrop SOL to the customer wallet.

    > You'll need SOL in the customer wallet to pay for the goods/services + transaction fees

 </details>

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Clone the repository

#### With Git
```shell
git clone https://github.com/solana-labs/solana-pay.git
```

#### With Github CLI
```shell
gh repo clone solana-labs/solana-pay
```

### Install dependencies
```shell
cd payments/pay-main/typescript/packages/solana-pay/examples/point-of-sale
npm install
```

### Start the local dev server
```shell
npm run dev
```

### In a separate terminal, run a local SSL proxy
```shell
npm run proxy
```

### Open the point of sale app

Set `POS_RECIPIENT` or `MERCHANT_RECIPIENT` in your environment, then open:

```shell
open "https://localhost:3001"
```

You may need to accept a locally signed SSL certificate to open the page.

Create a local env file first:

```shell
cp .env.example .env.local
```

## Core routes

- `/` — OpenClawd landing page with merchant products
- `/new` — amount-entry POS UI
- `/api` — Solana Pay transaction request endpoint
- `/api/catalog` — merchant catalog payload
- `/api/facilitator/supported` — facilitator capabilities
- `/api/facilitator/verify` — demo verification endpoint
- `/api/facilitator/settle` — demo settlement acknowledgement endpoint

## Product-driven checkout URLs

The landing page builds these automatically, but you can deep-link directly:

```shell
https://localhost:3001/new?recipient=<WALLET>&label=Private%20Agent%20Session&amount=1.50&item=prod-private-agent-session
```

## Domain deployment target

For hackathon deployment, the intended host is:

```text
https://solanaclawd.com
```

Recommended layout:

- `solanaclawd.com` or `pos.solanaclawd.com` -> this Next.js POS app
- `solanaclawd.com/api/facilitator/*` -> same deployment for demo or proxied to the production x402 worker later
- `solanaclawd.com/store` -> existing merchant storefront, if you want a separate marketing surface

## Production note

The facilitator endpoints in this app are hackathon-ready metadata and settlement stubs. Before public mainnet usage, replace the demo verification and settlement handlers with the production worker under `x402/worker` or the bundled facilitator stack described in `payments/README.md`.

## Accepting USDC on Mainnet
Import the Mainnet endpoint, along with USDC's mint address and icon in the [`client/components/pages/App.tsx`](https://github.com/solana-labs/solana-pay/blob/master/examples/point-of-sale/src/client/components/pages/App.tsx) file.
```tsx
import { MAINNET_ENDPOINT, MAINNET_USDC_MINT } from '../../utils/constants';
import { USDCIcon } from '../images/USDCIcon';
```

In the same file, set the `endpoint` value in the `<ConnectionProvider>` to `MAINNET_ENDPOINT` and set the following values in the `<ConfigProvider>`:

```tsx
splToken={MAINNET_USDC_MINT}
symbol="USDC"
icon={<USDCIcon />}
decimals={6}
minDecimals={2}
```

**Make sure to use 6 decimals for USDC!**

When you're done, it should look like this:

```tsx
<ConnectionProvider endpoint={MAINNET_ENDPOINT}>
    <WalletProvider wallets={wallets} autoConnect={connectWallet}>
        <WalletModalProvider>
            <ConfigProvider
                baseURL={baseURL}
                link={link}
                recipient={recipient}
                label={label}
                message={message}
                splToken={MAINNET_USDC_MINT}
                symbol="USDC"
                icon={<USDCIcon />}
                decimals={6}
                minDecimals={2}
                connectWallet={connectWallet}
            >
```

## Using Transaction Requests

[Transaction Requests](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#specification-transaction-request) are a new feature in Solana Pay.

In the [`client/components/pages/App.tsx`](https://github.com/solana-labs/solana-pay/blob/master/examples/point-of-sale/src/client/components/pages/App.tsx) file, toggle these lines:

```tsx
    // Toggle comments on these lines to use transaction requests instead of transfer requests.
    const link = undefined;
    // const link = useMemo(() => new URL(`${baseURL}/api/`), [baseURL]);
```

When you're done, it should look like this:

```tsx
    // Toggle comments on these lines to use transaction requests instead of transfer requests.
    // const link = undefined;
    const link = useMemo(() => new URL(`${baseURL}/api/`), [baseURL]);
```

The generated QR codes in the app should now use transaction requests. To see what's going on and customize it, check out the [`server/api/index.ts`](https://github.com/solana-labs/solana-pay/blob/master/examples/point-of-sale/src/server/api/index.ts) file.

## Deploying to Vercel

Use this repo directly. The app is already prepared for Vercel with a local [`vercel.json`](./vercel.json).

### Vercel project settings

- Framework preset: `Next.js`
- Root directory: `payments/pay-main/typescript/packages/solana-pay/examples/point-of-sale`
- Install command:

```shell
cd ../../../.. && pnpm install --no-frozen-lockfile && cd packages/solana-pay/examples/point-of-sale && npm install
```

- Build command:

```shell
npm run build
```

### Required environment variables

Set these in the Vercel dashboard:

- `POS_RECIPIENT`
  The Solana mainnet wallet that receives merchant funds.
- `MERCHANT_RECIPIENT`
  Optional alias; use the same value as `POS_RECIPIENT`.
- `CLUSTER_ENDPOINT`
  Recommended: your Helius or other Solana mainnet RPC.
- `RATE_LIMIT`
  Optional API rate limit. Example: `30`
- `RATE_LIMIT_INTERVAL`
  Optional rate limit window in seconds. Example: `60`

### Recommended production values

```text
POS_RECIPIENT=<your Solana wallet>
MERCHANT_RECIPIENT=<same wallet>
CLUSTER_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=<your-helius-key>
RATE_LIMIT=30
RATE_LIMIT_INTERVAL=60
```

### Domain wiring

After the first successful deploy:

1. Add `solanaclawd.com` and optionally `www.solanaclawd.com` or `pos.solanaclawd.com` to the Vercel project domains.
2. Point your DNS at Vercel using the records Vercel gives you.
3. Keep the POS on the root domain or move it to `pos.solanaclawd.com` if you want the existing storefront to remain the main marketing surface.

### Post-deploy checks

Verify these URLs after the domain is attached:

- `https://solanaclawd.com/`
- `https://solanaclawd.com/new?recipient=<wallet>&label=OpenClawd`
- `https://solanaclawd.com/api/catalog`
- `https://solanaclawd.com/api/facilitator/supported`

### Security note

Do not store live API keys or wallet secrets in tracked files. This package now uses `.env.example` only. Put real values in Vercel environment settings or an untracked local `.env.local`.

## License

The Solana Pay Point of Sale app is open source and available under the MIT License. See the [LICENSE](./LICENSE) file for more info.

<!-- Links -->

[1]: https://help.phantom.com/hc/en-us/articles/8071074929043-How-to-Create-a-New-Wallet
[3]: https://solfaucet.com/

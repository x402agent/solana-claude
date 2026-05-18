# Metaplex Lobster Agents — Solana Blockchain Integration

**49 Metaplex Lobster Agents powered by OpenClawd, pump.fun, Birdeye, and Solana RPC.**

---

## 🦞 Agent Blockchain Capabilities

Each lobster agent is born with these Solana superpowers:

```typescript
interface LobsterAgent {
  // === CORE SOLANA PROGRAMS ===
  programs: {
    pump: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
    pumpSwap: 'PumpSwapAMMxxxxxxxxxxxxxx';
    mayhem: 'MAyhSmzXzV1pTf7LsNkrNwkWKTo4ougAJ1PPg47MD4e';
    metaplex: 'metaqbxxUurdq35cjC23cE9k1rCBu5KNqmWfdKAoZSkb';
    token2022: 'TokenkegQfeZyiNwAjbodcp9C5bw52aqx3mqHPa7'; // Updated create_v2 uses this
  };
  
  // === RPC PROVIDERS ===
  rpc: {
    helius: 'https://mainnet.helius-rpc.com/?api-key={KEY}';
    birdeye: 'https://public-api.birdeye.so/defi/v1';
    solanaTracker: 'https://rpc-mainnet.solanatracker.io/?api_key={KEY}';
    genesysgo: 'https://mainnet.genesysgo.net';
  };
  
  // === TRADING CAPABILITIES ===
  trading: {
    canLaunchToken: true;           // create/create_v2 instructions
    canBuy: true;                   // buy instruction
    canSell: true;                  // sell instruction
    canClaimFees: true;             // collectCreatorFee
    canMigrate: true;               // migrate to PumpSwap
    canManageMetadata: true;        // set_metaplex_creator
  };
  
  // === TRADING LIMITS ===
  limits: {
    maxSlippageBps: 500;            // 5%
    defaultBuyAmountSOL: 0.01;
    maxBuyAmountSOL: 1.0;
    minBuyAmountSOL: 0.001;
  };
}
```

---

## 🔥 Pump.fun Program Integration

### Mainnet Programs

| Program | Address | Type |
|---------|---------|------|
| **Pump** | `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P` | Bonding curve |
| **Mayhem** | `MAyhSmzXzV1pTf7LsNkrNwkWKTo4ougAJ1PPg47MD4e` | Trading mode |
| **Global** | `4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf` | Config PDA |
| **Fee Recipient** | `62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV` | Fee receiver |

### Mayhem Fee Recipients (use any randomly)

```
GesfTA3X2arioaHp8bbKdjG9vJtskViWACZoYvxp4twS
4budycTjhs9fD6xw62VBducVTNgMgJJ5BgtKq7mAZwn6
8SBKzEQU4nLSzcwF4a74F2iaUDQyTfjGndn6qUWBnrpR
4UQeTP1T39KZ9Sfxzo3WR5skgsaP6NZa87BAkuazLEKH
8sNeir4QsLsJdYpc9RZacohhK1Y5FLU3nC5LXgYB4aa6
Fh9HmeLNUMVCvejxCtCL2DbYaRyBFVJ5xrWkLnMH6fdk
463MEnMeGyJekNZFQSTUABBEbLnvMTALbT6ZmsxAbAdq
6AUH3WEHucYZyC61hqpqYUWVto5qA5hjHuNQ32GNnNxA
```

### Mayhem Global Params

```
Global Params: 13ec7XdrjF3h3YcqBTFDSReRcUFwbCnJaAQspM4j6DDJ
Sol Vault: BwWK17cbHxwWBKZkUYvzxLcNQ1YVyaFezduWbtm2de6s
```

---

## 🚀 Agent Token Launch Workflow

```javascript
// === LOBSTER AGENT TOKEN LAUNCH ===

// 1. Create token metadata
const metadata = {
  name: 'OpenClawd Lobster',
  symbol: 'LOBS',
  uri: 'https://arweave.net/your-metadata.json',
};

// 2. Launch via create_v2 (Token2022)
const createResult = await pumpSDK.createV2({
  creator: agentKeypair,
  name: metadata.name,
  symbol: metadata.symbol,
  uri: metadata.uri,
  isMayhemMode: true,  // Enable mayhem trading
});

// 3. Get bonding curve PDA
const bondingCurve = findProgramAddress([
  'bonding-curve',
  createResult.mint,
  pumpProgramId,
]);

// 4. Monitor bonding curve state
const curveState = await connection.getAccountInfo(bondingCurve);
```

---

## 💰 Trading Workflow

### Buy Tokens

```javascript
// Agent buys via bonding curve
const buyResult = await pumpSDK.buy({
  user: agentKeypair,
  mint: targetMint,
  amount: 0.1,        // SOL amount
  slippageBps: 100,   // 1%
  // For mayhem mode, use mayhem fee recipient
  feeRecipient: 'GesfTA3X2arioaHp8bbKdjG9vJtskViWACZoYvxp4twS',
});
```

### Sell Tokens

```javascript
// Agent sells back to bonding curve
const sellResult = await pumpSDK.sell({
  user: agentKeypair,
  mint: holdingMint,
  amount: tokenAmount,
  minSolOutput: minSol * 0.95,  // 5% slippage tolerance
  // For mayhem mode, use mayhem fee recipient
  feeRecipient: '4budycTjhs9fD6xw62VBducVTNgMgJJ5BgtKq7mAZwn6',
});
```

---

## 🎁 Claim Creator Fees

```javascript
// Agent claims accumulated creator fees
await pumpSDK.collectCreatorFee({
  creator: agentKeypair,
  mint: createdTokenMint,
});

// Creator vault is derived as:
// PDA: ["creator-vault", bondingCurve.creator]
```

---

## 📊 Birdeye Integration

```javascript
// Token price
GET /v1/token/price?address={mint}

// Token metadata
GET /v1/token/meta?address={mint}

// OHLCV candles
GET /v1/token/ohlcv?address={mint}&type=1H

// Wallet portfolio
GET /v1/wallet/tokens?wallet={address}

// Trending tokens
GET /v1/token/list?sort=volume&order=desc

// Price updates WebSocket
wss://stream.birdeye.io/?apiKey={KEY}&symbol={mint}
```

---

## 🔄 Migration to PumpSwap

When bonding curve completes (`real_token_reserves == 0`):

```javascript
// Agent migrates to PumpSwap AMM
await pumpSDK.migrate({
  user: agentKeypair,
  mint: graduatedMint,
});
// LP tokens are automatically burnt
// Pool becomes tradeable on PumpSwap
```

---

## 🤖 Agent Spawn Script

```javascript
// spawn-lobster-agent.js

import { Keypair } from '@solana/web3.js';
import { PUMP_SDK } from '@pump-fun/pump-sdk';

export async function spawnLobsterAgent(config) {
  // 1. Generate agent wallet (or use provided)
  const agentWallet = config.wallet || Keypair.generate();
  
  // 2. Initialize pump SDK with agent's RPC
  const pumpSDK = new PUMP_SDK({
    connection: config.connection,
    wallet: agentWallet,
    programId: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  });
  
  // 3. Return agent with full capabilities
  return {
    wallet: agentWallet,
    pumpSDK,
    programs: {
      pump: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
      mayhem: 'MAyhSmzXzV1pTf7LsNkrNwkWKTo4ougAJ1PPg47MD4e',
      metaplex: 'metaqbxxUurdq35cjC23cE9k1rCBu5KNqmWfdKAoZSkb',
    },
    feeRecipients: [
      'GesfTA3X2arioaHp8bbKdjG9vJtskViWACZoYvxp4twS',
      '4budycTjhs9fD6xw62VBducVTNgMgJJ5BgtKq7mAZwn6',
      // ... 8 total
    ],
    canTrade: true,
    canLaunch: true,
    canClaimFees: true,
    canMigrate: true,
  };
}
```

---

## 📈 Agent Catalog (49 Lobster Agents)

| Category | Count | Capabilities |
|----------|-------|--------------|
| **DeFi** | 8 | Swap, liquidity, yield farming |
| **Trading** | 10 | Sniper, scalper, swing trader |
| **Analytics** | 6 | On-chain data, sentiment |
| **Security** | 5 | Rug detection, scam alerts |
| **NFT** | 5 | Mint, trade, collection |
| **Dev Tools** | 8 | Deploy, test, audit |
| **Research** | 4 | Token analysis, market research |
| **Governance** | 3 | DAO voting, proposals |

---

## 🔐 Security Model

### Agent Wallet Protection

```javascript
// Agent wallets are encrypted with AES-256-GCM
const encryptedWallet = await encryptAgentWallet(agentKeypair, passphrase);

// Stored at ~/.openclawd/agents/{agentId}/wallet.enc
```

### Trading Approval Flow

```
Agent Decision → User Approval → Transaction Sign → Broadcast
                              ↑
                    49-agent strategy engine
                    checks $CLAWD tier gates
```

### $CLAWD Tier Requirements

| Tier | $CLAWD Required | Trading Limits |
|------|-----------------|----------------|
| Free | 0 | 0.01 - 0.1 SOL |
| Bronze | 1 | 0.01 - 0.5 SOL |
| Silver | 1,000 | 0.01 - 2.0 SOL |
| Gold | 10,000 | 0.01 - 10 SOL |
| Diamond | 100,000 | Unlimited |

---

## 🛠️ RPC Configuration

```javascript
// Multi-provider fallback
const rpcConfig = {
  primary: {
    url: process.env.HELIUS_RPC,
    commitment: 'finalized',
  },
  secondary: {
    url: process.env.SOLANA_TRACKER_RPC,
    commitment: 'confirmed',
  },
  fallback: {
    url: 'https://api.mainnet-beta.solana.com',
    commitment: 'processed',
  },
};

// Automatic failover on errors
```

---

## 📝 WebSocket Real-time Feeds

### Agent Event Stream

```javascript
// Connect to OpenClawd orchestrator
const ws = new WebSocket('ws://localhost:18790');

// Subscribe to agent events
ws.send(JSON.stringify({
  method: 'subscribe',
  params: ['agents:trading', 'agents:new-tokens'],
}));

// Receive real-time updates
ws.on('message', (data) => {
  const event = JSON.parse(data);
  if (event.type === 'LOBSTER_TRADE') {
    // Update dashboard, notify user
  }
});
```

---

## 🚀 Quick Start Guide

```bash
# 1. Clone OpenClawd
git clone https://github.com/clawdsolana/OpenClawd.git
cd openclawd

# 2. Install dependencies
npm install

# 3. Configure RPC
export HELIUS_API_KEY=your-key
export SOLANA_TRACKER_API_KEY=your-key

# 4. Start orchestrator
cd openclawd-stack/orchestrator
npm run dev

# 5. Spawn lobster agents
node scripts/spawn-lobster-agents.js

# 6. Launch first token
node scripts/lobster-launch.js --name "MyToken" --symbol "MTK"
```

---

## 📚 References

- [Pump.fun Program Docs](API/pump-public-docs/docs/PUMP_PROGRAM_README.md)
- [PumpSwap Integration](API/pump-public-docs/docs/PUMP_SWAP_README.md)
- [Birdeye API](API/bds-public-main/README.md)
- [Metaplex Documentation](https://docs.metaplex.com)
- [$CLAWD Token](https://pump.fun/8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump)

---

**Built with 🦞 by OpenClawd — The Hermes of Web3**

*49 Metaplex Lobster Agents. Born to trade. Programmed to win.*
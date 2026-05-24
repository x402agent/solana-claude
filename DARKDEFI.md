According to documents uploaded on May 24, 2026, here’s the fully integrated one-page guide with the new npm package layer folded in.

# 🌑 Dark Protocol: Complete One-Page Guide

**Dark DeFi · Shielded Wallets · Dark Swaps · Dark Agents · Dark Clawd · x402 Private Payments · Program IDs**

**Dark Protocol** is a privacy-first Solana DeFi stack that brings Zcash-style shielded notes, encrypted balances, private swaps, TEE-attested AI agents, and x402 private payments into one system. The goal is simple: let humans and AI agents transact, swap, infer, route, and execute without leaking balances, prompts, counterparties, order flow, strategy, or wallet graphs. The uploaded Dark DeFi docs frame the stack as Solana throughput + Zcash privacy + TEE agents + x402 shielded payments + MEV resistance. 

---

## 1. Install the Stack

### Easiest install: full Dark DeFi suite

```bash
npm install dark-defi
```

Use `dark-defi` when you want the umbrella package: shielded wallets, Clawd, TEE agents, SAS attestations, and protocol utilities in one dependency. Your docs describe `dark-defi` as the meta-package that re-exports the protocol SDK, TEE agents, Dark Protocol primitives, and `sas-lib`. 

### Individual packages

```bash
# Privacy SDK: shielded wallets, Sapling, note encryption, private swaps
npm install @openclawdsolana/dark-sdk

# On-chain types, program interfaces, protocol primitives
npm install @openclawdsolana/dark-protocol

# TEE-attested AI agents, sealed inference, x402 payments, Clawd
npm install @openclawdsolana/dark-tee-agents

# Solana Attestation Service client
npm install sas-lib

# Privacy-first DeFi terminal
npm install dark-x402-terminal

# x402 helper package
npm install x402.wtf
```

The older uploaded README also references `@openclawdsol/dark-protocol-sdk`, `@openclawdsol/dark-tee-agents`, and `@openclawdsol/dark-protocol`; for the public one-pager, I’d standardize around the newer npm names you pasted: `@openclawdsolana/dark-sdk`, `@openclawdsolana/dark-protocol`, and `@openclawdsolana/dark-tee-agents`.

---

## 2. What Each Package Does

| Package                            | Role                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dark-defi`                        | Umbrella package: one install for the whole Dark DeFi stack.                                                                                            |
| `@openclawdsolana/dark-sdk`        | Main privacy SDK: `DarkProtocolClient`, `DarkWallet`, `SaplingHDWallet`, `PrivacyUtils`, `PrivateSwapManager`, `AIAgentManager`, `NoteEncryptionUtils`. |
| `@openclawdsolana/dark-protocol`   | Low-level Solana client, program IDs, protocol config, wallet helpers, privacy utilities, swap primitives, and AI manager.                              |
| `@openclawdsolana/dark-tee-agents` | Confidential AI agents: spawn enclave, verify quote, seal prompt, pay through x402, infer, and write SAS receipt.                                       |
| `sas-lib`                          | Solana Attestation Service client plus Dark schemas for agent identity and inference receipts.                                                          |
| `dark-x402-terminal`               | Interactive cypherpunk CLI for wallets, swaps, agents, dashboards, and x402-aware workflows.                                                            |
| `x402.wtf`                         | Lightweight package for the x402.wtf payment/application layer.                                                                                         |

Your package map already describes the stack as published modules for SDK, TEE agents, protocol primitives, terminal, and umbrella package, with `sas-lib` as the SAS client/Dark schema workspace. 

---

## 3. Core Concept

```text
Public Solana Wallet
   ↓ shield
Shielded Wallet
   ↓ private transfer / private swap / private agent call
Dark Protocol
   ↓
ZK proofs + encrypted notes + nullifiers + commitments
   ↓
Dark Swaps + Dark Agents + x402 private payments
   ↓
SAS receipts prove execution without revealing private contents
```

Dark Protocol uses the familiar shielded-note model: public assets enter a private pool, become encrypted notes, move through commitments and nullifiers, then exit only when the owner proves they can spend them. The docs describe shielding as public-to-private deposits, private transfers through ZK ownership proofs, nullifier recording for double-spend prevention, and unshielding back to a public wallet. 

---

## 4. Shielded Wallets

**Shielded Wallets** are the user-facing privacy layer. They hide balances, sender, receiver, amount, and transaction graph.

### What they provide

| Feature           | Purpose                                                     |
| ----------------- | ----------------------------------------------------------- |
| Sapling HD wallet | ZIP-32 style key derivation and diversified addresses.      |
| Shielded address  | Private address format for receiving encrypted notes.       |
| Encrypted notes   | Amount, memo, and recipient data are encrypted.             |
| Commitments       | Notes are committed to the tree without revealing contents. |
| Nullifiers        | Spent notes are marked without linking back to deposits.    |
| Viewing keys      | Auditors can see activity without spend authority.          |
| Payment proofs    | Users can selectively prove a payment happened.             |

The Shielded Wallet guide describes diversified addresses, encrypted notes, incoming viewing keys, nullifiers, and unlinkable transaction privacy.  It also includes view-key sharing, payment disclosure, and encrypted memo examples for selective disclosure and compliance-friendly workflows. 

### SDK example

```ts
import {
  DarkProtocolClient,
  DarkWallet,
  SaplingHDWallet,
  PrivacyUtils,
  NoteEncryptionUtils,
} from "@openclawdsolana/dark-sdk";

const client = await DarkProtocolClient.create({
  heliusApiKey: process.env.HELIUS_API_KEY!,
  network: "devnet",
  useSecureRpc: true,
});

const { wallet, mnemonic } = await DarkWallet.generate(client);

// Public → private
await wallet.shieldTokens(
  1_000_000_000n, // 1 SOL
  PublicKey.default
);

// Private → private
await wallet.privateTransfer(
  recipientAddress,
  500_000_000n,
  "Dark payment"
);

// Sapling address layer
const sapling = await SaplingHDWallet.fromMnemonic(mnemonic);
const defaultAddress = sapling.getDefaultAddress();
const diversified = sapling.generateDiversifiedAddresses(10);
```

---

## 5. Dark Swaps

**Dark Swaps** are private, MEV-resistant Solana swaps. They use shielded addresses, ephemeral accounts, encrypted routing, and Jupiter-style best execution so users can swap without exposing wallet identity, trade size, route intent, or strategy.

```text
Shielded Wallet
   ↓
Private quote / encrypted route
   ↓
Jupiter / routing layer
   ↓
Private settlement
   ↓
Fresh shielded address
```

The Dark DeFi architecture describes encrypted asset wrapping, FHE-style encrypted computations, dark order books, private AMMs, MEV protection, and ephemeral accounts that fund a swap, execute privately, return funds to a new shielded address, and disappear. 

### SDK example

```ts
import { DarkProtocolClient, PrivateSwapManager } from "@openclawdsolana/dark-sdk";

const client = await DarkProtocolClient.create({
  heliusApiKey: process.env.HELIUS_API_KEY!,
  network: "devnet",
});

const swapManager = new PrivateSwapManager(
  client,
  process.env.JUPITER_API_KEY
);

const quote = await swapManager.getQuote(
  inputMint,
  outputMint,
  1_000_000_000n,
  50 // 0.5% slippage
);

const swapTx = await swapManager.executePrivateSwap({
  inputMint,
  outputMint,
  inputAmount: 1_000_000_000n,
  minOutputAmount: quote.outputAmount,
  slippageBps: 50,
  userPublicKey: wallet.publicKey,
});
```

---

## 6. Dark Agents

**Dark Agents** are AI agents that operate inside Trusted Execution Environments. They can analyze markets, rebalance portfolios, route trades, manage risk, and request private swaps while keeping user prompts, completions, balances, and strategies sealed.

```text
spawn enclave
   ↓
verify quote
   ↓
seal prompt
   ↓
pay with x402 dark-shielded payment
   ↓
run inference
   ↓
write SAS receipt on-chain
```

The Dark DeFi docs define the agent layer around TEE-secured agents, attestation, market analysis, risk assessment, trade execution, and verification.  The TEE agent package section specifically lists the pipeline as enclave spawn → quote verification → sealed prompt → x402 shielded payment → inference → SAS on-chain receipt. 

### TEE agent example

```ts
import {
  ConfidentialAgent,
  ConfidentialInferenceClient,
  LocalSignerPayer,
  generateSigningKeypair,
  toBase58,
  PAYMENT_ASSETS,
} from "@openclawdsolana/dark-tee-agents";
import { address } from "@solana/kit";

const owner = address(toBase58(generateSigningKeypair().publicKey));

const agent = ConfidentialAgent.spawn({
  agentId: "dark-analyst-01",
  owner,
  model: "phala/deepseek-r1-70b-tee",
  network: "solana-devnet",
});

const requirements = agent.paymentRequirements({
  payTo: owner,
  asset: PAYMENT_ASSETS.USDC,
  atomicPrice: 10_000n, // 0.01 USDC
});

const provider = agent.localProvider(
  req => `analysis of "${req.prompt}" …`,
  requirements
);

const client = new ConfidentialInferenceClient({
  enclave: agent.quote,
  payer: new LocalSignerPayer(generateSigningKeypair(), true),
  verify: { allowedProviders: ["local-dev"] },
});

const { result, payment } = await client.infer(
  { prompt: "How should I rebalance my private portfolio?" },
  provider,
  requirements.accepts[0]
);
```

---

## 7. Dark Clawd

**Dark Clawd** is the lobster-branded private Solana AI agent: sealed conversation + shielded trade execution in one flow.

| Private          | Public                                |
| ---------------- | ------------------------------------- |
| Prompt           | Agent identity attestation            |
| Completion       | Request/response hashes               |
| Payment amount   | Commitment/proof that payment cleared |
| Trade size       | SAS receipt shell                     |
| Mints/slippage   | Fact that an attested agent ran       |
| Shielded balance | Program/account metadata              |

Your uploaded README describes `ClawdTeeAgent` as a private Solana AI agent capable of sealed conversation and shielded trade, with modules for `verifyClawdQuote`, `ConfidentialInferenceClient`, `DarkAttestationService`, x402 `LocalSignerPayer`, Dark SAS schemas, and `dark-tee` CLI commands. 

### Clawd flow

```ts
import {
  ClawdTeeAgent,
  InMemoryClawdAccount,
  verifyClawdQuote,
  PAYMENT_ASSETS,
} from "@openclawdsolana/dark-tee-agents";

const clawd = ClawdTeeAgent.spawn({
  agentId: "clawd-alpha",
  owner: ownerAddress,
  model: "dstack/claude-opus-tee",
  network: "solana-devnet",
  pricePerInference: 10_000n,
  paymentAsset: PAYMENT_ASSETS.USDC,
});

verifyClawdQuote(clawd, {
  allowedProviders: ["dstack", "sgx"],
});

const turn = await clawd.converse(
  "How should I rebalance my shielded book?",
  myModel
);

const account = new InMemoryClawdAccount({ SOL: 2_000_000_000n });

const trade = await clawd.trade(
  {
    request: "Rotate 0.5 SOL into USDC privately",
    allowedMints: [SOL_MINT, USDC_MINT],
    maxAtomicAmount: 1_000_000_000n,
    maxSlippageBps: 50,
  },
  myModel,
  account,
  account
);
```

---

## 8. SAS + x402 Private Payments

The **Solana Attestation Service** gives Dark Agents a public proof layer without exposing private payloads. The agent identity, inference receipt, model measurement, hashes, and commitments can be written on-chain while prompt text, response text, payment amount, and trade details remain sealed.

```ts
import {
  DarkAttestationService,
  DARK_SCHEMAS,
} from "@openclawdsolana/dark-tee-agents";

const sas = DarkAttestationService.fromNetwork(
  "devnet",
  process.env.HELIUS_API_KEY
);

const { credential } = await sas.createCredential({
  payer,
  authority,
  authorizedSigners: [authority.address],
});

const { schema } = await sas.createSchema({
  payer,
  authority,
  credential,
  def: DARK_SCHEMAS.agentIdentity,
});

await sas.attest({
  payer,
  authority,
  credential,
  schema,
  nonce: agent.attestationNonce,
  data: agent.identityData(),
  expiryUnixSeconds: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
});
```

The uploaded docs list `sas-lib` as the SAS client plus Dark DeFi schema extensions for program addresses, Dark schemas, agent registry, and inference helpers; they also list the SAS program address as live. 

---

## 9. Program IDs

### Current Devnet Program IDs

```text
Dark Protocol Program ID:
3KWLFYco7T2rUZkzjSSthjHGmbWmo9HAsRmvupDTomGC

Shielded Wallet Program ID:
4753b1cCrPzwr7taWWD8yrcM8dc98fTR7wCFdv1TsAbg
```

The Program Information doc lists both `dark-protocol` and `shielded-wallet` as deployed on devnet and not deployed on mainnet. 

### Attestation / Additional Protocol References

```text
Solana Attestation Service:
22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG

Dark Protocol Shielded Note Pool / Anchor settlement reference:
E8zL7h9qHjC7sMf2WCYhdqS5iLkYhPJ9yAhTfevo74jm
```

The uploaded README separately references the SAS program and an Anchor settlement program / shielded note pool ID, while the Program Information doc gives the current deployed devnet IDs for `dark-protocol` and `shielded-wallet`; keep those two categories labeled separately to avoid confusing package docs, settlement refs, and current deployed program IDs.  

---

## 10. Security Status

**Current positioning:** alpha / devnet-first / not production-ready for mainnet value until audit and production ZK circuits are complete.

Important notes:

| Area                   | Status                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sapling-style keys     | Implemented in SDK/docs.                                                                                                                            |
| Note encryption        | ChaCha20-Poly1305 model documented.                                                                                                                 |
| Commitments/nullifiers | Implemented as the core privacy model.                                                                                                              |
| Dark Protocol devnet   | Deployed.                                                                                                                                           |
| Shielded Wallet devnet | Deployed.                                                                                                                                           |
| Mainnet                | Not deployed in Program Information doc.                                                                                                            |
| ZK circuits            | Production-grade circuits still a hardening item.                                                                                                   |
| Security audit         | Required before mainnet.                                                                                                                            |
| Program keypairs       | Earlier program-ID keypairs must be considered compromised; fresh mainnet deployment should use new secure key management.                          |
| Upgrade authority      | Devnet upgrade authority keypair is currently unaccounted for, making current devnet programs effectively immutable unless recovered or redeployed. |

The Program Information doc contains the strongest warning: earlier program-ID keypairs were leaked and must be treated as compromised, while the upgrade authority keypair is unaccounted for.  It also says mainnet should wait for a reputable security audit, production ZK-SNARK circuits, Threshold ElGamal implementation, further testing, and community review. 

---

## 11. The Whole System in One Diagram

```text
                          DARK PROTOCOL
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
  Shielded Wallets           Dark Swaps                Dark Agents
        │                         │                         │
  Sapling HD keys             Jupiter routes              TEE enclaves
  Encrypted notes             Private order flow          Sealed prompts
  Commitments                 MEV resistance              Sealed completions
  Nullifiers                  Ephemeral accounts          x402 payments
  Viewing keys                Shielded settlement         SAS receipts
        │                         │                         │
        └─────────────── Dark DeFi Application Layer ───────┘
                                  │
                      Dark Clawd private AI agent
                                  │
             Converse privately + trade privately on Solana
```

---

## Final Positioning

**Dark Protocol is the private execution layer for Solana.**
**Dark DeFi** is the application suite.
**Shielded Wallets** hide balances and transfers.
**Dark Swaps** hide order flow.
**Dark Agents** hide prompts, strategy, and inference.
**Dark Clawd** brings the lobster-branded private AI trader into the loop.
**x402** pays for private machine actions.
**SAS** proves the agent ran without exposing what it saw.

```text
Dark DeFi:
Solana's speed.
Zcash's privacy.
TEE-secured agents.
x402 private payments.
Clawd in the shell.
```

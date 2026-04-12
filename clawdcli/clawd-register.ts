import {
  mintAndSubmitAgent,
  mplAgentIdentity,
} from '@metaplex-foundation/mpl-agent-registry';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity } from '@metaplex-foundation/umi';

// Connect to solanaclawd.com via Helius RPC
const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY')
  .use(mplAgentIdentity());

// Load your wallet keypair
const keypair = umi.eddsa.createKeypairFromSecretKey(mySecretKeyBytes);
umi.use(keypairIdentity(keypair));

// Register Solana Clawd agent on Metaplex Agent Registry
const result = await mintAndSubmitAgent(umi, {}, {
  wallet: umi.identity.publicKey,
  name: 'Solana Clawd',
  uri: 'https://solanaclawd.com/agent-metadata.json',
  agentMetadata: {
    type: 'agent',
    name: 'Solana Clawd',
    description: 'The Solana-native AI agent framework for autonomous operators. Built for high-frequency memecoin trading environments with real-time market data, wallet tracking, OODA-loop execution, and multi-agent orchestration.',
    services: [
      { name: 'web', endpoint: 'https://solanaclawd.com' },
      { name: 'MCP', endpoint: 'https://solanaclawd.com/mcp' },
      { name: 'A2A', endpoint: 'https://solanaclawd.com/a2a' },
    ],
    registrations: [],
    supportedTrust: ['wallet-verified', 'token-holder'],
  },
});

console.log('Asset address:', result.assetAddress);
console.log('Transaction signature:', result.signature);
console.log('View at: https://metaplex.com/agent/' + result.assetAddress);

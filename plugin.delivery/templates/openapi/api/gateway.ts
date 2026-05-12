import { createSolanaClawdPluginGateway } from '@solana-clawd/chat-plugins-gateway';

export const config = {
  runtime: 'edge',
};

export default createSolanaClawdPluginGateway();


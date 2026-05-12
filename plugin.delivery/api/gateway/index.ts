import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async (_req: VercelRequest, response: VercelResponse) => {
  response.json({
    name: '@solana-clawd/chat-plugins-gateway',
    status: 'ok',
  });
};


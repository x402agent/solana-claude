import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    alias: {
      '@': 'src',
      '@solana-clawd/chat-plugins-gateway': 'src',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov', 'text-summary'],
    },
    environment: 'node',
    globals: true,
  },
});


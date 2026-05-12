// drizzle-kit config for the solana-clawd agents schema.
// Run: `pnpm drizzle-kit generate` to produce SQL migrations.
// Provide DATABASE_URL in .env (Postgres: Neon / Supabase / local).

import type { Config } from 'drizzle-kit';

export default {
  schema: './schema/drizzle.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/solana_clawd',
  },
  strict: true,
  verbose: true,
} satisfies Config;

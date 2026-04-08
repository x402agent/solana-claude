/**
 * Supabase clients for the CLAWD web app (Next.js).
 *
 * - `supabaseBrowser` — client-side (anon key, respects RLS)
 * - `supabaseAdmin`   — server-side only (service-role key, bypasses RLS)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Browser client (safe to use in components / client-side code) ──
const browserUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const browserKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser: SupabaseClient = createClient(browserUrl, browserKey);

// ── Admin client (server-side only — API routes, server components) ──
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — admin client is server-side only');
  }
  return createClient(url, serviceKey);
}

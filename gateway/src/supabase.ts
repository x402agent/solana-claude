/**
 * Supabase client for the CLAWD Gateway.
 *
 * Uses the service-role key for server-side operations (bypasses RLS).
 * Falls back to the anon key if the service-role key is not set.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY in environment',
  );
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

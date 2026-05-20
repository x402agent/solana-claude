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

export const supabase: SupabaseClient = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : ({
      from: () => ({
        select: () => ({
          limit: async () => ({
            data: null,
            error: { code: 'SUPABASE_DISABLED', message: 'Supabase is not configured' },
          }),
        }),
      }),
    } as unknown as SupabaseClient);

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Service-role client. Bypasses RLS. Use ONLY in trusted server contexts:
// Stripe webhooks, scheduled jobs, and other authenticated server-only paths.
// Lazy-initialized so build-time page-data collection doesn't require env vars.

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase admin env vars missing (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

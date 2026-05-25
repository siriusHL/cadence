import { cookies } from 'next/headers';
import { type SupabaseClient } from '@supabase/supabase-js';
import { type Portfolio, getPrimaryPortfolio } from '@/lib/portfolio';

export const ACTIVE_PORTFOLIO_COOKIE = 'active_portfolio_id';

/**
 * Resolves which portfolio the user is viewing.
 *
 * Order of precedence:
 *   1. `active_portfolio_id` cookie — only honored if RLS still grants read
 *      access to that portfolio.
 *   2. Oldest owned portfolio (legacy `getPrimaryPortfolio` behavior).
 */
export async function getActivePortfolio(
  supabase: SupabaseClient,
  userId: string,
): Promise<Portfolio | null> {
  const cookieStore = await cookies();
  const cookieId = cookieStore.get(ACTIVE_PORTFOLIO_COOKIE)?.value;

  if (cookieId) {
    const { data } = await supabase
      .from('portfolios')
      .select('id, name, created_at')
      .eq('id', cookieId)
      .maybeSingle();
    if (data) return data;
  }

  return getPrimaryPortfolio(supabase, userId);
}

/** All portfolios the user owns. */
export async function listOwnedPortfolios(
  supabase: SupabaseClient,
  userId: string,
): Promise<Portfolio[]> {
  const { data } = await supabase
    .from('portfolios')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  return data ?? [];
}

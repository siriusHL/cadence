import { cookies } from 'next/headers';
import { type SupabaseClient } from '@supabase/supabase-js';
import { type Portfolio, getPrimaryPortfolio } from '@/lib/portfolio';

export const ACTIVE_PORTFOLIO_COOKIE = 'active_portfolio_id';

/**
 * Resolves which portfolio the user is viewing.
 *
 * Order of precedence:
 *   1. `active_portfolio_id` cookie — only honored if the user still has read
 *      access (owned or shared); RLS does the filtering.
 *   2. Oldest owned portfolio (legacy `getPrimaryPortfolio` behavior).
 *
 * Returns null when the user has neither.
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

/** All portfolios visible to the user — owned plus shared. */
export async function listVisiblePortfolios(
  supabase: SupabaseClient,
): Promise<Array<Portfolio & { owned: boolean; ownerEmail?: string | null }>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('portfolios')
    .select('id, name, created_at, user_id')
    .order('created_at', { ascending: true });

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    created_at: p.created_at,
    owned: p.user_id === user.id,
  }));
}

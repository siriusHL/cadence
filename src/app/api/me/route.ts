import { withAuth, json, tierLimits } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export const GET = withAuth({}, async ({ userId, tier }) => {
  const supabase = await getSupabaseServer();

  const [
    { data: profile },
    { count: portfolioCount },
    { data: holdingRows },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name, base_currency, tax_country').eq('id', userId).single(),
    supabase.from('portfolios').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    // RLS already scopes to caller's portfolios; selecting holdings.id is enough to count.
    supabase.from('holdings').select('id'),
  ]);

  return json({
    tier,
    profile: profile ?? null,
    usage: {
      portfolios: portfolioCount ?? 0,
      holdings: holdingRows?.length ?? 0,
    },
    limits: tierLimits(tier),
  });
});

import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { buildAllYearsCapitalGainsCsv, csvResponse } from '@/lib/export';
import { DEFAULT_RESIDENCE, type TaxResidence } from '@/lib/tax';

/**
 * GET /api/export/capital-gains-all
 * CSV of every realized sale across all fiscal years for the active
 * portfolio (FIFO basis, computed per year then concatenated). Same
 * columns as the per-year export plus a leading "Fiscal year" column.
 */
export const GET = withAuth({ minTier: 'elite' }, async ({ userId }) => {
  const supabase = await getSupabaseServer();
  const portfolio = await getActivePortfolio(supabase, userId);
  if (!portfolio) return json({ error: 'no_portfolio' }, 404);

  const { data: profile } = await supabase
    .from('profiles')
    .select('tax_country')
    .eq('id', userId)
    .maybeSingle();
  const residence = (profile?.tax_country as TaxResidence | null) ?? DEFAULT_RESIDENCE;

  const csv = await buildAllYearsCapitalGainsCsv(supabase, portfolio.id, residence);
  return csvResponse(csv, 'capital-gains-all-years.csv');
});

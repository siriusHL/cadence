import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { buildCapitalGainsCsv, csvResponse } from '@/lib/export';
import { DEFAULT_RESIDENCE, type TaxResidence } from '@/lib/tax';

/**
 * GET /api/export/capital-gains?year=YYYY
 * CSV of every realized sale in the requested fiscal year, FIFO-matched.
 * Cost-basis and gains land in EUR using each buy lot's own fx_to_base
 * (i.e. what the user actually paid in EUR at the time), matching the
 * figures shown on the Tax page.
 */
export const GET = withAuth({ minTier: 'elite' }, async ({ userId, req }) => {
  const url = new URL(req.url);
  const yearRaw = url.searchParams.get('year');
  const year = Number(yearRaw);
  if (!Number.isInteger(year) || year < 1900 || year > 2999) {
    return json({ error: 'invalid_year' }, 400);
  }

  const supabase = await getSupabaseServer();
  const portfolio = await getActivePortfolio(supabase, userId);
  if (!portfolio) return json({ error: 'no_portfolio' }, 404);

  // Residence informs the FIFO walk (only because the engine returns a
  // CapitalGainsSummary keyed by residence — the per-sale rows we emit
  // here don't depend on it).
  const { data: profile } = await supabase
    .from('profiles')
    .select('tax_country')
    .eq('id', userId)
    .maybeSingle();
  const residence = (profile?.tax_country as TaxResidence | null) ?? DEFAULT_RESIDENCE;

  const csv = await buildCapitalGainsCsv(supabase, portfolio.id, year, residence);
  return csvResponse(csv, `capital-gains-${year}.csv`);
});

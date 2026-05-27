import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { buildTaxPackXlsx, xlsxResponse } from '@/lib/export';
import { DEFAULT_RESIDENCE, type TaxResidence } from '@/lib/tax';

/**
 * GET /api/export/tax-pack?year=YYYY
 * Excel workbook (.xlsx) with two sheets — Dividends + Capital gains —
 * for the requested fiscal year. Same column layout and numbers as the
 * per-stream CSV exports; numeric cells stay numeric so Excel users can
 * SUM, filter, and re-format in place.
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('tax_country')
    .eq('id', userId)
    .maybeSingle();
  const residence = (profile?.tax_country as TaxResidence | null) ?? DEFAULT_RESIDENCE;

  const buf = await buildTaxPackXlsx(supabase, portfolio.id, year, residence);
  return xlsxResponse(buf, `tax-pack-${year}.xlsx`);
});

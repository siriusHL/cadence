import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { buildAllYearsTaxPackXlsx, xlsxResponse } from '@/lib/export';
import { DEFAULT_RESIDENCE, type TaxResidence } from '@/lib/tax';

/**
 * GET /api/export/tax-pack-all
 * Excel workbook (.xlsx) with two sheets — Dividends + Capital gains —
 * spanning every fiscal year with activity. Each sheet carries a leading
 * "Fiscal year" column so the combined data stays groupable by year.
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

  const buf = await buildAllYearsTaxPackXlsx(supabase, portfolio.id, residence);
  return xlsxResponse(buf, 'tax-pack-all-years.xlsx');
});

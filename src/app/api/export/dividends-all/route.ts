import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { buildAllYearsDividendsCsv, csvResponse } from '@/lib/export';

/**
 * GET /api/export/dividends-all
 * CSV of every dividend payment across all fiscal years for the active
 * portfolio. Same columns as the per-year export plus a leading
 * "Fiscal year" column — see lib/export.ts.
 */
export const GET = withAuth({ minTier: 'elite' }, async ({ userId }) => {
  const supabase = await getSupabaseServer();
  const portfolio = await getActivePortfolio(supabase, userId);
  if (!portfolio) return json({ error: 'no_portfolio' }, 404);

  const csv = await buildAllYearsDividendsCsv(supabase, portfolio.id);
  return csvResponse(csv, 'dividends-all-years.csv');
});

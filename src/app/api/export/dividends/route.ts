import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { buildDividendsCsv, csvResponse } from '@/lib/export';

/**
 * GET /api/export/dividends?year=YYYY
 * CSV of every dividend payment in the requested fiscal year for the
 * active portfolio. Tax-form-friendly columns (gross/withheld/net in
 * both local currency and EUR equivalents) — see lib/export.ts.
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

  const csv = await buildDividendsCsv(supabase, portfolio.id, year);
  return csvResponse(csv, `dividends-${year}.csv`);
});

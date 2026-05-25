import { revalidatePath } from 'next/cache';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';

/**
 * GET /api/holdings/:ticker
 * Returns the holding plus all its transactions. Used by the edit page.
 */
export const GET = withAuth<{ ticker: string }>({}, async ({ userId, params }) => {
  const ticker = params.ticker.toUpperCase();
  const supabase = await getSupabaseServer();

  const portfolio = await getActivePortfolio(supabase, userId);
  if (!portfolio) return json({ error: 'no_portfolio' }, 404);

  const [holdingRes, txRes, instRes] = await Promise.all([
    supabase
      .from('holdings')
      .select('id, ticker, notes, created_at')
      .eq('portfolio_id', portfolio.id)
      .eq('ticker', ticker)
      .maybeSingle(),
    supabase
      .from('transactions')
      .select('id, kind, occurred_on, quantity, price_local, fee_local, withholding_local, fx_to_base')
      .eq('portfolio_id', portfolio.id)
      .eq('ticker', ticker)
      .order('occurred_on', { ascending: true }),
    supabase
      .from('instruments')
      .select('ticker, name, currency, sector')
      .eq('ticker', ticker)
      .maybeSingle(),
  ]);

  if (!holdingRes.data) return json({ error: 'not_found' }, 404);

  return json({
    holding:    holdingRes.data,
    instrument: instRes.data,
    transactions: txRes.data ?? [],
  });
});

/**
 * DELETE /api/holdings/:ticker
 * Removes the holding row AND all of its transactions in the user's primary
 * portfolio. RLS scopes both deletes to the caller's data.
 */
export const DELETE = withAuth<{ ticker: string }>({}, async ({ userId, params }) => {
  const ticker = params.ticker.toUpperCase();
  const supabase = await getSupabaseServer();

  const portfolio = await getActivePortfolio(supabase, userId);
  if (!portfolio) return json({ error: 'no_portfolio' }, 404);

  // Delete transactions first so the cascade is explicit and visible — there
  // is no FK from transactions to holdings, both are scoped to portfolio.
  const txDel = await supabase
    .from('transactions')
    .delete()
    .eq('portfolio_id', portfolio.id)
    .eq('ticker', ticker);
  if (txDel.error) return json({ error: txDel.error.message }, 500);

  const hDel = await supabase
    .from('holdings')
    .delete()
    .eq('portfolio_id', portfolio.id)
    .eq('ticker', ticker);
  if (hDel.error) return json({ error: hDel.error.message }, 500);

  revalidatePath('/app/home');
  revalidatePath('/app/stocks');
  revalidatePath('/app/next');
  revalidatePath('/app/year');

  return json({ deleted: ticker });
});

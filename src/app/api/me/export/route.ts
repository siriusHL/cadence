import { withAuth } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

// Full data export for the current user. RLS already scopes every
// `from(...)` call to the caller, so we just SELECT * across the
// user-owned tables and bundle the rows into one JSON blob with an
// `exported_at` timestamp. Returned as a downloadable attachment so
// browsers save it directly without leaving the page.
//
// Surfaces the GDPR "right to access" obligation — the user gets
// everything Cadence stores about them in one click.

export const GET = withAuth({}, async ({ userId }) => {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: subscription },
    { data: portfolios },
    { data: holdings },
    { data: transactions },
    { data: alerts },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('subscriptions').select('tier, status, current_period_end, cancel_at_period_end, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('portfolios').select('id, name, created_at').eq('user_id', userId).order('created_at'),
    supabase.from('holdings').select('id, portfolio_id, ticker, notes, created_at'),
    supabase.from('transactions').select('id, portfolio_id, ticker, kind, occurred_on, quantity, price_local, fee_local, withholding_local, fx_to_base, created_at'),
    supabase.from('alerts').select('id, ticker, kind, threshold, active, created_at').eq('user_id', userId),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: {
      id:    userId,
      email: user?.email ?? null,
    },
    profile:      profile      ?? null,
    subscription: subscription ?? null,
    portfolios:   portfolios   ?? [],
    holdings:     holdings     ?? [],
    transactions: transactions ?? [],
    alerts:       alerts       ?? [],
  };

  const filename = `cadence-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'content-type':        'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control':       'no-store',
    },
  });
});

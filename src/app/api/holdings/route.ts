import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { enrichInstruments } from '@/lib/marketdata/enrich';

const Lot = z.object({
  quantity:    z.coerce.number().positive(),
  price_local: z.coerce.number().nonnegative(),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fee_local:   z.coerce.number().nonnegative().default(0),
});

const Body = z.object({
  ticker:      z.string().trim().min(1).max(16),
  currency:    z.string().trim().length(3).default('USD'),
  fx_to_base:  z.coerce.number().positive().default(1),
  lots:        z.array(Lot).min(1, 'at least one lot is required'),
});

/**
 * POST /api/holdings
 * Creates (or reuses) a holding for the user's primary portfolio and records
 * one buy transaction per lot. Auto-creates the portfolio on first add.
 * RLS enforces tier caps on portfolios and holdings (not transactions).
 */
export const POST = withAuth({}, async ({ userId, req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const input = { ...parsed.data, ticker: parsed.data.ticker.toUpperCase() };

  const supabase = await getSupabaseServer();

  // 1) Find or create the user's primary portfolio.
  let { data: portfolio } = await supabase
    .from('portfolios')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!portfolio) {
    const created = await supabase
      .from('portfolios')
      .insert({ user_id: userId, name: 'My portfolio' })
      .select('id')
      .single();
    if (created.error) {
      return rlsOrError(created.error, 'portfolio_cap_reached');
    }
    portfolio = created.data;
  }

  // 2) Seed instrument row so foreign keys are valid downstream.
  await supabase
    .from('instruments')
    .upsert({ ticker: input.ticker, currency: input.currency }, { onConflict: 'ticker' });

  // 3) Insert holding row. RLS enforces the per-tier holdings cap here.
  //    Idempotent on (portfolio_id, ticker) — adding more lots to an existing
  //    holding is fine.
  const holdingRes = await supabase
    .from('holdings')
    .insert({ portfolio_id: portfolio.id, ticker: input.ticker })
    .select('id')
    .single();
  if (holdingRes.error && holdingRes.error.code !== '23505') {
    return rlsOrError(holdingRes.error, 'holding_cap_reached');
  }

  // 4) Insert one buy transaction per lot.
  const txRows = input.lots.map((lot) => ({
    portfolio_id: portfolio!.id,
    ticker:       input.ticker,
    kind:         'buy' as const,
    occurred_on:  lot.occurred_on,
    quantity:     lot.quantity,
    price_local:  lot.price_local,
    fee_local:    lot.fee_local,
    fx_to_base:   input.fx_to_base,
  }));

  const txRes = await supabase.from('transactions').insert(txRows).select('id');
  if (txRes.error) {
    return json({ error: txRes.error.message }, 500);
  }

  // Eagerly enrich the new ticker so /app/stocks renders fully on the redirect.
  // Failures are non-fatal — the page's own enrich call will retry on next load.
  try {
    await enrichInstruments([input.ticker]);
  } catch { /* swallow */ }

  // Bust the App Router cache for screens that read this user's portfolio.
  revalidatePath('/app/home');
  revalidatePath('/app/stocks');
  revalidatePath('/app/next');
  revalidatePath('/app/year');

  return json({
    portfolio_id: portfolio.id,
    ticker: input.ticker,
    lots_added: txRes.data?.length ?? 0,
  }, 201);
});

function rlsOrError(
  err: { code?: string; message: string },
  reason: 'portfolio_cap_reached' | 'holding_cap_reached',
) {
  const isCap = err.code === '42501' || /row-level security/i.test(err.message);
  return json(
    isCap ? { error: 'upgrade_required', reason } : { error: err.message },
    isCap ? 402 : 500,
  );
}

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';

const Row = z.object({
  kind:        z.enum(['buy', 'sell', 'dividend']),
  occurredOn:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ticker:      z.string().trim().min(1).max(16),
  quantity:    z.number().positive(),
  priceLocal:  z.number().nonnegative(),
  feeLocal:    z.number().nonnegative().default(0),
  currency:    z.string().trim().length(3),
  fxToBase:    z.number().positive().default(1),
});

const Body = z.object({
  rows: z.array(Row).min(1).max(2000),
});

export const POST = withAuth({ feature: 'csvImport' }, async ({ userId, req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body', issues: parsed.error.issues }, 400);

  const supabase = await getSupabaseServer();
  let portfolio = await getActivePortfolio(supabase, userId);
  if (!portfolio) {
    const created = await supabase
      .from('portfolios')
      .insert({ user_id: userId, name: 'My portfolio' })
      .select('id, name, created_at')
      .single();
    if (created.error) return json({ error: created.error.message }, 500);
    portfolio = created.data;
  }
  const portfolioId = portfolio.id;

  // Normalize rows: uppercase tickers, currencies.
  const rows = parsed.data.rows.map((r) => ({
    ...r,
    ticker: r.ticker.toUpperCase(),
    currency: r.currency.toUpperCase(),
  }));

  const tickers = Array.from(new Set(rows.map((r) => r.ticker)));

  // Seed instruments rows for new tickers (admin bypasses the read-only RLS).
  const admin = supabaseAdmin();
  for (const ticker of tickers) {
    const tickerCurrency = rows.find((r) => r.ticker === ticker)!.currency;
    await admin.from('instruments').upsert(
      { ticker, currency: tickerCurrency },
      { onConflict: 'ticker', ignoreDuplicates: true },
    );
  }

  // Make sure each ticker has a holdings row in the active portfolio. Errors
  // here typically mean the user hit the per-tier holdings cap.
  const { data: existingHoldings } = await supabase
    .from('holdings')
    .select('ticker')
    .eq('portfolio_id', portfolioId);
  const existingTickerSet = new Set((existingHoldings ?? []).map((h) => h.ticker));

  const holdingsToInsert = tickers
    .filter((t) => !existingTickerSet.has(t))
    .map((ticker) => ({ portfolio_id: portfolioId, ticker }));

  if (holdingsToInsert.length > 0) {
    const holdingsRes = await supabase.from('holdings').insert(holdingsToInsert);
    if (holdingsRes.error) {
      const isCap = holdingsRes.error.code === '42501'
        || /row-level security/i.test(holdingsRes.error.message);
      return json(
        isCap
          ? { error: 'upgrade_required', reason: 'holding_cap_reached' }
          : { error: holdingsRes.error.message },
        isCap ? 402 : 500,
      );
    }
  }

  // De-duplicate against existing transactions in the same portfolio. We use
  // (ticker, kind, occurred_on, quantity, price_local) as a content key —
  // matches what a human would call "the same trade".
  const { data: existingTx } = await supabase
    .from('transactions')
    .select('ticker, kind, occurred_on, quantity, price_local')
    .eq('portfolio_id', portfolioId);

  const existingKeys = new Set(
    (existingTx ?? []).map((t) =>
      [t.ticker, t.kind, t.occurred_on, Number(t.quantity), Number(t.price_local)].join('|'),
    ),
  );

  const insertRows: Array<{
    portfolio_id: string;
    ticker: string;
    kind: 'buy' | 'sell' | 'dividend';
    occurred_on: string;
    quantity: number;
    price_local: number;
    fee_local: number;
    fx_to_base: number;
  }> = [];
  let duplicates = 0;

  for (const r of rows) {
    const key = [r.ticker, r.kind, r.occurredOn, r.quantity, r.priceLocal].join('|');
    if (existingKeys.has(key)) { duplicates++; continue; }
    existingKeys.add(key);   // guard against duplicates within the same upload too
    insertRows.push({
      portfolio_id: portfolioId,
      ticker: r.ticker,
      kind: r.kind,
      occurred_on: r.occurredOn,
      quantity: r.quantity,
      price_local: r.priceLocal,
      fee_local: r.feeLocal,
      fx_to_base: r.fxToBase,
    });
  }

  if (insertRows.length > 0) {
    const txRes = await supabase.from('transactions').insert(insertRows);
    if (txRes.error) return json({ error: txRes.error.message }, 500);
  }

  // Enrich the new tickers in the background — non-fatal.
  try { await enrichInstruments(tickers); } catch { /* swallow */ }

  revalidatePath('/app', 'layout');

  return json({
    inserted: insertRows.length,
    duplicates,
    tickers,
  }, 201);
});

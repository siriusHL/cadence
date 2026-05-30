import { z } from 'zod';
import { json } from '@/lib/auth';
import { withAdmin, logAdminAction } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { isFmpQuotaExhausted } from '@/lib/marketdata/fmp';

export const runtime = 'nodejs';

const Body = z.object({
  batch: z.number().int().min(1).max(20).optional(),
  tickers: z.array(z.string()).max(20).optional(),
});

// Manual instrument-cache refresh. Either refresh the given tickers, or pick
// the stalest `batch` instruments and re-enrich them via the shared path.
export const POST = withAdmin(async ({ email, req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body', detail: parsed.error.format() }, 400);
  const { batch, tickers: given } = parsed.data;

  let tickers: string[];
  if (given && given.length) {
    tickers = [...new Set(given.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  } else {
    const { data } = await supabaseAdmin()
      .from('instruments')
      .select('ticker, updated_at')
      .order('updated_at', { ascending: true, nullsFirst: true })
      .limit(batch ?? 8);
    tickers = ((data ?? []) as { ticker: string }[]).map((r) => r.ticker);
  }

  await enrichInstruments(tickers);

  await logAdminAction(email, 'refresh_instruments', {
    targetType: 'instruments', meta: { tickers },
  });

  return json({
    ok: true,
    attempted: tickers.length,
    tickers,
    fmpBreakerOpen: isFmpQuotaExhausted(),
  });
});

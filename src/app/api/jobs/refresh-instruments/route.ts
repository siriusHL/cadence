import { supabaseAdmin } from '@/lib/supabase/admin';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { isFmpQuotaExhausted } from '@/lib/marketdata/fmp';

/**
 * Pre-warm cron job.
 *
 * Picks the N stalest held tickers (across all users) and enriches them via
 * the standard cache cascade. Designed to run on a schedule (Vercel cron,
 * Supabase pg_cron + pg_net, or any external scheduler) — keeps FMP API
 * usage tightly bounded by only refreshing a small batch per run.
 *
 * Default budget:
 *   - BATCH=6, schedule every 4h → 36 tickers/day refreshed
 *   - FMP calls per run: ~12 (profile + dividends per ticker)
 *   - At 6 runs/day: ~72 FMP calls/day, leaving ample headroom in 250/day
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>` header.
 *       Vercel Cron sets this automatically when configured.
 */
export const runtime = 'nodejs';

const DEFAULT_BATCH = 6;

interface JobResult {
  ok: boolean;
  attempted: number;
  tickers: string[];
  fmpBreakerOpen: boolean;
  reason?: string;
  ms: number;
}

export async function GET(req: Request) { return handle(req); }
export async function POST(req: Request) { return handle(req); }

async function handle(req: Request): Promise<Response> {
  const t0 = Date.now();

  // Auth — accept either the standard Vercel Cron header or a bearer token.
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json(
      { ok: false, reason: 'CRON_SECRET not configured', attempted: 0, tickers: [], fmpBreakerOpen: false, ms: 0 } satisfies JobResult,
      { status: 500 },
    );
  }
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${expected}`) {
    return Response.json(
      { ok: false, reason: 'unauthorized', attempted: 0, tickers: [], fmpBreakerOpen: false, ms: 0 } satisfies JobResult,
      { status: 401 },
    );
  }

  // Optional ?batch=N override (for ops use); capped to 20 so a misconfig
  // can't blow the daily budget in one run.
  const url = new URL(req.url);
  const batch = Math.min(20, Math.max(1, Number(url.searchParams.get('batch')) || DEFAULT_BATCH));

  const admin = supabaseAdmin();

  // Distinct ticker set: every ticker any user holds.
  const { data: held } = await admin.from('holdings').select('ticker');
  const heldTickers = Array.from(new Set((held ?? []).map((r) => r.ticker as string)));
  if (heldTickers.length === 0) {
    return Response.json(
      { ok: true, attempted: 0, tickers: [], fmpBreakerOpen: isFmpQuotaExhausted(), ms: Date.now() - t0 } satisfies JobResult,
    );
  }

  // Order by staleness, NULL first (never enriched).
  // `created_at` is the fallback when `updated_at` matches across batch rows.
  const { data: stale } = await admin
    .from('instruments')
    .select('ticker, updated_at')
    .in('ticker', heldTickers)
    .order('updated_at', { ascending: true, nullsFirst: true })
    .limit(batch);

  // Also include any held tickers that DON'T have an instruments row yet
  // (they fall outside the IN(...) lookup, so we add them explicitly).
  const known = new Set((stale ?? []).map((r) => r.ticker as string));
  const missing = heldTickers.filter((t) => !known.has(t)).slice(0, Math.max(0, batch - (stale?.length ?? 0)));

  const tickers = [...missing, ...((stale ?? []).map((r) => r.ticker as string))].slice(0, batch);
  if (tickers.length === 0) {
    return Response.json(
      { ok: true, attempted: 0, tickers: [], fmpBreakerOpen: isFmpQuotaExhausted(), ms: Date.now() - t0 } satisfies JobResult,
    );
  }

  // Seed any missing rows so enrichInstruments has somewhere to write quotes.
  if (missing.length > 0) {
    await admin.from('instruments').upsert(
      missing.map((t) => ({ ticker: t })),
      { onConflict: 'ticker', ignoreDuplicates: true },
    );
  }

  // Hand off to the standard enrich path — same circuit breaker, same
  // singleflight de-dupe, same write paths.
  await enrichInstruments(tickers);

  return Response.json(
    {
      ok: true,
      attempted: tickers.length,
      tickers,
      fmpBreakerOpen: isFmpQuotaExhausted(),
      ms: Date.now() - t0,
    } satisfies JobResult,
  );
}

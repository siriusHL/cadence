import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getUpcomingDividends, type UpcomingPayment } from '@/lib/portfolio';
import { openToken } from '@/lib/crypto';
import {
  refreshAccessToken, importEvent, listCadenceEvents, deleteEvent,
  type CalendarEventInput,
} from '@/lib/googleCalendar';

export const runtime = 'nodejs';

const SYNC_HORIZON_DAYS = 180;

interface SyncResponse {
  ok: boolean;
  synced: number;
  pruned: number;
  errors: string[];
}

function fmtAmount(amount: number, currency: string | null): string {
  const ccy = currency ?? '';
  const digits = amount < 1 ? 4 : 2;
  return `${ccy ? ccy + ' ' : ''}${amount.toFixed(digits)}`;
}

function addDays(yyyyMmDd: string, n: number): string {
  const d = new Date(yyyyMmDd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildEvent(userId: string, p: UpcomingPayment): CalendarEventInput {
  const start = p.payDate ?? p.exDate;
  const end = addDays(start, 1); // Google all-day end is exclusive
  // iCalUID must be globally unique but stable across syncs for the same
  // dividend. Keying on (user, ticker, exDate) keeps it stable even if Google
  // pay_date arrives later — but if the issuer reschedules ex_date, we get a
  // new UID and the prune step below cleans up the stale one.
  const iCalUID = `cadence-${userId}-${p.ticker}-${p.exDate}@cadence.app`;
  const amount = fmtAmount(p.amountLocal, p.currency);
  const total = fmtAmount(p.estimatedTotalLocal, p.currency);
  const summary = p.isProjected
    ? `${p.ticker} dividend (projected) — est. ${total}`
    : `${p.ticker} dividend — est. ${total}`;
  const lines = [
    `${p.name ?? p.ticker}`,
    '',
    `Per share: ${amount}`,
    `Holding: ${p.quantity}`,
    `Estimated total: ${total}`,
    `Ex-date: ${p.exDate}`,
    p.payDate ? `Pay date: ${p.payDate}` : null,
    p.isProjected ? '' : null,
    p.isProjected ? 'Projected from issuer cadence — not yet declared.' : null,
    '',
    'Synced from Cadence.',
  ].filter((l): l is string => l !== null);
  return {
    iCalUID,
    summary,
    description: lines.join('\n'),
    startDate: start,
    endDate: end,
    extendedPrivate: {
      source: 'cadence',
      ticker: p.ticker,
      exDate: p.exDate,
      projected: p.isProjected ? '1' : '0',
    },
  };
}

export const POST = withAuth({ feature: 'googleCalendarSync' }, async ({ userId }) => {
  const admin = supabaseAdmin();
  const { data: conn } = await admin
    .from('google_calendar_connections')
    .select('refresh_token_enc, refresh_token_iv, refresh_token_tag, calendar_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!conn) {
    return json({ error: 'not_connected' }, 409);
  }

  // Decrypt + refresh the access token.
  let accessToken: string;
  try {
    const refreshToken = openToken({
      ciphertext: Buffer.from(conn.refresh_token_enc),
      iv: Buffer.from(conn.refresh_token_iv),
      tag: Buffer.from(conn.refresh_token_tag),
    });
    const refreshed = await refreshAccessToken(refreshToken);
    accessToken = refreshed.access_token;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'token_refresh_failed';
    await admin.from('google_calendar_connections').update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: 'error',
      last_sync_error: msg,
    }).eq('user_id', userId);
    return json({ error: 'token_refresh_failed', detail: msg }, 502);
  }

  const supabase = await getSupabaseServer();
  const portfolio = await getActivePortfolio(supabase, userId);
  if (!portfolio) {
    return json({ error: 'no_portfolio' }, 409);
  }

  const upcoming = await getUpcomingDividends(supabase, portfolio.id, SYNC_HORIZON_DAYS);
  const calendarId = conn.calendar_id ?? 'primary';
  const wantUids = new Set(upcoming.map((p) => `cadence-${userId}-${p.ticker}-${p.exDate}@cadence.app`));

  // Push current events. `events.import` dedupes on iCalUID server-side.
  const errors: string[] = [];
  let synced = 0;
  for (const p of upcoming) {
    const ev = buildEvent(userId, p);
    const res = await importEvent(accessToken, calendarId, ev);
    if (res.ok) {
      synced++;
    } else {
      errors.push(`${p.ticker} ${p.exDate}: ${res.status} ${res.error ?? ''}`.trim());
    }
  }

  // Prune events we previously created but no longer want (e.g. holding sold,
  // ex-date rescheduled, sync horizon shifted). We only touch events tagged
  // source=cadence, so user-owned events are never deleted.
  let pruned = 0;
  try {
    const existing = await listCadenceEvents(accessToken, calendarId);
    for (const ev of existing) {
      if (ev.status === 'cancelled') continue;
      if (!ev.iCalUID || !ev.iCalUID.startsWith(`cadence-${userId}-`)) continue;
      if (wantUids.has(ev.iCalUID)) continue;
      await deleteEvent(accessToken, calendarId, ev.id);
      pruned++;
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : 'prune_failed');
  }

  await admin.from('google_calendar_connections').update({
    last_sync_at: new Date().toISOString(),
    last_sync_status: errors.length === 0 ? 'ok' : 'error',
    last_sync_error: errors.length === 0 ? null : errors.slice(0, 5).join(' | '),
    last_sync_count: synced,
  }).eq('user_id', userId);

  return json({ ok: errors.length === 0, synced, pruned, errors } satisfies SyncResponse);
});

// System alerts — computed from portfolio state on every Alerts-page load.
//
// No persistence, no rules table, no cron. Each helper runs a self-contained
// check against the data we already have and emits zero or more AlertCard
// objects; the page concatenates them, sorts by recency, and renders.
//
// Thresholds live up top as constants — easy to tune, easy to surface in
// future user settings.

import { type SupabaseClient } from '@supabase/supabase-js';
import { type HoldingView, type PerformancePoint } from './portfolio';
import { type TaxSummary } from './tax';
import { maxDrawdown } from './marketdata/risk';

// ─── Tunable thresholds ────────────────────────────────────────────────
export const ALERT_THRESHOLDS = {
  /** Surface ex-dates within this many days. */
  exDateWindowDays:        7,
  /** Surface dividend cut/raise when |Δ| ≥ this %. */
  dividendDeltaPct:        5,
  /** A position exceeding this share-of-portfolio triggers concentration alert. */
  positionWeightPct:       10,
  /** HHI breaches "moderately concentrated" at this level. */
  hhiThreshold:            1500,
  /** Reclaimable WTH worth flagging at this EUR amount. */
  reclaimableEur:          50,
  /** Drawdown > this absolute % surfaces a risk alert (uses last 52 weeks). */
  drawdownPct:             -10,
} as const;

export type AlertKind =
  | 'ex_date_soon'
  | 'payment_today'
  | 'dividend_cut'
  | 'dividend_raise'
  | 'concentration_position'
  | 'concentration_hhi'
  | 'reclaim_threshold'
  | 'drawdown';

export type AlertSeverity = 'info' | 'positive' | 'warning' | 'negative';

export interface AlertCard {
  /** Stable key — React needs it stable across renders. */
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  body: string;
  ticker?: string;
  /** ISO date used to sort newest-first / "happening soonest" first. */
  occurredAt: string;
  /** Optional follow-up action with deep-link href + label. */
  action?: { label: string; href: string };
  /** EUR amount surfaced next to the title where applicable. */
  amountEur?: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

function fmtMoney(n: number, currency = 'EUR'): string {
  const sign = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : `${currency} `;
  return `${sign}${n.toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Per-check functions ───────────────────────────────────────────────

/** Holdings whose share-of-value exceeds the position-weight threshold. */
function checkConcentration(holdings: HoldingView[]): AlertCard[] {
  const totalValue = holdings.reduce((s, h) => s + (h.price ?? 0) * h.quantity, 0);
  if (totalValue <= 0) return [];
  const out: AlertCard[] = [];
  for (const h of holdings) {
    if (h.quantity <= 0) continue;
    const pct = ((h.price ?? 0) * h.quantity / totalValue) * 100;
    if (pct < ALERT_THRESHOLDS.positionWeightPct) continue;
    out.push({
      id:        `conc:${h.ticker}`,
      kind:      'concentration_position',
      severity:  pct >= 20 ? 'negative' : 'warning',
      title:     `${h.ticker} is ${pct.toFixed(1)}% of your portfolio`,
      body:      `${h.name ?? h.ticker} concentration above the ${ALERT_THRESHOLDS.positionWeightPct}% threshold — consider trimming or hedging.`,
      ticker:    h.ticker,
      occurredAt: today(),
      action:    { label: 'View holding', href: `/app/stocks` },
    });
  }
  return out;
}

/** Single HHI alert when portfolio crosses the concentration threshold. */
function checkHHI(holdings: HoldingView[]): AlertCard[] {
  const totalValue = holdings.reduce((s, h) => s + (h.price ?? 0) * h.quantity, 0);
  if (totalValue <= 0) return [];
  const hhi = holdings.reduce((s, h) => {
    const pct = ((h.price ?? 0) * h.quantity / totalValue) * 100;
    return s + pct * pct;
  }, 0);
  if (hhi < ALERT_THRESHOLDS.hhiThreshold) return [];
  return [{
    id:        'hhi',
    kind:      'concentration_hhi',
    severity:  hhi >= 2500 ? 'negative' : 'warning',
    title:     `Portfolio HHI is ${hhi.toFixed(0)}`,
    body:      hhi >= 2500
      ? 'Above the 2500 "highly concentrated" threshold — adding positions or rebalancing would reduce single-issuer risk.'
      : `Above the 1500 "moderately concentrated" threshold. The Diversification screen breaks down where the concentration sits.`,
    occurredAt: today(),
    action:    { label: 'Open Diversification', href: '/app/diversification' },
  }];
}

/** Reclaimable foreign WTH above the configured EUR threshold. */
function checkReclaim(summary: TaxSummary): AlertCard[] {
  if (summary.totalReclaimableEur < ALERT_THRESHOLDS.reclaimableEur) return [];
  return [{
    id:        'reclaim',
    kind:      'reclaim_threshold',
    severity:  'positive',
    title:     `€${summary.totalReclaimableEur.toFixed(0)} foreign WTH is reclaimable`,
    body:      'Over-withholding above your treaty rate can be reclaimed at source — the Tax screen lists the filing forms per country.',
    occurredAt: today(),
    amountEur: summary.totalReclaimableEur,
    action:    { label: 'Open Tax', href: '/app/tax' },
  }];
}

/** Ex-dates landing within the configured window — held tickers only. */
function checkExDates(args: {
  divs: { ticker: string; ex_date: string; pay_date: string | null; amount_local: number }[];
  holdings: HoldingView[];
}): AlertCard[] {
  const heldByT = new Map(args.holdings.map((h) => [h.ticker, h]));
  const today = new Date().toISOString().slice(0, 10);
  const horizonDate = new Date();
  horizonDate.setDate(horizonDate.getDate() + ALERT_THRESHOLDS.exDateWindowDays);
  const horizon = horizonDate.toISOString().slice(0, 10);

  const upcoming = args.divs
    .filter((d) => d.ex_date >= today && d.ex_date <= horizon)
    .filter((d) => (heldByT.get(d.ticker)?.quantity ?? 0) > 0)
    .sort((a, b) => a.ex_date.localeCompare(b.ex_date));

  return upcoming.map((d) => {
    const h = heldByT.get(d.ticker)!;
    const expected = h.quantity * d.amount_local;
    const daysLeft = daysUntil(d.ex_date);
    return {
      id:         `ex:${d.ticker}:${d.ex_date}`,
      kind:       'ex_date_soon' as const,
      severity:   'info' as const,
      title:      `${d.ticker} ex-date in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      body:       `Estimated payout ${fmtMoney(expected, h.currency ?? 'EUR')} (${h.quantity} × ${d.amount_local}) on ${d.pay_date ?? d.ex_date}.`,
      ticker:     d.ticker,
      occurredAt: d.ex_date,
      action:     { label: 'View payments', href: '/app/next' },
    };
  });
}

/** Pay-date landing today — surface it so users can reconcile with broker. */
function checkPaymentsToday(args: {
  divs: { ticker: string; pay_date: string | null; amount_local: number }[];
  holdings: HoldingView[];
}): AlertCard[] {
  const heldByT = new Map(args.holdings.map((h) => [h.ticker, h]));
  const todayStr = today();
  return args.divs
    .filter((d) => d.pay_date === todayStr)
    .filter((d) => (heldByT.get(d.ticker)?.quantity ?? 0) > 0)
    .map((d) => {
      const h = heldByT.get(d.ticker)!;
      const expected = h.quantity * d.amount_local;
      return {
        id:         `pay:${d.ticker}:${todayStr}`,
        kind:       'payment_today' as const,
        severity:   'positive' as const,
        title:      `${d.ticker} pays you today`,
        body:       `~${fmtMoney(expected, h.currency ?? 'EUR')} expected — reconcile with your broker once it lands.`,
        ticker:     d.ticker,
        occurredAt: todayStr,
        action:     { label: 'Log dividend', href: '/app/stocks' },
      };
    });
}

/**
 * Dividend cut or raise — compares the latest declared dividend amount to
 * the prior payment for the same ticker. Only fires on held tickers and
 * only when the delta is ≥ the configured threshold.
 */
function checkDividendDeltas(args: {
  divs: { ticker: string; ex_date: string; amount_local: number }[];
  holdings: HoldingView[];
}): AlertCard[] {
  const heldByT = new Map(args.holdings.map((h) => [h.ticker, h]));
  // Group by ticker; pick the two most-recent ex-dates that are PAST or today.
  const todayStr = today();
  const byT = new Map<string, { ex_date: string; amount_local: number }[]>();
  for (const d of args.divs) {
    if (d.ex_date > todayStr) continue;
    if (!byT.has(d.ticker)) byT.set(d.ticker, []);
    byT.get(d.ticker)!.push({ ex_date: d.ex_date, amount_local: d.amount_local });
  }
  const out: AlertCard[] = [];
  for (const [ticker, rows] of byT) {
    if (!heldByT.has(ticker)) continue;
    rows.sort((a, b) => b.ex_date.localeCompare(a.ex_date));
    if (rows.length < 2) continue;
    const [latest, prev] = rows;
    if (prev.amount_local <= 0) continue;
    const deltaPct = ((latest.amount_local - prev.amount_local) / prev.amount_local) * 100;
    if (Math.abs(deltaPct) < ALERT_THRESHOLDS.dividendDeltaPct) continue;
    const h = heldByT.get(ticker)!;
    const ccy = h.currency ?? 'USD';
    out.push({
      id:        `delta:${ticker}:${latest.ex_date}`,
      kind:      deltaPct >= 0 ? 'dividend_raise' : 'dividend_cut',
      severity:  deltaPct >= 0 ? 'positive' : 'negative',
      title:     deltaPct >= 0
        ? `${ticker} raised its dividend by ${deltaPct.toFixed(1)}%`
        : `${ticker} cut its dividend by ${Math.abs(deltaPct).toFixed(1)}%`,
      body:      `Latest: ${ccy} ${latest.amount_local.toFixed(4)} (ex ${latest.ex_date}). Previous: ${ccy} ${prev.amount_local.toFixed(4)} (ex ${prev.ex_date}).`,
      ticker,
      occurredAt: latest.ex_date,
      action:    { label: 'Open Coming up', href: '/app/next' },
    });
  }
  return out;
}

/** Drawdown alert from the cumulative-return series. */
function checkDrawdown(series: PerformancePoint[]): AlertCard[] {
  if (series.length < 8) return [];
  const last52 = series.slice(-52);
  const mdd = maxDrawdown(last52);
  if (mdd.ddPct > ALERT_THRESHOLDS.drawdownPct) return [];
  return [{
    id:        'drawdown',
    kind:      'drawdown',
    severity:  mdd.recoveredDate ? 'warning' : 'negative',
    title:     `${mdd.ddPct.toFixed(1)}% drawdown over the last year`,
    body:      mdd.recoveredDate
      ? `Trough ${mdd.troughDate}, recovered ${mdd.recoveredDate}. Performance screen has the full curve.`
      : `Trough ${mdd.troughDate}, not yet recovered. Worth checking allocation if this isn't expected.`,
    occurredAt: mdd.troughDate ?? today(),
    action:    { label: 'Open Performance', href: '/app/performance' },
  }];
}

// ─── Orchestrator ──────────────────────────────────────────────────────

export interface AlertInputs {
  supabase: SupabaseClient;
  portfolioId: string;
  holdings: HoldingView[];
  taxSummary: TaxSummary;
  performanceSeries: PerformancePoint[];
}

export async function getActiveAlerts(inputs: AlertInputs): Promise<AlertCard[]> {
  const { supabase, portfolioId, holdings, taxSummary, performanceSeries } = inputs;
  const tickers = holdings.map((h) => h.ticker);

  // One round-trip for the dividend rows used by ex-date / payment / cut-raise checks.
  const divsPromise = tickers.length === 0
    ? Promise.resolve({ data: [] })
    : supabase
        .from('instrument_dividends')
        .select('ticker, ex_date, pay_date, amount_local')
        .in('ticker', tickers)
        .order('ex_date', { ascending: false });

  const { data: divsData } = await divsPromise;
  const divs = (divsData ?? []).map((d) => ({
    ticker:       d.ticker,
    ex_date:      d.ex_date,
    pay_date:     d.pay_date,
    amount_local: Number(d.amount_local),
  }));

  // Run every check; concat results.
  const cards: AlertCard[] = [
    ...checkExDates({ divs, holdings }),
    ...checkPaymentsToday({ divs, holdings }),
    ...checkDividendDeltas({ divs, holdings }),
    ...checkConcentration(holdings),
    ...checkHHI(holdings),
    ...checkReclaim(taxSummary),
    ...checkDrawdown(performanceSeries),
  ];

  // Sort: most relevant first — payment-today, then nearest ex-dates, then everything else by recency.
  const severityWeight: Record<AlertSeverity, number> = {
    negative: 0, warning: 1, positive: 2, info: 3,
  };
  cards.sort((a, b) => {
    // Date-driven items (ex_date / payment_today / dividend_delta) sort by occurredAt asc when in future.
    const aFuture = a.occurredAt >= today();
    const bFuture = b.occurredAt >= today();
    if (aFuture && bFuture) return a.occurredAt.localeCompare(b.occurredAt);
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    // Past items by severity then recency.
    const sev = severityWeight[a.severity] - severityWeight[b.severity];
    if (sev !== 0) return sev;
    return b.occurredAt.localeCompare(a.occurredAt);
  });

  // Stable id-unique just in case.
  const seen = new Set<string>();
  return cards.filter((c) => seen.has(c.id) ? false : (seen.add(c.id), true));
}


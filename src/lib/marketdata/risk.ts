// Risk & ratio metrics computed on weekly return series.
//
// Inputs come from PerformancePoint / BenchmarkPoint, which store cumulative
// returnPct values. We convert to approximate per-period returns by taking
// consecutive deltas — close enough at weekly granularity for the metrics
// shown on the Performance screen. A proper time-weighted return engine
// is out of scope for v0; the values are labelled as "rolling 1y / approx"
// in the UI so the limitation is visible.
//
// Convention: all percentages are stored as numeric percent (e.g. 11.4 means
// 11.4%, not 0.114). Annualisation uses 52 weeks (good enough for a tool
// that operates on weekly closes).

export const WEEKS_PER_YEAR = 52;
export const RISK_FREE_PCT  = 3.5;  // annual; ECB-ish anchor used by the template

/** Convert cumulative-return points → per-week return deltas (in percent). */
export function weeklyDeltas(points: { returnPct: number }[]): number[] {
  if (points.length < 2) return [];
  const out: number[] = [];
  for (let i = 1; i < points.length; i++) {
    out.push(points[i].returnPct - points[i - 1].returnPct);
  }
  return out;
}

/** Sample mean. */
function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Sample standard deviation (n-1). */
function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return Math.sqrt(s / (xs.length - 1));
}

/** Sample covariance of two equal-length series. */
function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb);
  return s / (n - 1);
}

/** Annualised return (%) from a series of weekly deltas. */
function annualMean(weekly: number[]): number {
  return mean(weekly) * WEEKS_PER_YEAR;
}

/** Annualised volatility (%) from weekly deltas. */
export function volatility(weekly: number[]): number {
  return stddev(weekly) * Math.sqrt(WEEKS_PER_YEAR);
}

export function sharpe(weekly: number[], rfPct = RISK_FREE_PCT): number {
  const vol = volatility(weekly);
  if (vol === 0) return 0;
  return (annualMean(weekly) - rfPct) / vol;
}

export function sortino(weekly: number[], rfPct = RISK_FREE_PCT): number {
  const weeklyRf = rfPct / WEEKS_PER_YEAR;
  const downside = weekly.filter((w) => w < weeklyRf);
  if (downside.length < 2) return 0;
  // Downside deviation: RMS of negative deviations from rf
  let s = 0;
  for (const w of downside) s += (w - weeklyRf) ** 2;
  const ddev = Math.sqrt(s / downside.length) * Math.sqrt(WEEKS_PER_YEAR);
  if (ddev === 0) return 0;
  return (annualMean(weekly) - rfPct) / ddev;
}

/** Beta of a vs b (weekly returns). */
export function beta(a: number[], b: number[]): number {
  const varB = covariance(b, b);
  if (varB === 0) return 0;
  return covariance(a, b) / varB;
}

/** Jensen's alpha (annual %, geometric Capm form). */
export function alpha(
  portfolioWeekly: number[],
  benchmarkWeekly: number[],
  rfPct = RISK_FREE_PCT,
): number {
  const ap = annualMean(portfolioWeekly);
  const ab = annualMean(benchmarkWeekly);
  const b = beta(portfolioWeekly, benchmarkWeekly);
  return ap - (rfPct + b * (ab - rfPct));
}

/** Pearson correlation of two weekly-return series. */
export function correlation(a: number[], b: number[]): number {
  const sa = stddev(a);
  const sb = stddev(b);
  if (sa === 0 || sb === 0) return 0;
  return covariance(a, b) / (sa * sb);
}

/** Tracking error: annualised stddev of the active-return series (port − bench). */
export function trackingError(portfolioWeekly: number[], benchmarkWeekly: number[]): number {
  const n = Math.min(portfolioWeekly.length, benchmarkWeekly.length);
  const active: number[] = [];
  for (let i = 0; i < n; i++) active.push(portfolioWeekly[i] - benchmarkWeekly[i]);
  return stddev(active) * Math.sqrt(WEEKS_PER_YEAR);
}

export function infoRatio(portfolioWeekly: number[], benchmarkWeekly: number[]): number {
  const te = trackingError(portfolioWeekly, benchmarkWeekly);
  if (te === 0) return 0;
  return (annualMean(portfolioWeekly) - annualMean(benchmarkWeekly)) / te;
}

/** Max drawdown info from a cumulative-return series.
 *  Returns the peak-to-trough drawdown (negative %) and how many weeks
 *  until the series recovered to the peak (null if not recovered yet). */
export function maxDrawdown(points: { date: string; returnPct: number }[]): {
  ddPct: number;
  recoveredWeeks: number | null;
  troughDate: string | null;
  recoveredDate: string | null;
} {
  if (points.length < 2) return { ddPct: 0, recoveredWeeks: null, troughDate: null, recoveredDate: null };
  let peakIdx = 0;
  let troughIdx = 0;
  let worstDD = 0;
  for (let i = 0; i < points.length; i++) {
    if (points[i].returnPct > points[peakIdx].returnPct) peakIdx = i;
    const dd = points[i].returnPct - points[peakIdx].returnPct;
    if (dd < worstDD) {
      worstDD = dd;
      troughIdx = i;
    }
  }
  if (worstDD === 0) return { ddPct: 0, recoveredWeeks: null, troughDate: null, recoveredDate: null };
  // Recovery: first index after trough where return >= the prior peak.
  const peakValue = points[peakIdx].returnPct;
  let recoveredIdx: number | null = null;
  for (let i = troughIdx + 1; i < points.length; i++) {
    if (points[i].returnPct >= peakValue) { recoveredIdx = i; break; }
  }
  return {
    ddPct: worstDD,
    recoveredWeeks: recoveredIdx == null ? null : recoveredIdx - troughIdx,
    troughDate: points[troughIdx].date,
    recoveredDate: recoveredIdx == null ? null : points[recoveredIdx].date,
  };
}

/** % of months where the compounded return was positive. */
export function winRateMonthly(points: { date: string; returnPct: number }[]): {
  ratePct: number;
  winMonths: number;
  totalMonths: number;
} {
  if (points.length < 2) return { ratePct: 0, winMonths: 0, totalMonths: 0 };
  // Bucket cumulative-return points by month (YYYY-MM). For each month
  // compute returnPct[end_of_month] − returnPct[start_of_prev_month_end].
  // First month uses its own first vs last point.
  const monthly = new Map<string, number[]>();
  for (const p of points) {
    const ym = p.date.slice(0, 7);
    if (!monthly.has(ym)) monthly.set(ym, []);
    monthly.get(ym)!.push(p.returnPct);
  }
  const months = [...monthly.keys()].sort();
  let prevEnd: number | null = null;
  let wins = 0;
  let total = 0;
  for (const m of months) {
    const arr = monthly.get(m)!;
    const end = arr[arr.length - 1];
    const start = prevEnd ?? arr[0];
    const ret = end - start;
    if (Math.abs(ret) < 1e-9 && prevEnd == null) {
      // Skip the very first month if we have only one point in it.
    } else {
      total += 1;
      if (ret > 0) wins += 1;
    }
    prevEnd = end;
  }
  if (total === 0) return { ratePct: 0, winMonths: 0, totalMonths: 0 };
  return { ratePct: (wins / total) * 100, winMonths: wins, totalMonths: total };
}

/** Latest rolling window of weekly deltas — used by "rolling 1y" metrics. */
export function lastNWeeks(weekly: number[], n: number): number[] {
  return weekly.slice(Math.max(0, weekly.length - n));
}

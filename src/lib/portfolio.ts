import { type SupabaseClient } from '@supabase/supabase-js';

export interface Portfolio {
  id: string;
  name: string;
  created_at: string;
}

export interface HoldingView {
  ticker: string;
  notes: string | null;
  quantity: number;          // sum(buys) - sum(sells)
  costBasisLocal: number;    // average cost in instrument currency
  costBasisBase: number;     // converted to user's base currency at trade time
  // Joined market data (nullable if not yet cached)
  name: string | null;
  currency: string | null;
  sector: string | null;
  price: number | null;
  fwdYieldPct: number | null;
  fwdDivAnnualLocal: number | null;
}

export interface UpcomingPayment {
  ticker: string;
  name: string | null;
  exDate: string;
  payDate: string | null;
  amountLocal: number;
  quantity: number;
  estimatedTotalLocal: number;
  currency: string | null;
  daysUntil: number;
  /** True when ex-date was projected from cadence (issuer hasn't declared yet). */
  isProjected: boolean;
}

export interface MonthlyIncome {
  month: number;     // 1-12
  totalBase: number; // already converted to base currency
}

export interface MonthOverview {
  /** 0-11 — matches JS Date.getMonth() */
  month: number;
  /** Calendar year of this bucket (lets the same shape work for multi-year ranges). */
  year: number;
  /**
   * Dividends that have already happened this month. Combines:
   *   - Manual `kind='dividend'` transactions (truth, if logged)
   *   - Auto-credit from past ex-dates × quantity-held-at-ex-date
   */
  received: number;
  /** Sum of projected/expected dividend payments in that month (per-share × held qty). */
  expected: number;
  /** Per-ticker breakdown for chart tooltips. */
  byTicker: MonthTickerLine[];
}

export interface PortfolioSummary {
  totalValue: number;             // Σ qty × current price (instrument-local)
  costBasis: number;              // Σ buy qty × buy price (+ fees)
  unrealizedPL: number;           // value - cost
  unrealizedPLPct: number;        // %
  forwardAnnualIncome: number;    // Σ qty × fwd_div_annual_local
  forwardYieldPct: number;        // fwdIncome / value × 100
  yieldOnCostPct: number;         // fwdIncome / cost × 100
  positionsCount: number;
  countriesCount: number;
  ytdReceived: number;            // received Jan 1 → today
  t12mReceived: number;           // received last 12 months
}

export interface Contributor {
  ticker: string;
  name: string | null;
  forwardAnnualLocal: number;     // qty × fwd_div_annual_local
  yieldPct: number | null;
  quantity: number;
}

export interface PerformancePoint {
  /** YYYY-MM-DD — week-end (Friday close typically) */
  date: string;
  value: number;
  cost: number;
  returnPct: number;              // (value - cost) / cost × 100
}

export interface YearEvent {
  ticker: string;
  name: string | null;
  exDate: string;          // YYYY-MM-DD
  amountLocal: number;     // per-share dividend amount
  quantity: number;        // qty held on ex-date
  grossLocal: number;      // amount × quantity
  currency: string | null;
  isPast: boolean;
  isProjected: boolean;    // true if from synthesis / cadence rollforward
}

export interface MonthTickerLine {
  ticker: string;
  name: string | null;
  received: number;
  expected: number;
}

export async function getPrimaryPortfolio(
  supabase: SupabaseClient,
  userId: string,
): Promise<Portfolio | null> {
  const { data } = await supabase
    .from('portfolios')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function getHoldingsView(
  supabase: SupabaseClient,
  portfolioId: string,
): Promise<HoldingView[]> {
  // Fetch holdings + transactions + instrument cache in parallel.
  const [holdingsRes, txRes] = await Promise.all([
    supabase
      .from('holdings')
      .select('ticker, notes')
      .eq('portfolio_id', portfolioId),
    supabase
      .from('transactions')
      .select('ticker, kind, quantity, price_local, fx_to_base')
      .eq('portfolio_id', portfolioId)
      .in('kind', ['buy', 'sell']),
  ]);

  const holdings = holdingsRes.data ?? [];
  if (holdings.length === 0) return [];

  const tickers = holdings.map((h) => h.ticker);
  const [instrumentsRes, quotesRes, fundamentalsRes] = await Promise.all([
    supabase.from('instruments').select('ticker, name, currency, sector').in('ticker', tickers),
    supabase.from('instrument_quotes').select('ticker, price').in('ticker', tickers),
    supabase
      .from('instrument_fundamentals')
      .select('ticker, fwd_yield_pct, fwd_div_annual_local')
      .in('ticker', tickers),
  ]);

  const instrumentsByTicker = new Map(instrumentsRes.data?.map((r) => [r.ticker, r]) ?? []);
  const quotesByTicker = new Map(quotesRes.data?.map((r) => [r.ticker, r]) ?? []);
  const fundByTicker = new Map(fundamentalsRes.data?.map((r) => [r.ticker, r]) ?? []);

  // Aggregate quantity + avg cost per ticker from buy/sell rows.
  const aggByTicker = new Map<string, { qty: number; costLocal: number; costBase: number }>();
  for (const t of txRes.data ?? []) {
    const a = aggByTicker.get(t.ticker) ?? { qty: 0, costLocal: 0, costBase: 0 };
    const sign = t.kind === 'buy' ? 1 : -1;
    a.qty += sign * Number(t.quantity);
    if (t.kind === 'buy') {
      // Running weighted cost — simple FIFO/avg hybrid; refine in P1.
      a.costLocal += Number(t.quantity) * Number(t.price_local);
      a.costBase += Number(t.quantity) * Number(t.price_local) * Number(t.fx_to_base);
    }
    aggByTicker.set(t.ticker, a);
  }

  return holdings.map((h) => {
    const agg = aggByTicker.get(h.ticker) ?? { qty: 0, costLocal: 0, costBase: 0 };
    const inst = instrumentsByTicker.get(h.ticker);
    const quote = quotesByTicker.get(h.ticker);
    const fund = fundByTicker.get(h.ticker);
    return {
      ticker: h.ticker,
      notes: h.notes,
      quantity: agg.qty,
      costBasisLocal: agg.qty > 0 ? agg.costLocal / agg.qty : 0,
      costBasisBase: agg.qty > 0 ? agg.costBase / agg.qty : 0,
      name: inst?.name ?? null,
      currency: inst?.currency ?? null,
      sector: inst?.sector ?? null,
      price: quote?.price ? Number(quote.price) : null,
      fwdYieldPct: fund?.fwd_yield_pct ? Number(fund.fwd_yield_pct) : null,
      fwdDivAnnualLocal: fund?.fwd_div_annual_local ? Number(fund.fwd_div_annual_local) : null,
    };
  });
}

/** Add N months to a date (handles month-end correctly enough for div cadences). */
function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

export async function getUpcomingDividends(
  supabase: SupabaseClient,
  portfolioId: string,
  days = 60,
): Promise<UpcomingPayment[]> {
  const holdings = await getHoldingsView(supabase, portfolioId);
  const active = holdings.filter((h) => h.quantity > 0);
  if (active.length === 0) return [];

  const tickers = active.map((h) => h.ticker);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const horizon = new Date(today.getTime() + days * 86400_000);
  const horizonStr = horizon.toISOString().slice(0, 10);

  // 1) Actually-declared future ex-dates from FMP.
  const { data: actualFutures } = await supabase
    .from('instrument_dividends')
    .select('ticker, ex_date, pay_date, amount_local')
    .in('ticker', tickers)
    .gte('ex_date', todayStr)
    .lte('ex_date', horizonStr)
    .order('ex_date', { ascending: true });

  const tickersWithFuture = new Set((actualFutures ?? []).map((d) => d.ticker));
  const needProjection = tickers.filter((t) => !tickersWithFuture.has(t));

  // 2) For tickers without a declared future ex-date, project from latest past
  //    ex-date + payout frequency.
  const projected: { ticker: string; ex_date: string; pay_date: string | null; amount_local: number }[] = [];
  if (needProjection.length > 0) {
    const [latestPastRes, instrumentsRes] = await Promise.all([
      supabase
        .from('instrument_dividends')
        .select('ticker, ex_date, pay_date, amount_local')
        .in('ticker', needProjection)
        .lt('ex_date', todayStr)
        .order('ex_date', { ascending: false }),
      supabase
        .from('instruments')
        .select('ticker, payout_freq')
        .in('ticker', needProjection),
    ]);

    const latestByT = new Map<string, { ex_date: string; pay_date: string | null; amount_local: number }>();
    for (const row of latestPastRes.data ?? []) {
      if (!latestByT.has(row.ticker)) latestByT.set(row.ticker, row);
    }
    const freqByT = new Map(
      (instrumentsRes.data ?? [])
        .filter((r) => r.payout_freq != null)
        .map((r) => [r.ticker, r.payout_freq as number]),
    );

    for (const t of needProjection) {
      const last = latestByT.get(t);
      const freq = freqByT.get(t);
      if (!last || !freq) continue;
      const intervalMonths = Math.max(1, Math.round(12 / freq));
      let exDate = new Date(last.ex_date);
      // Walk forward until ex-date is in the future. Safeguard against runaway loops.
      for (let i = 0; i < 24 && exDate <= today; i++) {
        exDate = addMonths(exDate, intervalMonths);
      }
      if (exDate <= today || exDate > horizon) continue;
      projected.push({
        ticker:       t,
        ex_date:      exDate.toISOString().slice(0, 10),
        pay_date:     null,
        amount_local: Number(last.amount_local),
      });
    }
  }

  const merged = [
    ...(actualFutures ?? []).map((d) => ({ ...d, isProjected: false })),
    ...projected.map((d) => ({ ...d, isProjected: true })),
  ].sort((a, b) => a.ex_date.localeCompare(b.ex_date));

  return merged.map((d) => {
    const h = active.find((x) => x.ticker === d.ticker)!;
    const exDate = new Date(d.ex_date);
    const daysUntil = Math.max(0, Math.ceil((exDate.getTime() - today.getTime()) / 86400_000));
    return {
      ticker: d.ticker,
      name: h.name,
      exDate: d.ex_date,
      payDate: d.pay_date,
      amountLocal: Number(d.amount_local),
      quantity: h.quantity,
      estimatedTotalLocal: Number(d.amount_local) * h.quantity,
      currency: h.currency,
      daysUntil,
      isProjected: d.isProjected,
    };
  });
}

/**
 * Combined "year so far + forecast" for the Free tier Your Year screen.
 * Each month gets:
 *   received — actually-logged dividend transactions (truth, can be 0)
 *   expected — projection from each held ticker's cadence, distributed across
 *              the year by walking the latest known ex-date forward/backward.
 */
export async function getYearOverview(
  supabase: SupabaseClient,
  portfolioId: string,
  year: number,
): Promise<MonthOverview[]> {
  const months: MonthOverview[] = Array.from({ length: 12 }, (_, i) => ({
    month: i, year, received: 0, expected: 0, byTicker: [],
  }));
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Per-ticker running tallies for the chart tooltip
  type Tally = { name: string | null; received: number; expected: number };
  const tallyByMonthTicker: Map<string, Tally>[] = Array.from({ length: 12 }, () => new Map());

  // 0) Holdings (with current quantity + display name)
  const holdings = (await getHoldingsView(supabase, portfolioId)).filter((h) => h.quantity > 0);
  if (holdings.length === 0) return months;
  const tickers = holdings.map((h) => h.ticker);
  const nameByT = new Map(holdings.map((h) => [h.ticker, h.name]));

  // 1) Manual dividend transactions (truth, if any)
  const { data: txDivs } = await supabase
    .from('transactions')
    .select('ticker, occurred_on, quantity, price_local, fx_to_base, withholding_local')
    .eq('portfolio_id', portfolioId)
    .eq('kind', 'dividend')
    .gte('occurred_on', `${year}-01-01`)
    .lte('occurred_on', `${year}-12-31`);

  const tickersWithManual = new Set<string>();
  for (const t of txDivs ?? []) {
    const m = new Date(t.occurred_on).getMonth();
    const gross = Number(t.quantity) * Number(t.price_local);
    const net = gross - Number(t.withholding_local ?? 0);
    const amt = net * Number(t.fx_to_base ?? 1);
    months[m].received += amt;
    addLine(tallyByMonthTicker[m], t.ticker, nameByT.get(t.ticker) ?? null, amt, 0);
    tickersWithManual.add(t.ticker);
  }

  // 2) For tickers without manual transactions, auto-derive received + expected
  //    from holdings × ex-date schedule.
  // 2a) Pull all buy/sell transactions, sorted, so we can compute quantity-at-date.
  const { data: txTrades } = await supabase
    .from('transactions')
    .select('ticker, kind, occurred_on, quantity')
    .eq('portfolio_id', portfolioId)
    .in('kind', ['buy', 'sell'])
    .order('occurred_on', { ascending: true });

  const tradesByT = new Map<string, { kind: string; date: Date; qty: number }[]>();
  for (const t of txTrades ?? []) {
    if (!tradesByT.has(t.ticker)) tradesByT.set(t.ticker, []);
    tradesByT.get(t.ticker)!.push({
      kind: t.kind,
      date: new Date(t.occurred_on),
      qty: Number(t.quantity),
    });
  }

  // 2b) Pull dividend cadence + every known ex-date
  const [divsRes, instrumentsRes] = await Promise.all([
    supabase
      .from('instrument_dividends')
      .select('ticker, ex_date, amount_local')
      .in('ticker', tickers)
      .order('ex_date', { ascending: false }),
    supabase
      .from('instruments')
      .select('ticker, payout_freq')
      .in('ticker', tickers),
  ]);

  const freqByT = new Map(
    (instrumentsRes.data ?? [])
      .filter((r) => r.payout_freq != null)
      .map((r) => [r.ticker, r.payout_freq as number]),
  );

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const exDatesByT = new Map<string, { date: Date; amount: number }[]>();
  for (const row of divsRes.data ?? []) {
    if (!exDatesByT.has(row.ticker)) exDatesByT.set(row.ticker, []);
    exDatesByT.get(row.ticker)!.push({ date: new Date(row.ex_date), amount: Number(row.amount_local) });
  }

  // 2c) For each ticker, project forward + backward inside the year if needed
  for (const ticker of tickers) {
    if (tickersWithManual.has(ticker)) continue;  // user is logging this one manually
    const known = exDatesByT.get(ticker) ?? [];
    const freq = freqByT.get(ticker);
    if (known.length === 0 || !freq) continue;

    const intervalMonths = Math.max(1, Math.round(12 / freq));
    const anchor = known[0];
    // Forward
    let d = new Date(anchor.date);
    while (d <= yearEnd) {
      if (d >= yearStart && !known.some((k) => sameDay(k.date, d))) {
        known.push({ date: new Date(d), amount: anchor.amount });
      }
      d = addMonths(d, intervalMonths);
    }
    // Backward
    d = addMonths(new Date(anchor.date), -intervalMonths);
    while (d >= yearStart) {
      if (d <= yearEnd && !known.some((k) => sameDay(k.date, d))) {
        known.push({ date: new Date(d), amount: anchor.amount });
      }
      d = addMonths(d, -intervalMonths);
    }
  }

  // 2d) Credit each ex-date to received (past) or expected (future), gated by
  //     whether the user actually held shares on that ex-date.
  for (const ticker of tickers) {
    if (tickersWithManual.has(ticker)) continue;
    const entries = exDatesByT.get(ticker);
    if (!entries) continue;
    const trades = tradesByT.get(ticker) ?? [];
    for (const e of entries) {
      if (e.date < yearStart || e.date > yearEnd) continue;
      const heldQty = quantityAt(trades, e.date);
      if (heldQty <= 0) continue;
      const amount = e.amount * heldQty;
      const m = e.date.getMonth();
      const isPast = e.date.toISOString().slice(0, 10) < todayStr;
      if (isPast) {
        months[m].received += amount;
        addLine(tallyByMonthTicker[m], ticker, nameByT.get(ticker) ?? null, amount, 0);
      } else {
        months[m].expected += amount;
        addLine(tallyByMonthTicker[m], ticker, nameByT.get(ticker) ?? null, 0, amount);
      }
    }
  }

  // Flatten per-ticker tallies into sorted arrays for the tooltip
  months.forEach((m, i) => {
    const lines: MonthTickerLine[] = [];
    for (const [ticker, line] of tallyByMonthTicker[i]) {
      lines.push({ ticker, name: line.name, received: line.received, expected: line.expected });
    }
    lines.sort((a, b) => (b.received + b.expected) - (a.received + a.expected));
    m.byTicker = lines;
  });

  return months;
}

/**
 * Portfolio-wide summary numbers for the Pro dashboard.
 * All amounts are in instrument-local currency for v0 (multi-FX rollup in P1).
 */
export async function getPortfolioSummary(
  supabase: SupabaseClient,
  portfolioId: string,
): Promise<PortfolioSummary> {
  const holdings = (await getHoldingsView(supabase, portfolioId)).filter((h) => h.quantity > 0);

  let totalValue = 0;
  let costBasis = 0;
  let forwardAnnualIncome = 0;
  const countries = new Set<string>();
  for (const h of holdings) {
    totalValue += (h.price ?? 0) * h.quantity;
    costBasis += h.costBasisLocal * h.quantity;
    forwardAnnualIncome += (h.fwdDivAnnualLocal ?? 0) * h.quantity;
    if (h.sector) countries.add(h.sector); // placeholder — schema doesn't surface country on view yet
  }
  const unrealizedPL = totalValue - costBasis;
  const unrealizedPLPct = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;
  const forwardYieldPct = totalValue > 0 ? (forwardAnnualIncome / totalValue) * 100 : 0;
  const yieldOnCostPct = costBasis > 0 ? (forwardAnnualIncome / costBasis) * 100 : 0;

  // Pull country directly from instruments for a more accurate count
  if (holdings.length > 0) {
    const { data } = await supabase
      .from('instruments')
      .select('ticker, country')
      .in('ticker', holdings.map((h) => h.ticker));
    countries.clear();
    for (const row of data ?? []) {
      if (row.country) countries.add(row.country);
    }
  }

  // Year-to-date received
  const now = new Date();
  const year = now.getFullYear();
  const ytd = await getYearOverview(supabase, portfolioId, year);
  const currentMonth = now.getMonth();
  const ytdReceived = ytd.slice(0, currentMonth + 1).reduce((s, m) => s + m.received, 0);

  // Trailing 12 months — span across two calendar years
  const t12 = await getIncomeRhythm(supabase, portfolioId, 12, 0);
  const t12mReceived = t12.reduce((s, m) => s + m.received, 0);

  return {
    totalValue,
    costBasis,
    unrealizedPL,
    unrealizedPLPct,
    forwardAnnualIncome,
    forwardYieldPct,
    yieldOnCostPct,
    positionsCount: holdings.length,
    countriesCount: countries.size,
    ytdReceived,
    t12mReceived,
  };
}

/**
 * Get a rolling rhythm of MonthOverview buckets covering `pastMonths` ending
 * today's month, plus `futureMonths` projected ones. Used by the 18-month
 * dashboard chart (default 12 past + 6 forecast).
 */
export async function getIncomeRhythm(
  supabase: SupabaseClient,
  portfolioId: string,
  pastMonths = 12,
  futureMonths = 6,
): Promise<MonthOverview[]> {
  const now = new Date();
  const startYear = new Date(now.getFullYear(), now.getMonth() - pastMonths + 1, 1).getFullYear();
  const endYear = new Date(now.getFullYear(), now.getMonth() + futureMonths, 1).getFullYear();

  // Pull each calendar year overview the range touches, then slice the window.
  const years = new Set<number>();
  for (let y = startYear; y <= endYear; y++) years.add(y);
  const yearMaps = new Map<number, MonthOverview[]>();
  for (const y of years) {
    yearMaps.set(y, await getYearOverview(supabase, portfolioId, y));
  }

  const out: MonthOverview[] = [];
  for (let i = -pastMonths + 1; i <= futureMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const yearMonths = yearMaps.get(y);
    if (!yearMonths) continue;
    out.push(yearMonths[m]);
  }
  return out;
}

/**
 * Top N positions by forward annual dividend income.
 */
export async function getTopContributors(
  supabase: SupabaseClient,
  portfolioId: string,
  n = 6,
): Promise<Contributor[]> {
  const holdings = (await getHoldingsView(supabase, portfolioId)).filter((h) => h.quantity > 0);
  return holdings
    .map((h) => ({
      ticker: h.ticker,
      name: h.name,
      forwardAnnualLocal: (h.fwdDivAnnualLocal ?? 0) * h.quantity,
      yieldPct: h.fwdYieldPct,
      quantity: h.quantity,
    }))
    .filter((c) => c.forwardAnnualLocal > 0)
    .sort((a, b) => b.forwardAnnualLocal - a.forwardAnnualLocal)
    .slice(0, n);
}

/**
 * All dividend events in `year` for active holdings — past + future, declared
 * + projected. Used by the Calendar heatmap and next-payments table.
 */
export async function getYearEvents(
  supabase: SupabaseClient,
  portfolioId: string,
  year: number,
): Promise<YearEvent[]> {
  const holdings = (await getHoldingsView(supabase, portfolioId)).filter((h) => h.quantity > 0);
  if (holdings.length === 0) return [];

  const tickers = holdings.map((h) => h.ticker);
  const nameByT = new Map(holdings.map((h) => [h.ticker, h.name]));
  const ccyByT = new Map(holdings.map((h) => [h.ticker, h.currency]));

  // Trades for quantity-at-date
  const { data: txTrades } = await supabase
    .from('transactions')
    .select('ticker, kind, occurred_on, quantity')
    .eq('portfolio_id', portfolioId)
    .in('kind', ['buy', 'sell'])
    .order('occurred_on', { ascending: true });

  const tradesByT = new Map<string, { kind: string; date: Date; qty: number }[]>();
  for (const t of txTrades ?? []) {
    if (!tradesByT.has(t.ticker)) tradesByT.set(t.ticker, []);
    tradesByT.get(t.ticker)!.push({
      kind: t.kind, date: new Date(t.occurred_on), qty: Number(t.quantity),
    });
  }

  // Recorded ex-dates per ticker
  const { data: divsRes } = await supabase
    .from('instrument_dividends')
    .select('ticker, ex_date, amount_local')
    .in('ticker', tickers)
    .order('ex_date', { ascending: false });

  // Payout frequencies
  const { data: instRes } = await supabase
    .from('instruments')
    .select('ticker, payout_freq')
    .in('ticker', tickers);
  const freqByT = new Map(
    (instRes ?? [])
      .filter((r) => r.payout_freq != null)
      .map((r) => [r.ticker, r.payout_freq as number]),
  );

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Per-ticker map of ex-dates (declared first, then projection fills gaps)
  type Entry = { date: Date; amount: number; declared: boolean };
  const byTicker = new Map<string, Entry[]>();
  for (const row of divsRes ?? []) {
    if (!byTicker.has(row.ticker)) byTicker.set(row.ticker, []);
    byTicker.get(row.ticker)!.push({
      date: new Date(row.ex_date),
      amount: Number(row.amount_local),
      declared: true,
    });
  }

  for (const ticker of tickers) {
    const known = byTicker.get(ticker) ?? [];
    if (known.length === 0) continue;
    const freq = freqByT.get(ticker);
    if (!freq) continue;
    const interval = Math.max(1, Math.round(12 / freq));
    const anchor = known[0];

    // Project forward
    let d = new Date(anchor.date);
    while (d <= yearEnd) {
      if (d >= yearStart && !known.some((k) => sameDay(k.date, d))) {
        known.push({ date: new Date(d), amount: anchor.amount, declared: false });
      }
      d = addMonths(d, interval);
    }
    // Project backward
    d = addMonths(new Date(anchor.date), -interval);
    while (d >= yearStart) {
      if (d <= yearEnd && !known.some((k) => sameDay(k.date, d))) {
        known.push({ date: new Date(d), amount: anchor.amount, declared: false });
      }
      d = addMonths(d, -interval);
    }
    byTicker.set(ticker, known);
  }

  const out: YearEvent[] = [];
  for (const ticker of tickers) {
    const entries = byTicker.get(ticker);
    if (!entries) continue;
    const trades = tradesByT.get(ticker) ?? [];
    for (const e of entries) {
      if (e.date < yearStart || e.date > yearEnd) continue;
      const qty = quantityAt(trades, e.date);
      if (qty <= 0) continue;
      const exStr = e.date.toISOString().slice(0, 10);
      out.push({
        ticker,
        name: nameByT.get(ticker) ?? null,
        exDate: exStr,
        amountLocal: e.amount,
        quantity: qty,
        grossLocal: e.amount * qty,
        currency: ccyByT.get(ticker) ?? null,
        isPast: exStr < todayStr,
        isProjected: !e.declared,
      });
    }
  }
  out.sort((a, b) => a.exDate.localeCompare(b.exDate));
  return out;
}

/**
 * Cumulative portfolio performance series, weekly.
 * For each week-end, value = Σ (qty held × close for that week),
 *                  cost  = Σ (buy qty × buy price + fees) up to that date.
 *
 * Only includes weeks at-or-after the user's first transaction. Tickers with
 * gaps in `instrument_history` use their nearest-prior known close (carry).
 */
export async function getPerformanceSeries(
  supabase: SupabaseClient,
  portfolioId: string,
  weeks = 104,
): Promise<PerformancePoint[]> {
  // 1) Trades — drive qty-at-date and cost basis accumulation.
  const { data: trades } = await supabase
    .from('transactions')
    .select('ticker, kind, occurred_on, quantity, price_local, fee_local, fx_to_base')
    .eq('portfolio_id', portfolioId)
    .in('kind', ['buy', 'sell'])
    .order('occurred_on', { ascending: true });
  if (!trades || trades.length === 0) return [];

  const firstDate = new Date(trades[0].occurred_on);
  const tickers = Array.from(new Set(trades.map((t) => t.ticker)));

  // 2) Weekly closes for all held tickers — pulled in bulk.
  const start = new Date();
  start.setDate(start.getDate() - weeks * 7);
  const startStr = start.toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from('instrument_history')
    .select('ticker, date, close')
    .in('ticker', tickers)
    .gte('date', startStr)
    .order('date', { ascending: true });

  // Index by ticker → array of {date, close}, sorted asc
  const byTicker = new Map<string, { date: string; close: number }[]>();
  for (const r of rows ?? []) {
    if (!byTicker.has(r.ticker)) byTicker.set(r.ticker, []);
    byTicker.get(r.ticker)!.push({ date: r.date, close: Number(r.close) });
  }

  // 3) Build the union of all week-end dates we have data for.
  const weekDates = Array.from(
    new Set((rows ?? []).map((r) => r.date)),
  ).sort();

  const out: PerformancePoint[] = [];
  for (const weekStr of weekDates) {
    const weekDate = new Date(weekStr);
    if (weekDate < firstDate) continue;  // skip pre-portfolio weeks

    let value = 0;
    let cost = 0;
    let validTickers = 0;

    for (const ticker of tickers) {
      // Quantity held on this date
      let qty = 0;
      let tickerCost = 0;
      for (const t of trades) {
        if (t.ticker !== ticker) continue;
        const td = new Date(t.occurred_on);
        if (td > weekDate) break;
        if (t.kind === 'buy') {
          qty += Number(t.quantity);
          tickerCost += Number(t.quantity) * Number(t.price_local) + Number(t.fee_local);
        } else if (t.kind === 'sell') {
          qty -= Number(t.quantity);
          // Average-cost basis reduction
          const sellRatio = Number(t.quantity) / (qty + Number(t.quantity)) || 0;
          tickerCost -= tickerCost * sellRatio;
        }
      }
      if (qty <= 0) continue;

      // Find the close on/before this week
      const closes = byTicker.get(ticker) ?? [];
      let close: number | null = null;
      for (const c of closes) {
        if (c.date > weekStr) break;
        close = c.close;
      }
      if (close == null) continue;
      value += qty * close;
      cost += tickerCost;
      validTickers++;
    }

    if (validTickers === 0 || cost === 0) continue;
    const returnPct = ((value - cost) / cost) * 100;
    out.push({ date: weekStr, value, cost, returnPct });
  }
  return out;
}

function quantityAt(trades: { kind: string; date: Date; qty: number }[], onDate: Date): number {
  let q = 0;
  for (const t of trades) {
    if (t.date > onDate) break;
    if (t.kind === 'buy') q += t.qty;
    else if (t.kind === 'sell') q -= t.qty;
  }
  return q;
}

function addLine(
  map: Map<string, { name: string | null; received: number; expected: number }>,
  ticker: string,
  name: string | null,
  received: number,
  expected: number,
) {
  const cur = map.get(ticker) ?? { name, received: 0, expected: 0 };
  cur.received += received;
  cur.expected += expected;
  cur.name = cur.name ?? name;
  map.set(ticker, cur);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

export async function getMonthlyDividendIncome(
  supabase: SupabaseClient,
  portfolioId: string,
  year: number,
): Promise<MonthlyIncome[]> {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const { data } = await supabase
    .from('transactions')
    .select('occurred_on, quantity, price_local, fx_to_base, withholding_local')
    .eq('portfolio_id', portfolioId)
    .eq('kind', 'dividend')
    .gte('occurred_on', start)
    .lte('occurred_on', end);

  const months: MonthlyIncome[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    totalBase: 0,
  }));

  for (const t of data ?? []) {
    const m = new Date(t.occurred_on).getMonth(); // 0-11
    // For dividend rows: quantity is shares paid, price_local is per-share amount, fx_to_base snapshot.
    const grossLocal = Number(t.quantity) * Number(t.price_local);
    const netLocal = grossLocal - Number(t.withholding_local ?? 0);
    months[m].totalBase += netLocal * Number(t.fx_to_base ?? 1);
  }
  return months;
}

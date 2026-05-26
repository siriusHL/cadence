// Extended dataset for the Pro tier mocks — holdings, period returns,
// sectors, winners/losers, risk metrics, dividend events.

(function () {
const Cadence = window.Cadence;

// ── Holdings (14 positions, realistic) ───────────────────────────────
Cadence.holdings = [
  { ticker: 'VICI', name: 'VICI Properties Inc',    sector: 'REIT',          country: 'US', currency: 'USD', qty: 240, price: 32.85, costPrice: 28.40, changePct: +0.42, fwdYieldPct: 5.40, yocPct: 6.24, fwdDivLocal: 1.78, payoutFreq: 4,  color: '#c084fc' },
  { ticker: 'ABBV', name: 'AbbVie Inc',             sector: 'Healthcare',    country: 'US', currency: 'USD', qty: 65,  price: 198.40, costPrice: 162.10, changePct: +0.83, fwdYieldPct: 3.81, yocPct: 4.66, fwdDivLocal: 7.56, payoutFreq: 4,  color: '#60a5fa' },
  { ticker: 'O',    name: 'Realty Income Corp',     sector: 'REIT',          country: 'US', currency: 'USD', qty: 215, price: 56.91,  costPrice: 49.20, changePct: +1.62, fwdYieldPct: 5.61, yocPct: 6.50, fwdDivLocal: 3.19, payoutFreq: 12, color: '#34d399' },
  { ticker: 'MO',   name: 'Altria Group',           sector: 'Consumer Stpls', country: 'US', currency: 'USD', qty: 168, price: 51.82,  costPrice: 44.10, changePct: +2.14, fwdYieldPct: 7.84, yocPct: 9.22, fwdDivLocal: 4.06, payoutFreq: 4,  color: '#facc15' },
  { ticker: 'KO',   name: 'The Coca-Cola Co',       sector: 'Consumer Stpls', country: 'US', currency: 'USD', qty: 220, price: 68.12,  costPrice: 58.40, changePct: -0.41, fwdYieldPct: 2.92, yocPct: 3.41, fwdDivLocal: 1.99, payoutFreq: 4,  color: '#f87171' },
  { ticker: 'ENB',  name: 'Enbridge Inc',           sector: 'Energy',        country: 'CA', currency: 'CAD', qty: 280, price: 49.62,  costPrice: 41.80, changePct: +0.18, fwdYieldPct: 6.72, yocPct: 7.98, fwdDivLocal: 3.33, payoutFreq: 4,  color: '#fb923c' },
  { ticker: 'BNS',  name: 'Bank of Nova Scotia',    sector: 'Financials',    country: 'CA', currency: 'CAD', qty: 145, price: 72.40,  costPrice: 65.10, changePct: -0.62, fwdYieldPct: 5.42, yocPct: 6.03, fwdDivLocal: 3.92, payoutFreq: 4,  color: '#fde68a' },
  { ticker: 'ALV',  name: 'Allianz SE',             sector: 'Financials',    country: 'DE', currency: 'EUR', qty: 38,  price: 296.30, costPrice: 224.60, changePct: +0.34, fwdYieldPct: 5.10, yocPct: 6.72, fwdDivLocal: 15.10, payoutFreq: 1,  color: '#a7f3d0' },
  { ticker: 'TTE',  name: 'TotalEnergies SE',       sector: 'Energy',        country: 'FR', currency: 'EUR', qty: 92,  price: 62.18,  costPrice: 54.30, changePct: -0.27, fwdYieldPct: 5.36, yocPct: 6.13, fwdDivLocal: 3.33, payoutFreq: 4,  color: '#fdba74' },
  { ticker: 'BMW',  name: 'BMW AG',                 sector: 'Cons. Discr.',  country: 'DE', currency: 'EUR', qty: 60,  price: 89.40,  costPrice: 78.20, changePct: +0.71, fwdYieldPct: 6.94, yocPct: 7.93, fwdDivLocal: 6.20, payoutFreq: 1,  color: '#bfdbfe' },
  { ticker: 'UL',   name: 'Unilever PLC',           sector: 'Consumer Stpls', country: 'GB', currency: 'GBP', qty: 110, price: 4582,   costPrice: 4180, changePct: +0.06, fwdYieldPct: 3.18, yocPct: 3.48, fwdDivLocal: 145.6, payoutFreq: 4,  color: '#86efac' },
  { ticker: 'PEP',  name: 'PepsiCo Inc',            sector: 'Consumer Stpls', country: 'US', currency: 'USD', qty: 48,  price: 168.20, costPrice: 152.30, changePct: -0.18, fwdYieldPct: 3.41, yocPct: 3.76, fwdDivLocal: 5.74, payoutFreq: 4,  color: '#fca5a5' },
  { ticker: 'JNJ',  name: 'Johnson & Johnson',      sector: 'Healthcare',    country: 'US', currency: 'USD', qty: 52,  price: 164.80, costPrice: 156.40, changePct: -0.09, fwdYieldPct: 3.21, yocPct: 3.38, fwdDivLocal: 5.28, payoutFreq: 4,  color: '#93c5fd' },
  { ticker: 'PG',   name: 'Procter & Gamble',       sector: 'Consumer Stpls', country: 'US', currency: 'USD', qty: 40,  price: 178.40, costPrice: 142.90, changePct: +0.24, fwdYieldPct: 2.55, yocPct: 3.18, fwdDivLocal: 4.55, payoutFreq: 4,  color: '#fda4af' },
];

// Compute cadence counts (monthly/quarterly/etc.)
Cadence.cadenceCounts = (() => {
  const c = { monthly: 0, quarterly: 0, semi: 0, annual: 0 };
  for (const h of Cadence.holdings) {
    if (h.payoutFreq === 12) c.monthly++;
    else if (h.payoutFreq === 4) c.quarterly++;
    else if (h.payoutFreq === 2) c.semi++;
    else if (h.payoutFreq === 1) c.annual++;
  }
  return c;
})();

Cadence.countriesList = Array.from(new Set(Cadence.holdings.map((h) => h.country)));

// ── Dividend events for Upcoming (next 40 days) ──────────────────────
Cadence.upcomingExtended = [
  { ticker: 'VICI', name: 'VICI Properties Inc', exDate: '2026-06-03', gross: 127.80, withholdPct: 15, daysUntil: 8,  isProjected: false },
  { ticker: 'ABBV', name: 'AbbVie Inc',          exDate: '2026-06-09', gross: 204.42, withholdPct: 15, daysUntil: 14, isProjected: false },
  { ticker: 'KO',   name: 'The Coca-Cola Co',    exDate: '2026-06-14', gross:  88.06, withholdPct: 15, daysUntil: 19, isProjected: true  },
  { ticker: 'MO',   name: 'Altria Group',        exDate: '2026-06-17', gross: 178.85, withholdPct: 15, daysUntil: 22, isProjected: false },
  { ticker: 'O',    name: 'Realty Income Corp',  exDate: '2026-06-28', gross: 112.30, withholdPct: 15, daysUntil: 33, isProjected: false },
  { ticker: 'JNJ',  name: 'Johnson & Johnson',   exDate: '2026-07-01', gross:  68.60, withholdPct: 15, daysUntil: 36, isProjected: false },
  { ticker: 'PEP',  name: 'PepsiCo Inc',         exDate: '2026-07-03', gross:  68.90, withholdPct: 15, daysUntil: 38, isProjected: false },
];

// ── Performance period returns (portfolio + benchmarks) ──────────────
Cadence.periodReturns = [
  { label: '1M',  port: +2.14, spx: +1.62, vti: +1.58 },
  { label: '3M',  port: +6.84, spx: +5.20, vti: +5.04 },
  { label: 'YTD', port: +12.40, spx: +9.80, vti: +9.55 },
  { label: '1Y',  port: +18.62, spx: +14.20, vti: +14.05 },
  { label: '2Y',  port: +42.91, spx: +33.50, vti: +33.10 },
];

// 104-week sparkline-style series for cumulative return
Cadence.perfSeries = (() => {
  const arr = [];
  let v = 0;
  for (let i = 0; i < 104; i++) {
    v += (Math.sin(i / 8) * 0.7 + Math.cos(i / 14) * 0.5 + 0.32) + (Math.random() * 0.4 - 0.18);
    arr.push(v);
  }
  // rescale to end ~30%
  const last = arr[arr.length - 1];
  return arr.map((x) => (x / last) * 30.27);
})();

// Benchmark series (S&P 500-ish ending ~22%)
Cadence.benchSeries = (() => {
  const arr = [];
  let v = 0;
  for (let i = 0; i < 104; i++) {
    v += (Math.sin(i / 9) * 0.5 + 0.24) + (Math.random() * 0.3 - 0.15);
    arr.push(v);
  }
  const last = arr[arr.length - 1];
  return arr.map((x) => (x / last) * 22.05);
})();

// ── Winners / losers by P/L ──────────────────────────────────────────
Cadence.winners = Cadence.holdings
  .map((h) => ({
    ticker: h.ticker, name: h.name, color: h.color,
    pl: (h.price - h.costPrice) * h.qty,
    plPct: ((h.price - h.costPrice) / h.costPrice) * 100,
  }))
  .sort((a, b) => b.pl - a.pl)
  .slice(0, 5);

Cadence.losers = Cadence.holdings
  .map((h) => ({
    ticker: h.ticker, name: h.name, color: h.color,
    pl: (h.price - h.costPrice) * h.qty,
    plPct: ((h.price - h.costPrice) / h.costPrice) * 100,
  }))
  .filter((r) => r.pl < 0)
  .sort((a, b) => a.pl - b.pl)
  .slice(0, 5);

// ── Risk & ratios (rolling 1y) ───────────────────────────────────────
Cadence.risk = {
  volPct: 14.8,
  sharpe: 1.42,
  sortino: 2.08,
  calmar: 1.61,
  beta: 0.94,
  alpha: 3.62,
  correl: 0.82,
  trackingErr: 4.20,
  infoRatio: 0.88,
  maxDD: -8.4,
  maxDDRecovered: 'Mar \'26',
  winRate: 67,
  winMonths: 16,
  totalMonths: 24,
};

// ── Diversification — sector / country / currency ─────────────────────
Cadence.sectors = [
  { name: 'Real Estate',     pct: 28.4, value: 52464, color: '#c084fc' },
  { name: 'Healthcare',      pct: 21.7, value: 40087, color: '#60a5fa' },
  { name: 'Consumer Stpls',  pct: 16.2, value: 29927, color: '#facc15' },
  { name: 'Energy',          pct: 14.5, value: 26786, color: '#fb923c' },
  { name: 'Financials',      pct: 11.8, value: 21798, color: '#34d399' },
  { name: 'Cons. Discr.',    pct: 7.4,  value: 13670, color: '#f87171' },
];
Cadence.countries = [
  { name: 'United States',  pct: 62.4, color: '#3b82f6' },
  { name: 'Canada',         pct: 14.7, color: '#ef4444' },
  { name: 'Germany',        pct: 11.2, color: '#facc15' },
  { name: 'France',         pct: 6.8,  color: '#6366f1' },
  { name: 'United Kingdom', pct: 4.9,  color: '#22c55e' },
];
Cadence.currencies = [
  { name: 'USD', pct: 62.4, color: '#3b82f6' },
  { name: 'EUR', pct: 18.0, color: '#facc15' },
  { name: 'CAD', pct: 14.7, color: '#ef4444' },
  { name: 'GBP', pct: 4.9,  color: '#22c55e' },
];
Cadence.concentration = [
  { label: 'Largest position',   value: 'VICI · 12.4%', status: 'ok',   note: 'Within 15% safety threshold' },
  { label: 'Top 3 concentration', value: '34.1%',        status: 'ok',   note: 'Below 40% threshold' },
  { label: 'Single sector',      value: 'REIT · 28.4%', status: 'warn', note: 'Approaching 30% threshold' },
  { label: 'Single country',     value: 'US · 62.4%',   status: 'warn', note: 'High US exposure' },
];

// ── Forecast (12M cashflow projections) ──────────────────────────────
Cadence.forecast = {
  thisMonth: 558,
  thisQuarter: 1622,
  thisYearTotal: 6190,
  ytdReceived: 2940,
  thisYearRemaining: 3250,
  next12M: 5847,
  taxLabel: 'NL Box 3 22%',
  taxRate: 0.22,
  next12MNet: 5847 * 0.78,
  fivePctGrowth: 5847 * 0.05,
  in5y: 5847 * Math.pow(1.078, 5),
  in10y: 5847 * Math.pow(1.078, 10),
  peakMonth: { name: 'September', total: 605 },
  troughMonth: { name: 'August', total: 470 },
};

})();

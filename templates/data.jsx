// data.jsx — sample portfolio data for Cadence
// All amounts shown in EUR. Numbers are illustrative.

const PORTFOLIO = {
  totalValue: 184_320.55,
  costBasis: 142_870.20,
  unrealizedPL: 41_450.35,
  unrealizedPLPct: 29.01,
  cashEUR: 4_280.10,
  ytdReturn: 11.42,
  fwdAnnualIncome: 7_412.84,
  forwardYield: 4.02,
  yieldOnCost: 5.19,
  trailing12: 6_984.20,
  divGrowth5y: 7.8,
  payoutRatioAvg: 56.4,
  dividendsThisMonth: 612.40,
  dividendsLastMonth: 538.15,
  positions: 32,
  monthlyTarget: 700,
  fireTarget: 30000,
  asOf: "2026-05-21 17:35 CET",
};

// FX to EUR
const FX = {
  USD: 0.918, EUR: 1, GBP: 1.184, CHF: 1.025, CAD: 0.668, JPY: 0.0061, DKK: 0.134,
};

// Holdings — real dividend-paying companies. Yields/grades illustrative.
const HOLDINGS = [
  // ticker, name, sector, country, ccy, qty, costPxLocal, pxLocal, fwdDivLocalAnnual, freq (months), grade, payoutMonths
  { t: "JNJ",   n: "Johnson & Johnson",      s: "Healthcare",   c: "US", x: "USD", q: 110, cp:  142.30, p:  158.42, d:  4.96, f: 3, g: "A+", m: [3,6,9,12] },
  { t: "KO",    n: "Coca-Cola Co",           s: "Cons. Stap.",  c: "US", x: "USD", q: 380, cp:   58.20, p:   68.10, d:  1.96, f: 3, g: "A+", m: [4,7,10,1] },
  { t: "PG",    n: "Procter & Gamble",       s: "Cons. Stap.",  c: "US", x: "USD", q:  85, cp:  148.40, p:  166.20, d:  4.03, f: 3, g: "A+", m: [2,5,8,11] },
  { t: "O",     n: "Realty Income",          s: "Real Estate",  c: "US", x: "USD", q: 540, cp:   54.10, p:   58.85, d:  3.16, f: 1, g: "A",  m: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { t: "MO",    n: "Altria Group",           s: "Cons. Stap.",  c: "US", x: "USD", q: 220, cp:   42.30, p:   48.40, d:  4.08, f: 3, g: "B",  m: [1,4,7,10] },
  { t: "ABBV",  n: "AbbVie Inc",             s: "Healthcare",   c: "US", x: "USD", q:  90, cp:  142.50, p:  178.90, d:  6.56, f: 3, g: "A",  m: [2,5,8,11] },
  { t: "PEP",   n: "PepsiCo",                s: "Cons. Stap.",  c: "US", x: "USD", q:  70, cp:  168.20, p:  154.10, d:  5.42, f: 3, g: "A",  m: [1,3,6,9] },
  { t: "CVX",   n: "Chevron Corp",           s: "Energy",       c: "US", x: "USD", q:  80, cp:  148.00, p:  162.50, d:  6.84, f: 3, g: "B+", m: [3,6,9,12] },
  { t: "ENB",   n: "Enbridge Inc",           s: "Energy",       c: "CA", x: "CAD", q: 420, cp:   48.20, p:   54.30, d:  3.66, f: 3, g: "B+", m: [3,6,9,12] },
  { t: "MSFT",  n: "Microsoft Corp",         s: "Technology",   c: "US", x: "USD", q:  42, cp:  280.40, p:  448.20, d:  3.32, f: 3, g: "A+", m: [3,6,9,12] },
  { t: "ASML",  n: "ASML Holding",           s: "Technology",   c: "NL", x: "EUR", q:  18, cp:  590.00, p:  852.40, d:  6.40, f: 4, g: "A",  m: [2,5,8,11] },
  { t: "NESN",  n: "Nestlé SA",              s: "Cons. Stap.",  c: "CH", x: "CHF", q: 145, cp:  104.20, p:   89.20, d:  3.05, f: 1, g: "A",  m: [4] },
  { t: "OR",    n: "L'Oréal SA",             s: "Cons. Disc.",  c: "FR", x: "EUR", q:  22, cp:  362.00, p:  432.80, d:  6.60, f: 1, g: "A",  m: [4] },
  { t: "AD",    n: "Ahold Delhaize",         s: "Cons. Stap.",  c: "NL", x: "EUR", q: 280, cp:   28.40, p:   31.85, d:  1.10, f: 2, g: "B+", m: [4, 8] },
  { t: "ALV",   n: "Allianz SE",             s: "Financials",   c: "DE", x: "EUR", q:  46, cp:  214.50, p:  285.40, d: 13.80, f: 1, g: "A",  m: [5] },
  { t: "IBE",   n: "Iberdrola",              s: "Utilities",    c: "ES", x: "EUR", q: 720, cp:    9.85, p:   12.84, d:  0.61, f: 2, g: "B+", m: [2, 7] },
  { t: "BATS",  n: "British American Tob.",  s: "Cons. Stap.",  c: "GB", x: "GBP", q: 240, cp:   28.40, p:   32.10, d:  2.40, f: 4, g: "B",  m: [2,5,8,11] },
  { t: "MC",    n: "LVMH",                   s: "Cons. Disc.",  c: "FR", x: "EUR", q:  14, cp:  680.00, p:  712.50, d: 13.00, f: 2, g: "A",  m: [4, 12] },
  { t: "VZ",    n: "Verizon Comm.",          s: "Comm. Svcs.",  c: "US", x: "USD", q: 280, cp:   42.10, p:   42.95, d:  2.71, f: 3, g: "B",  m: [2,5,8,11] },
  { t: "MMM",   n: "3M Co",                  s: "Industrials",  c: "US", x: "USD", q: 110, cp:  120.40, p:   98.40, d:  2.80, f: 3, g: "C+", m: [3,6,9,12] },
];

// dividend events for calendar — generated from holdings, plus a couple of upcoming
const DIV_EVENTS = (() => {
  const out = [];
  HOLDINGS.forEach((h) => {
    const perPay = h.d / h.f;
    const grossLocal = perPay * h.q;
    h.m.forEach((mo) => {
      const day = ((h.t.charCodeAt(0) + h.t.charCodeAt(h.t.length - 1) + mo * 3) % 25) + 3;
      out.push({
        t: h.t, n: h.n, mo, day,
        grossLocal, grossEUR: grossLocal * FX[h.x],
        ccy: h.x,
        wth: ["US","CA"].includes(h.c) ? 0.15 : (h.c === "CH" ? 0.35 : h.c === "GB" ? 0 : 0.0),
        type: ["JNJ","KO","PG","PEP","O","MSFT","CVX"].includes(h.t) ? "dividend" : "dividend",
      });
    });
  });
  return out;
})();

// 12-month forward income forecast (in EUR)
const FORECAST_12M = (() => {
  const months = ["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"];
  // Approx by summing events per calendar month, then bias slightly so months
  // with quarterly stack feel heavier.
  const sums = new Array(12).fill(0);
  DIV_EVENTS.forEach((e) => {
    // Map mo (1-12 calendar) to forecast index starting next month
    const idx = (e.mo - 6 + 12) % 12;
    sums[idx] += e.grossEUR;
  });
  return months.map((m, i) => ({ m, eur: sums[i] }));
})();

// Performance vs benchmark — monthly cumulative TR %
const PERF = (() => {
  // Generate 24 months of synthetic but plausible cumulative returns
  const out = [];
  let p = 0, b = 0, s = 0;
  const seeds = [0.012, 0.018, -0.005, 0.021, 0.008, -0.018, 0.014, 0.026, 0.011, 0.005, -0.012, 0.022, 0.015, 0.009, 0.018, -0.008, 0.025, 0.012, 0.006, 0.014, 0.020, -0.010, 0.017, 0.013];
  const bseeds = [0.010, 0.014, -0.008, 0.018, 0.006, -0.020, 0.012, 0.022, 0.009, 0.003, -0.014, 0.020, 0.012, 0.007, 0.015, -0.010, 0.022, 0.010, 0.004, 0.012, 0.018, -0.012, 0.014, 0.011];
  const sseeds = [0.016, 0.020, -0.003, 0.024, 0.010, -0.015, 0.016, 0.030, 0.013, 0.007, -0.010, 0.025, 0.018, 0.012, 0.022, -0.005, 0.028, 0.015, 0.008, 0.017, 0.024, -0.008, 0.020, 0.016];
  for (let i = 0; i < 24; i++) {
    p = (1 + p / 100) * (1 + seeds[i]) * 100 - 100;
    b = (1 + b / 100) * (1 + bseeds[i]) * 100 - 100;
    s = (1 + s / 100) * (1 + sseeds[i]) * 100 - 100;
  }
  // rewind to produce series
  p = 0; b = 0; s = 0;
  for (let i = 0; i < 24; i++) {
    p = (1 + p / 100) * (1 + seeds[i]) * 100 - 100;
    b = (1 + b / 100) * (1 + bseeds[i]) * 100 - 100;
    s = (1 + s / 100) * (1 + sseeds[i]) * 100 - 100;
    out.push({ p: +p.toFixed(2), b: +b.toFixed(2), s: +s.toFixed(2) });
  }
  return out;
})();

// Dividend income history (months) — last 24 months EUR
const INCOME_HIST_24M = (() => {
  // Increasing trend with quarterly bumps (Mar/Jun/Sep/Dec heavier)
  const out = [];
  for (let i = 0; i < 24; i++) {
    const month = i % 12;
    const base = 250 + i * 18; // growing
    const heavy = [2, 5, 8, 11].includes(month) ? 380 : 0;
    const noise = ((i * 73) % 60) - 30;
    out.push(Math.max(80, base + heavy + noise));
  }
  return out;
})();

// Sector allocations (% of portfolio value)
const SECTORS = [
  { k: "Cons. Stap.", v: 24.8, i: 1872.10 },
  { k: "Healthcare",  v: 16.1, i: 1208.20 },
  { k: "Technology",  v: 13.4, i:  642.40 },
  { k: "Real Estate", v: 11.2, i: 1705.40 },
  { k: "Energy",      v:  9.7, i:  894.10 },
  { k: "Cons. Disc.", v:  8.4, i:  584.20 },
  { k: "Financials",  v:  6.3, i:  634.80 },
  { k: "Industrials", v:  4.8, i:  308.40 },
  { k: "Utilities",   v:  3.7, i:  439.80 },
  { k: "Comm. Svcs.", v:  1.6, i:  123.10 },
];

const GEO = [
  { k: "United States",   v: 51.4 },
  { k: "Netherlands",     v: 12.8 },
  { k: "France",          v: 10.2 },
  { k: "Germany",         v:  8.4 },
  { k: "Switzerland",     v:  5.8 },
  { k: "United Kingdom",  v:  4.6 },
  { k: "Canada",          v:  3.9 },
  { k: "Spain",           v:  2.9 },
];

// Stock detail (Realty Income) — extra payload
const STOCK_O = {
  t: "O", n: "Realty Income Corp",
  exch: "NYSE", sector: "Real Estate", industry: "Retail REIT",
  px: 58.85, ccy: "USD",
  chg: +0.41, chgPct: +0.70,
  marketCap: 51_240_000_000,
  fwdYield: 5.37, ttmYield: 5.21, payout: 76.8, divGrowth: 3.1, streak: 30,
  exDiv: "2026-05-31", payDate: "2026-06-13",
  amt: 0.2635, freq: "Monthly",
  pe: 52.4, pb: 1.34, peRatio: 22.4,
  beta: 0.78, debtEq: 0.68,
  safetyScore: 84, safetyGrade: "A",
  // 60 trading days of close prices, ~58 to 60 range
  series: (() => {
    const s = [];
    let p = 56.80;
    for (let i = 0; i < 80; i++) {
      const d = (Math.sin(i * 0.31) + Math.cos(i * 0.18)) * 0.45 + (Math.random() - 0.5) * 0.6;
      p = Math.max(54, Math.min(62, p + d * 0.6 + 0.04));
      s.push(+p.toFixed(2));
    }
    return s;
  })(),
  // dividend history per quarter for last 5 years
  divHist: [
    { y: 2021, q: 1, a: 0.234 }, { y: 2021, q: 2, a: 0.235 }, { y: 2021, q: 3, a: 0.236 }, { y: 2021, q: 4, a: 0.246 },
    { y: 2022, q: 1, a: 0.247 }, { y: 2022, q: 2, a: 0.247 }, { y: 2022, q: 3, a: 0.248 }, { y: 2022, q: 4, a: 0.249 },
    { y: 2023, q: 1, a: 0.255 }, { y: 2023, q: 2, a: 0.256 }, { y: 2023, q: 3, a: 0.257 }, { y: 2023, q: 4, a: 0.257 },
    { y: 2024, q: 1, a: 0.258 }, { y: 2024, q: 2, a: 0.260 }, { y: 2024, q: 3, a: 0.262 }, { y: 2024, q: 4, a: 0.263 },
    { y: 2025, q: 1, a: 0.264 }, { y: 2025, q: 2, a: 0.263 }, { y: 2025, q: 3, a: 0.263 }, { y: 2025, q: 4, a: 0.264 },
  ],
};

// Tax / withholding by country
const TAX = [
  { c: "United States",  ccy: "USD", gross: 3245.10, rate: 15, withheld:  486.77 },
  { c: "Netherlands",    ccy: "EUR", gross:  892.40, rate: 15, withheld:  133.86 },
  { c: "France",         ccy: "EUR", gross:  812.20, rate: 12.8, withheld:  103.96 },
  { c: "Germany",        ccy: "EUR", gross:  634.80, rate: 26.375, withheld:  167.49 },
  { c: "Switzerland",    ccy: "CHF", gross:  442.40, rate: 35, withheld:  154.84 },
  { c: "United Kingdom", ccy: "GBP", gross:  576.20, rate:  0, withheld:    0.00 },
  { c: "Canada",         ccy: "CAD", gross:  280.60, rate: 15, withheld:   42.09 },
  { c: "Spain",          ccy: "EUR", gross:  439.80, rate: 19, withheld:   83.56 },
];

// Derived helpers
function valueEUR(h) { return h.q * h.p * FX[h.x]; }
function costEUR(h)  { return h.q * h.cp * FX[h.x]; }
function fwdIncomeEUR(h) { return h.q * h.d * FX[h.x]; }
function fwdYield(h) { return (h.d / h.p) * 100; }
function yoc(h)      { return (h.d / h.cp) * 100; }
function plPct(h)    { return ((h.p - h.cp) / h.cp) * 100; }

Object.assign(window, {
  PORTFOLIO, FX, HOLDINGS, DIV_EVENTS, FORECAST_12M, PERF,
  INCOME_HIST_24M, SECTORS, GEO, STOCK_O, TAX,
  valueEUR, costEUR, fwdIncomeEUR, fwdYield, yoc, plPct,
});

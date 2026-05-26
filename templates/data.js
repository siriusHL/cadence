// ─────────────────────────────────────────────────────────
// Realistic Cadence portfolio data for the mocks.
// Mirrors the shapes the real /app/dashboard page receives from
// getPortfolioSummary / getIncomeRhythm / getTopContributors / getUpcomingDividends.
// ─────────────────────────────────────────────────────────
const summary = {
  totalValue: 184732.41,
  unrealizedPL: 42891.20,
  unrealizedPLPct: 30.27,
  positionsCount: 14,
  countriesCount: 4,
  forwardAnnualIncome: 5847,
  forwardYieldPct: 3.17,
  yieldOnCostPct: 4.82,
  ytdReceived: 2940,
  t12mReceived: 5418,
  todayDeltaAbs: 612.18,
  todayDeltaPct: 0.33,
};

const incomeTarget = 30000;

// 12 months past + 6 future, EUR. nowIndex = 11.
// Received vs projected splits.
const rhythm = [
  { label: 'Jun', received: 312, projected: 0 },
  { label: 'Jul', received: 488, projected: 0 },
  { label: 'Aug', received: 376, projected: 0 },
  { label: 'Sep', received: 521, projected: 0 },
  { label: 'Oct', received: 412, projected: 0 },
  { label: 'Nov', received: 598, projected: 0 },
  { label: 'Dec', received: 644, projected: 0 },
  { label: 'Jan', received: 428, projected: 0 },
  { label: 'Feb', received: 512, projected: 0 },
  { label: 'Mar', received: 689, projected: 0 },
  { label: 'Apr', received: 480, projected: 0 },
  { label: 'May', received: 558, projected: 0 },   // current — partial
  { label: 'Jun', received: 0,   projected: 612 },
  { label: 'Jul', received: 0,   projected: 540 },
  { label: 'Aug', received: 0,   projected: 470 },
  { label: 'Sep', received: 0,   projected: 605 },
  { label: 'Oct', received: 0,   projected: 488 },
  { label: 'Nov', received: 0,   projected: 660 },
];
const nowIndex = 11;

// Top forward-income contributors (next 12 months, EUR).
const contributors = [
  { ticker: 'VICI', name: 'VICI Properties Inc',   forwardAnnualLocal: 1082, yieldPct: 5.40, color: '#c084fc' },
  { ticker: 'ABBV', name: 'AbbVie Inc',            forwardAnnualLocal: 894,  yieldPct: 3.81, color: '#60a5fa' },
  { ticker: 'O',    name: 'Realty Income Corp',    forwardAnnualLocal: 748,  yieldPct: 5.61, color: '#34d399' },
  { ticker: 'MO',   name: 'Altria Group',          forwardAnnualLocal: 612,  yieldPct: 7.84, color: '#facc15' },
  { ticker: 'KO',   name: 'The Coca-Cola Co',      forwardAnnualLocal: 428,  yieldPct: 2.92, color: '#f87171' },
  { ticker: 'ENB',  name: 'Enbridge Inc',          forwardAnnualLocal: 387,  yieldPct: 6.72, color: '#fb923c' },
];

// Next 5 upcoming dividends.
const upcoming = [
  { ticker: 'VICI', name: 'VICI Properties Inc', exDate: '2026-06-03', estimatedTotalLocal: 127.80, daysUntil: 8,  isProjected: false },
  { ticker: 'ABBV', name: 'AbbVie Inc',          exDate: '2026-06-09', estimatedTotalLocal: 204.42, daysUntil: 14, isProjected: false },
  { ticker: 'KO',   name: 'The Coca-Cola Co',    exDate: '2026-06-14', estimatedTotalLocal:  88.06, daysUntil: 19, isProjected: true  },
  { ticker: 'MO',   name: 'Altria Group',        exDate: '2026-06-17', estimatedTotalLocal: 178.85, daysUntil: 22, isProjected: false },
  { ticker: 'O',    name: 'Realty Income Corp',  exDate: '2026-06-28', estimatedTotalLocal: 112.30, daysUntil: 33, isProjected: false },
];

// Today's movers (for the novel feed variant).
const movers = [
  { ticker: 'MO',   name: 'Altria Group',          changePct: +2.14, price: 51.82, color: '#facc15' },
  { ticker: 'O',    name: 'Realty Income Corp',    changePct: +1.62, price: 56.91, color: '#34d399' },
  { ticker: 'ABBV', name: 'AbbVie Inc',            changePct: +0.83, price: 198.40, color: '#60a5fa' },
  { ticker: 'KO',   name: 'The Coca-Cola Co',      changePct: -0.41, price: 68.12, color: '#f87171' },
];

// Sector allocation (for tablet donut card swap if needed).
const sectors = [
  { name: 'Real Estate',    pct: 28.4, color: '#c084fc' },
  { name: 'Healthcare',     pct: 21.7, color: '#60a5fa' },
  { name: 'Consumer Stpls', pct: 16.2, color: '#facc15' },
  { name: 'Energy',         pct: 14.5, color: '#fb923c' },
  { name: 'Financials',     pct: 11.8, color: '#34d399' },
  { name: 'Other',          pct: 7.4,  color: '#94a3b8' },
];

const todayLabel = 'Tue 26 May 2026';

const Cadence = { summary, incomeTarget, rhythm, nowIndex, contributors, upcoming, movers, sectors, todayLabel };
window.Cadence = Cadence;

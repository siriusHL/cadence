// Extended dataset for all remaining tiers (Free / Elite / Account / Add-Edit).
// data-pro.js already covers Pro tier (holdings, period returns, sectors, etc.)

(function () {
const Cadence = window.Cadence;

// ── Alerts (Elite) ──────────────────────────────────────────────────
Cadence.alerts = [
  { id: 'a1', severity: 'negative', title: 'KO dividend cut announced',          body: 'Coca-Cola declared a 0.06% rate cut effective Q3. Forward income impact: −€26/yr.', amountEur: 26,  action: { label: 'Review KO', href: '#' } },
  { id: 'a2', severity: 'warning',  title: 'US concentration at 62.4%',         body: 'Your US exposure is at the 60% threshold. Adding non-US payers would diversify.',  amountEur: null, action: { label: 'View diversification', href: '#' } },
  { id: 'a3', severity: 'warning',  title: 'Real Estate sector at 28.4%',       body: 'REIT allocation approaches the 30% concentration threshold.',                       amountEur: null, action: null },
  { id: 'a4', severity: 'positive', title: 'VICI raised dividend +4.7%',        body: 'VICI Properties announced a quarterly bump from €0.43 to €0.45. Forward bump: +€42/yr.', amountEur: 42, action: { label: 'View VICI', href: '#' } },
  { id: 'a5', severity: 'positive', title: 'ABBV ex-date in 4 days',             body: 'AbbVie ex-dividend on Jun 9 · estimated €204.42 net to you.',                       amountEur: 204, action: { label: 'Calendar', href: '#' } },
  { id: 'a6', severity: 'info',     title: '€68 reclaimable from Germany',      body: 'Allianz withheld at statutory 26.4% vs 15% treaty. Reclaim via BZSt.',              amountEur: 68,  action: { label: 'Reclaim guide', href: '#' } },
];

// ── Tax (Elite) — withholding by jurisdiction ───────────────────────
Cadence.tax = {
  residence: 'NL', residenceName: 'Netherlands', fiscalYear: 2026,
  totalGrossEur: 5847,
  totalWithheldEur: 1024,
  totalNetEur: 4823,
  totalReclaimableEur: 142,
  effectiveRatePct: 17.5,
  rows: [
    { country: 'US', countryName: 'United States', currency: 'USD', grossEur: 3650, statutory: 30, treaty: 15, effective: 15.0, withheldEur: 547, netEur: 3103, reclaimableEur:  0, status: 'treaty' },
    { country: 'CA', countryName: 'Canada',        currency: 'CAD', grossEur:  860, statutory: 25, treaty: 15, effective: 15.0, withheldEur: 129, netEur:  731, reclaimableEur:  0, status: 'treaty' },
    { country: 'DE', countryName: 'Germany',       currency: 'EUR', grossEur:  574, statutory: 26.4, treaty: 15, effective: 26.4, withheldEur: 151, netEur:  423, reclaimableEur: 65, status: 'reclaim' },
    { country: 'FR', countryName: 'France',        currency: 'EUR', grossEur:  306, statutory: 30, treaty: 15, effective: 25.0, withheldEur:  77, netEur:  229, reclaimableEur: 31, status: 'reclaim' },
    { country: 'GB', countryName: 'United Kingdom', currency: 'GBP', grossEur:  457, statutory: 0,  treaty: 0,  effective: 0,    withheldEur:   0, netEur:  457, reclaimableEur:  0, status: 'no-wth' },
  ],
  domesticTax: { final: 286, foreignCredit: 738, model: 'Box 3 forfaitair', rate: 22 },
  finalNetEur: 4823 - 286,
};

// ── Account · Portfolios / Profile / Settings ───────────────────────
Cadence.portfolios = [
  { id: 'p1', name: 'Main portfolio', holdings: 14, value: 184732, fwdIncome: 5847, active: true,  isDefault: true },
  { id: 'p2', name: 'Retirement',    holdings:  6, value:  62410, fwdIncome: 2104, active: false, isDefault: false },
  { id: 'p3', name: 'Watchlist',     holdings:  3, value:      0, fwdIncome:    0, active: false, isDefault: false },
];
Cadence.user = {
  email: 'dm@cadence.io',
  displayName: 'Daniel M.',
  baseCurrency: 'EUR',
  taxCountry: 'NL', taxCountryName: 'Netherlands',
  tier: 'premium', tierLabel: '✦ Premium',
  renewsOn: '2026-06-15',
};
Cadence.settings = {
  contrast: 'standard',
  bgTone: 'cream',
  defaultScreen: 'dashboard',
  incomeTarget: 30000,
};

// ── Add holding draft (Add/Edit) ────────────────────────────────────
Cadence.editLots = [
  { id: 'l1', kind: 'buy', date: '2024-03-12', qty: 120, price: 28.40, fee: 1.20, cost: 3408 },
  { id: 'l2', kind: 'buy', date: '2024-09-08', qty:  80, price: 30.20, fee: 1.00, cost: 2416 },
  { id: 'l3', kind: 'buy', date: '2025-02-04', qty:  40, price: 33.10, fee: 0.80, cost: 1324 },
];

// ── Tier plans (Public) ─────────────────────────────────────────────
Cadence.plans = [
  {
    key: 'free', name: 'Free', price: '€0', blurb: 'Track your money, see what it earned you.',
    bullets: ['1 portfolio, up to 10 holdings', 'Home / Coming Up / Stocks / Year', 'Daily EOD prices'],
    cta: 'Start free',
  },
  {
    key: 'premium', name: 'Premium', price: '€4 / mo', blurb: 'The full dividend research toolkit.',
    bullets: ['3 portfolios, 100 holdings each', 'Forecast · Simulator · Calendar', 'Performance + diversification', '10-min live quotes · CSV export'],
    cta: 'Try Premium', featured: true,
  },
  {
    key: 'elite', name: 'Elite', price: '€9 / mo', blurb: 'Tax, alerts, and an API for power users.',
    bullets: ['Unlimited portfolios + holdings', 'Withholding report · NL Box 3 · treaties', 'Price + ex-div alerts · 1-min quotes', 'PDF export · public API'],
    cta: 'Go Elite',
  },
];

})();

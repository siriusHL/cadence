export type Tier = 'free' | 'premium' | 'elite';

export type Feature =
  | 'multiCurrency'
  | 'drip'
  | 'calendar'
  | 'forecast'
  | 'performance'
  | 'diversification'
  | 'taxReport'
  | 'alerts'
  | 'csvImport'
  | 'exportCsv'
  | 'exportPdf'
  | 'apiAccess';

export type Screen =
  | 'home' | 'next' | 'stocks' | 'year'
  | 'add'                                       // action — available to all tiers, RLS-capped
  | 'profile' | 'settings' | 'portfolios'       // account pages — accessible to every tier
  | 'dashboard' | 'holdings' | 'stock'
  | 'calendar' | 'forecast' | 'dividends' | 'simulator'
  | 'performance' | 'diversification'
  | 'tax' | 'alerts';

export interface TierConfig {
  maxPortfolios: number;
  maxHoldings: number;
  maxAlerts: number;
  quoteFreshnessMin: number;
  dividendFreshnessHours: number;
  fundamentalsFreshnessHours: number;
  fxFreshnessMin: number;
  screens: readonly Screen[] | '*';
  features: Record<Feature, boolean>;
}

export const TIERS: Record<Tier, TierConfig> = {
  free: {
    maxPortfolios: 1,
    maxHoldings: 10,
    maxAlerts: 0,
    quoteFreshnessMin: 1440,
    dividendFreshnessHours: 168,
    fundamentalsFreshnessHours: 168,
    fxFreshnessMin: 60,
    screens: ['home', 'next', 'stocks', 'year', 'add', 'profile', 'settings', 'portfolios'],
    features: {
      multiCurrency: false, drip: false, calendar: false, forecast: false,
      performance: false, diversification: false, taxReport: false,
      alerts: false, csvImport: false, exportCsv: false, exportPdf: false, apiAccess: false,
    },
  },
  premium: {
    maxPortfolios: 3,
    maxHoldings: 100,
    maxAlerts: 0,
    quoteFreshnessMin: 10,
    dividendFreshnessHours: 24,
    fundamentalsFreshnessHours: 168,
    fxFreshnessMin: 15,
    // Premium swaps the four beginner-oriented screens (home / next / stocks /
     // year) for the data-dense pro versions (dashboard / holdings / dividends /
     // simulator / performance / diversification).
    screens: [
      'add', 'profile', 'settings', 'portfolios',
      'dashboard', 'holdings', 'stock',
      'dividends', 'simulator',
      'performance', 'diversification',
    ],
    features: {
      multiCurrency: true, drip: true, calendar: true, forecast: true,
      performance: true, diversification: true, taxReport: false,
      alerts: false, csvImport: true, exportCsv: true, exportPdf: false, apiAccess: false,
    },
  },
  elite: {
    maxPortfolios: Number.POSITIVE_INFINITY,
    maxHoldings: Number.POSITIVE_INFINITY,
    maxAlerts: 100,
    quoteFreshnessMin: 1,
    dividendFreshnessHours: 24,
    fundamentalsFreshnessHours: 24,
    fxFreshnessMin: 15,
    // Same exclusions as Premium — the free-tier screens stay free-only.
    screens: [
      'add', 'profile', 'settings', 'portfolios',
      'dashboard', 'holdings', 'stock',
      'dividends', 'simulator',
      'performance', 'diversification',
      'tax', 'alerts',
    ],
    features: {
      multiCurrency: true, drip: true, calendar: true, forecast: true,
      performance: true, diversification: true, taxReport: true,
      alerts: true, csvImport: true, exportCsv: true, exportPdf: true, apiAccess: true,
    },
  },
};

export function can(tier: Tier, feature: Feature): boolean {
  return TIERS[tier].features[feature];
}

export function canAccessScreen(tier: Tier, screen: Screen): boolean {
  const s = TIERS[tier].screens;
  return s === '*' || s.includes(screen);
}

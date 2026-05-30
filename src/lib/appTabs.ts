import { canAccessScreen, type Screen, type Tier } from '@/lib/tiers';

// Primary app navigation tabs, shared by the app shell (src/app/app/layout.tsx)
// and the Insights chrome so a signed-in user keeps the same menu on /insights.
export interface AppTab {
  label: string;
  href: string;
  screen: Screen;
}

const FREE_TABS: AppTab[] = [
  { label: 'Home', href: '/app/home', screen: 'home' },
  { label: 'Coming up', href: '/app/next', screen: 'next' },
  { label: 'Your stocks', href: '/app/stocks', screen: 'stocks' },
  { label: 'Your year', href: '/app/year', screen: 'year' },
];

const PRO_TABS: AppTab[] = [
  { label: 'Dashboard', href: '/app/dashboard', screen: 'dashboard' },
  { label: 'Holdings', href: '/app/holdings', screen: 'holdings' },
  { label: 'Dividends', href: '/app/dividends', screen: 'dividends' },
  { label: 'Performance', href: '/app/performance', screen: 'performance' },
  { label: 'Diversification', href: '/app/diversification', screen: 'diversification' },
];

const ELITE_TABS: AppTab[] = [
  { label: 'Tax', href: '/app/tax', screen: 'tax' },
  { label: 'Alerts', href: '/app/alerts', screen: 'alerts' },
];

// The tab list for a tier, with the public Insights section appended (it's
// available to every tier, so it isn't filtered by canAccessScreen).
export function navItemsForTier(tier: Tier): { label: string; href: string }[] {
  const tabs = [...FREE_TABS, ...PRO_TABS, ...ELITE_TABS].filter((t) =>
    canAccessScreen(tier, t.screen),
  );
  return [
    ...tabs.map((t) => ({ label: t.label, href: t.href })),
    { label: 'Insights', href: '/app/insights' },
  ];
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { canAccessScreen, type Tier, type Screen } from '@/lib/tiers';
import { NavTabs } from '@/components/NavTabs';
import { DialogProvider } from '@/components/DialogProvider';
import { UserMenu } from '@/components/UserMenu';

interface NavTab { label: string; href: string; screen: Screen; }

const FREE_TABS: NavTab[] = [
  { label: 'Home',        href: '/app/home',   screen: 'home' },
  { label: 'Coming up',   href: '/app/next',   screen: 'next' },
  { label: 'Your stocks', href: '/app/stocks', screen: 'stocks' },
  { label: 'Your year',   href: '/app/year',   screen: 'year' },
];

const PRO_TABS: NavTab[] = [
  { label: 'Dashboard',     href: '/app/dashboard',       screen: 'dashboard' },
  { label: 'Holdings',      href: '/app/holdings',        screen: 'holdings' },
  { label: 'Calendar',      href: '/app/calendar',        screen: 'calendar' },
  { label: 'Forecast',      href: '/app/forecast',        screen: 'forecast' },
  { label: 'Performance',   href: '/app/performance',     screen: 'performance' },
  { label: 'Diversification', href: '/app/diversification', screen: 'diversification' },
];

const ELITE_TABS: NavTab[] = [
  { label: 'Tax',    href: '/app/tax',    screen: 'tax' },
  { label: 'Alerts', href: '/app/alerts', screen: 'alerts' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', user.id)
    .single();
  const tier = (sub?.tier ?? 'free') as Tier;

  const tabs = [...FREE_TABS, ...PRO_TABS, ...ELITE_TABS].filter((t) =>
    canAccessScreen(tier, t.screen),
  );

  const initials =
    (user.email ?? '??').slice(0, 2).toUpperCase();
  const planLabel = tier === 'free' ? 'Plan · Free' : tier === 'premium' ? '✦ Premium' : '✦ Elite';

  return (
    <DialogProvider>
      <div className="cdn-free flex flex-col min-h-screen">
        <div className="fnav">
          <Link href="/app/home" className="brand">
            <span className="dot" /> Cadence
          </Link>
          <NavTabs tabs={tabs.map((t) => ({ label: t.label, href: t.href }))} />
          <div className="right">
            {tier === 'free' && (
              <Link href="/upgrade" className="plan pro" style={{ textDecoration: 'none' }}>
                Upgrade
              </Link>
            )}
            <span className={'plan ' + (tier === 'premium' ? 'pro' : tier === 'elite' ? 'elite' : '')}>
              {planLabel}
            </span>
            <UserMenu email={user.email ?? ''} initials={initials} tier={tier} />
          </div>
        </div>
        <div className="scroll">{children}</div>
      </div>
    </DialogProvider>
  );
}

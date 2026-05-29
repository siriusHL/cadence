import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { canAccessScreen, type Tier, type Screen } from '@/lib/tiers';
import { NavTabs } from '@/components/NavTabs';
import { DialogProvider } from '@/components/DialogProvider';
import { UserMenu } from '@/components/UserMenu';
import { MailNavIcon } from '@/components/MailNavIcon';
import { MessagesRealtime } from '@/components/MessagesRealtime';
import { PortfolioSwitcher } from '@/components/PortfolioSwitcher';
import { isSupportRole, type Role } from '@/lib/roles';
import { listOwnedPortfolios, getActivePortfolio } from '@/lib/activePortfolio';

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
  { label: 'Dividends',     href: '/app/dividends',       screen: 'dividends' },
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

  const [{ data: sub }, { data: profile }] = await Promise.all([
    supabase.from('subscriptions').select('tier').eq('user_id', user.id).single(),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ]);
  const tier = (sub?.tier ?? 'free') as Tier;
  const isSupport = isSupportRole((profile?.role ?? 'user') as Role);

  const tabs = [...FREE_TABS, ...PRO_TABS, ...ELITE_TABS].filter((t) =>
    canAccessScreen(tier, t.screen),
  );

  const [portfolios, active] = await Promise.all([
    listOwnedPortfolios(supabase, user.id),
    getActivePortfolio(supabase, user.id),
  ]);

  const initials =
    (user.email ?? '??').slice(0, 2).toUpperCase();
  const planLabel = tier === 'free' ? 'Plan · Free' : tier === 'premium' ? '✦ Premium' : '✦ Elite';

  return (
    <DialogProvider>
      <MessagesRealtime />
      <div className="cdn-free flex flex-col min-h-screen">
        <div className="fnav">
          <Link href="/app" className="brand">
            <span className="dot" /> Cadence
          </Link>
          <NavTabs tabs={tabs.map((t) => ({ label: t.label, href: t.href }))} />
          <div className="right">
            {portfolios.length > 0 && (
              <PortfolioSwitcher
                items={portfolios.map((p) => ({ id: p.id, name: p.name }))}
                activeId={active?.id ?? null}
              />
            )}
            {tier === 'free' && (
              <Link href="/upgrade" className="plan pro" style={{ textDecoration: 'none' }}>
                Upgrade
              </Link>
            )}
            <span className={'plan ' + (tier === 'premium' ? 'pro' : tier === 'elite' ? 'elite' : '')}>
              {planLabel}
            </span>
            <MailNavIcon />
            <UserMenu email={user.email ?? ''} initials={initials} tier={tier} isSupport={isSupport} />
          </div>
        </div>
        <div className="scroll">{children}</div>
      </div>
    </DialogProvider>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { navItemsForTier } from '@/lib/appTabs';
import { effectiveTier } from '@/lib/effectiveTier';
import { isAdminEmail } from '@/lib/admin';
import { NavTabs } from '@/components/NavTabs';
import { DialogProvider } from '@/components/DialogProvider';
import { UserMenu } from '@/components/UserMenu';
import { MailNavIcon } from '@/components/MailNavIcon';
import { MessagesRealtime } from '@/components/MessagesRealtime';
import { PortfolioSwitcher } from '@/components/PortfolioSwitcher';
import { isSupportRole, type Role } from '@/lib/roles';
import { listOwnedPortfolios, getActivePortfolio } from '@/lib/activePortfolio';
import { AnnouncementFX } from '@/components/AnnouncementFX';
import { normalizeTheme, bannerClass, effectFor } from '@/lib/announcementThemes';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  // Admins are an operations role with no customer app — the proxy already
  // redirects /app/* to /admin; this is the defense-in-depth backstop.
  if (isAdminEmail(user.email)) redirect('/admin');

  const [{ data: sub }, { data: profile }] = await Promise.all([
    supabase.from('subscriptions').select('tier, admin_tier_override').eq('user_id', user.id).single(),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ]);
  const tier = effectiveTier(sub);
  const isSupport = isSupportRole((profile?.role ?? 'user') as Role);

  const navItems = navItemsForTier(tier);

  const [portfolios, active, { data: site }] = await Promise.all([
    listOwnedPortfolios(supabase, user.id),
    getActivePortfolio(supabase, user.id),
    supabase.from('site_settings').select('announcement, announcement_active, announcement_theme').eq('id', 1).maybeSingle(),
  ]);
  const banner = site?.announcement_active ? site.announcement : null;
  const theme = normalizeTheme(site?.announcement_theme);
  const bannerFx = banner ? effectFor(theme) : 'none';

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
          <NavTabs tabs={navItems} />
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
        {banner && (
          <div role="status" className={bannerClass(theme)}>
            <span>{banner}</span>
          </div>
        )}
        {bannerFx !== 'none' && <AnnouncementFX effect={bannerFx} />}
        <div className="scroll">{children}</div>
      </div>
    </DialogProvider>
  );
}

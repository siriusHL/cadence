import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { effectiveTier } from '@/lib/effectiveTier';
import { isSupportRole, type Role } from '@/lib/roles';
import { UserMenu } from '@/components/UserMenu';
import { DialogProvider } from '@/components/DialogProvider';
import { IndexStrip } from '@/components/insights/market';
import './insights.css';

// PUBLIC Insights chrome — the finance-portal template. Signed-in users get the
// in-app version at /app/insights (real app header); if one lands here directly
// we show their account menu instead of the "Sign in" CTA.
export default async function InsightsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authed = !!user;
  const isAdmin = authed && isAdminEmail(user!.email);
  const isCustomer = authed && !isAdmin;

  let isSupport = false;
  let initials = '';
  let tier: ReturnType<typeof effectiveTier> = 'free';
  if (isCustomer) {
    const [{ data: sub }, { data: profile }] = await Promise.all([
      supabase.from('subscriptions').select('tier, admin_tier_override').eq('user_id', user!.id).single(),
      supabase.from('profiles').select('role').eq('id', user!.id).single(),
    ]);
    tier = effectiveTier(sub);
    isSupport = isSupportRole((profile?.role ?? 'user') as Role);
    initials = (user!.email ?? '??').slice(0, 2).toUpperCase();
  }

  return (
    <div className="ins-scope">
      {/* NAV */}
      <header className="ins-nav">
        <div className="ins-wrap ins-nav-inner">
          <Link className="ins-brand" href={authed ? (isAdmin ? '/admin' : '/app') : '/'}>
            <span className="ins-bdot" /> CADENCE
          </Link>
          <form className="ins-nav-search" action="/insights" method="get" role="search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="search" name="q" placeholder="Search a stock, ETF or story…" aria-label="Search" />
          </form>
          <div className="ins-nav-right">
            <Link className="nlink on" href="/insights">News</Link>
            <Link className="nlink" href="/pricing">Pricing</Link>
            <Link className="nlink" href="/#faq">More</Link>
            {!authed && <Link className="ins-btn-signin" href="/login">Sign in</Link>}
            {isAdmin && <Link className="ins-btn-signin" href="/admin">Admin console</Link>}
            {isCustomer && (
              <DialogProvider>
                <UserMenu email={user!.email ?? ''} initials={initials} tier={tier} isSupport={isSupport} />
              </DialogProvider>
            )}
          </div>
        </div>
      </header>

      {/* SUB-NAV */}
      <nav className="ins-subnav">
        <div className="ins-wrap ins-subnav-inner">
          <Link href="/insights">Market overview</Link>
          <Link href="/insights/stock-market">Stocks</Link>
          <Link href="/insights/etf">ETFs</Link>
          <Link href="/insights/personal-finance">Personal finance</Link>
          <Link className="on" href="/insights">News</Link>
        </div>
      </nav>

      {/* INDEX STRIP — illustrative sample data */}
      <IndexStrip />

      <main>{children}</main>

      <footer className="ins-wrap ins-foot">
        <span className="brand">© 2026 Cadence — market data delayed, shown for indicative purposes only.</span>
        <nav className="fl">
          <Link href="/#faq">Help</Link>
          <Link href="/pricing">Pricing</Link>
          {authed ? <Link href={isAdmin ? '/admin' : '/app'}>Back to app</Link> : <Link href="/login">Sign in</Link>}
        </nav>
      </footer>
    </div>
  );
}

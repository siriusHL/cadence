import { getSupabaseServer } from '@/lib/supabase/server';
import { listOwnedPortfolios, getActivePortfolio } from '@/lib/activePortfolio';
import { TIERS, type Tier } from '@/lib/tiers';
import { PortfolioManager } from '@/components/PortfolioManager';
import { AccountMobile } from '@/components/mobile/AccountMobile';

export const dynamic = 'force-dynamic';

export default async function PortfoliosPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', user!.id)
    .maybeSingle();
  const tier = (sub?.tier ?? 'free') as Tier;

  const [portfolios, active] = await Promise.all([
    listOwnedPortfolios(supabase, user!.id),
    getActivePortfolio(supabase, user!.id),
  ]);

  const cap = TIERS[tier].maxPortfolios;

  const portfolioName = active?.name ?? 'Main portfolio';
  const avatarInitials = (user?.email ?? 'U').slice(0, 2).toUpperCase();

  const managerContent = (
    <PortfolioManager
      tier={tier}
      portfolios={portfolios}
      activeId={active?.id ?? null}
      cap={cap}
    />
  );

  return (
    <>
      <div className="cdn-mobile-only">
        <AccountMobile
          title="Portfolios"
          sub="Group holdings into separate portfolios — retirement, taxable, watchlist, whatever suits how you think about your money."
          portfolioName={portfolioName}
          avatarInitials={avatarInitials}
        >
          {managerContent}
        </AccountMobile>
      </div>
      <div className="cdn-desktop-only">
    <div className="cdn-pro" style={{ maxWidth: 880, marginInline: 'auto' }}>
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Account</div>
          <h1>Portfolios</h1>
          <div className="sub">
            Group holdings into separate portfolios — retirement, taxable, watchlist, whatever
            suits how you think about your money.
          </div>
        </div>
        <div className="right-meta">
          <span>
            {portfolios.length} / {Number.isFinite(cap) ? cap : '∞'}
          </span>
          <span>
            {tier === 'free' ? 'Free plan' : tier === 'premium' ? '✦ Premium' : '✦ Elite'}
          </span>
        </div>
      </div>

      {managerContent}
    </div>
      </div>
    </>
  );
}

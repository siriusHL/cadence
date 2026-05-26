import { getSupabaseServer } from '@/lib/supabase/server';
import { listOwnedPortfolios, getActivePortfolio } from '@/lib/activePortfolio';
import { TIERS, type Tier } from '@/lib/tiers';
import { PortfolioManager } from '@/components/PortfolioManager';
import { AccountMobile } from '@/components/mobile/AccountMobile';
import {
  PortfoliosMobile,
  type PortfoliosMobileItem,
} from '@/components/mobile/PortfoliosMobile';
import { getPortfolioSummary } from '@/lib/portfolio';

export const dynamic = 'force-dynamic';

export default async function PortfoliosPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier, current_period_end')
    .eq('user_id', user!.id)
    .maybeSingle();
  const tier = (sub?.tier ?? 'free') as Tier;
  const renewsOn = (sub?.current_period_end as string | null | undefined) ?? null;

  const [portfolios, active] = await Promise.all([
    listOwnedPortfolios(supabase, user!.id),
    getActivePortfolio(supabase, user!.id),
  ]);

  const cap = TIERS[tier].maxPortfolios;

  const portfolioName = active?.name ?? 'Main portfolio';
  const avatarInitials = (user?.email ?? 'U').slice(0, 2).toUpperCase();

  // Enriched per-portfolio data for the mobile view — holdings count
  // + total value + forward income, plus active/default flags. The
  // "default" portfolio is the oldest one (matches getPrimaryPortfolio,
  // which is what gets restored when no `active_portfolio_id` cookie
  // is set).
  const defaultId = portfolios[0]?.id ?? null;
  const summaries = await Promise.all(
    portfolios.map((p) => getPortfolioSummary(supabase, p.id)),
  );
  const mobilePortfolios: PortfoliosMobileItem[] = portfolios.map((p, i) => ({
    id: p.id,
    name: p.name,
    active: p.id === active?.id,
    isDefault: p.id === defaultId,
    holdings: summaries[i].positionsCount,
    value: summaries[i].totalValue,
    fwdIncome: summaries[i].forwardAnnualIncome,
  }));

  const tierLabel =
    tier === 'free' ? 'Free plan'
    : tier === 'premium' ? '✦ Premium'
    : '✦ Elite';

  return (
    <>
      <div className="cdn-mobile-only">
        <AccountMobile
          title="Portfolios"
          sub="Group holdings into separate portfolios — retirement, taxable, watchlist, whatever suits how you think about your money."
          portfolioName={portfolioName}
          avatarInitials={avatarInitials}
        >
          <PortfoliosMobile
            tier={tier}
            tierLabel={tierLabel}
            cap={cap}
            renewsOn={renewsOn}
            portfolios={mobilePortfolios}
          />
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

          <PortfolioManager
            tier={tier}
            portfolios={portfolios}
            activeId={active?.id ?? null}
            cap={cap}
          />
        </div>
      </div>
    </>
  );
}

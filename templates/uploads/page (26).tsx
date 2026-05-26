import Link from 'next/link';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getUpcomingDividends, getHoldingsView } from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { EmptyState } from '@/components/EmptyState';
import { TickerLogo } from '@/components/TickerLogo';
import { type Tier } from '@/lib/tiers';

export default async function NextScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sub } = await supabase
    .from('subscriptions').select('tier').eq('user_id', user!.id).single();
  const tier = (sub?.tier ?? 'free') as Tier;
  const portfolio = await getActivePortfolio(supabase, user!.id);

  if (!portfolio) {
    return (
      <EmptyState
        title="Add your first holding"
        body="Once you've added a dividend-paying stock, Cadence will show you exactly when your next payments arrive."
        ctaLabel="Add a holding"
        ctaHref="/app/home"
      />
    );
  }

  // Self-heal: enrich any ticker missing dividend history / payout cadence.
  const held = (await getHoldingsView(supabase, portfolio.id)).filter((h) => h.quantity > 0);
  if (held.length > 0) await enrichInstruments(held.map((h) => h.ticker));

  const upcoming = await getUpcomingDividends(supabase, portfolio.id, 60);

  if (upcoming.length === 0) {
    return (
      <EmptyState
        icon="📅"
        title="Nothing scheduled in the next 60 days"
        body="Either you haven't added any dividend payers yet, or none of yours have an ex-dividend date coming up. Add more stocks to see the schedule fill in."
        ctaLabel="Manage holdings"
        ctaHref="/app/stocks"
      />
    );
  }

  const next = upcoming[0];
  const fmt = (n: number) => n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateLabel = (s: string) =>
    new Date(s).toLocaleDateString('en', { month: 'short', day: '2-digit' });

  return (
    <>
      <div className="hero" style={{ paddingBottom: 16 }}>
        <div className="eyebrow">Coming up</div>
        <div className="big">
          <span style={{ color: 'oklch(0.48 0.08 175)' }}>{next.ticker}</span>
          <span style={{ fontSize: 44, fontWeight: 400, color: 'var(--text-dim)', marginLeft: 12 }}>
            pays you in
          </span>
        </div>
        <div className="sub" style={{ marginTop: 12 }}>
          <span style={{ fontSize: 44, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {next.daysUntil <= 0 ? 'today' : `${next.daysUntil} days`}
          </span>
        </div>
        <div
          style={{
            marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 14,
            padding: '12px 18px', background: 'var(--surface)', borderRadius: 999,
            boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 6px 18px rgba(0,0,0,.04)',
          }}
        >
          <TickerLogo ticker={next.ticker} size={36} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{next.name ?? next.ticker}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {next.isProjected ? 'Projected · not yet declared' : 'Dividend payment'}
            </div>
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--surface-hover)' }} />
          <div style={{ textAlign: 'left' }}>
            <div className="num" style={{ fontSize: 14, fontWeight: 500 }}>
              {next.currency === 'EUR' ? '€' : ''}{fmt(next.estimatedTotalLocal)}
              {next.currency && next.currency !== 'EUR' && ` ${next.currency}`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>arriving {dateLabel(next.payDate ?? next.exDate)}</div>
          </div>
        </div>
      </div>

      <div>
        <div className="sect-h">More <span className="light">on the way</span></div>
        <div className="sect-sub">The next few payments you&apos;ll receive.</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {upcoming.slice(1, 12).map((p, i) => (
          <div key={`${p.ticker}-${i}`} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '12px 18px',
            background: 'var(--surface)', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,.03)',
          }}>
            <TickerLogo ticker={p.ticker} size={38} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                {p.name ?? p.ticker}
                {p.isProjected && (
                  <span style={{
                    fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4,
                    background: 'var(--surface-2)', color: 'var(--text-muted)',
                  }}>
                    Est.
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                in {p.daysUntil} day{p.daysUntil === 1 ? '' : 's'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="num" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em' }}>
                {p.currency === 'EUR' ? '€' : ''}{fmt(p.estimatedTotalLocal)}
                {p.currency && p.currency !== 'EUR' && ` ${p.currency}`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {dateLabel(p.payDate ?? p.exDate)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {tier === 'free' && (
        <div style={{ marginTop: 14 }}>
          <div className="upsell">
            <div className="icon">✦</div>
            <div className="body">
              <div className="h">See your full payment calendar</div>
              <div className="p">Premium shows every payment for the next 12 months — and reminds you 3 days before each one.</div>
            </div>
            <Link href="/upgrade" className="cta" style={{ textDecoration: 'none' }}>Upgrade</Link>
          </div>
        </div>
      )}
    </>
  );
}

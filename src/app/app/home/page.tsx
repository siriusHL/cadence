import Link from 'next/link';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getSupabaseServer } from '@/lib/supabase/server';
import { FreeHomeMobile } from '@/components/mobile/FreeMobile';
import {
  
  getHoldingsView,
  getYearOverview,
  getUpcomingDividends,
} from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { EmptyState } from '@/components/EmptyState';
import { TickerLogo } from '@/components/TickerLogo';
import { type Tier } from '@/lib/tiers';

const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtMoney(n: number): { whole: string; cents: string } {
  const fixed = n.toFixed(2);
  const [whole, cents] = fixed.split('.');
  const wholeFormatted = Number(whole).toLocaleString('en-IE');
  return { whole: wholeFormatted, cents };
}

export default async function HomeScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sub } = await supabase
    .from('subscriptions').select('tier').eq('user_id', user!.id).single();
  const tier = (sub?.tier ?? 'free') as Tier;

  const portfolio = await getActivePortfolio(supabase, user!.id);

  // No portfolio yet → onboarding state
  if (!portfolio) {
    return (
      <EmptyState
        icon="👋"
        title="Welcome to Cadence"
        body="Start by adding your first dividend-paying stock. We'll track every payment and forecast the year ahead."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  const holdings = (await getHoldingsView(supabase, portfolio.id)).filter((h) => h.quantity > 0);

  // Has portfolio but no active holdings
  if (holdings.length === 0) {
    return (
      <EmptyState
        icon="✦"
        title="Add your first holding"
        body="Track your dividend stocks here. As soon as you add one, Cadence will tell you what it pays and when."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  // Real data path. Enrich first so dividend/quote caches are warm.
  await enrichInstruments(holdings.map((h) => h.ticker));

  // Sort by current market value so the home strip surfaces the biggest
  // positions first when we cap it.
  holdings.sort((a, b) => (b.price ?? 0) * b.quantity - (a.price ?? 0) * a.quantity);

  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth();

  const [months, upcoming] = await Promise.all([
    getYearOverview(supabase, portfolio.id, year),
    getUpcomingDividends(supabase, portfolio.id, 60),
  ]);

  const thisMonth = months[currentMonth];
  const lastMonth = currentMonth > 0 ? months[currentMonth - 1] : null;
  const thisMonthBest = Math.max(thisMonth.received, thisMonth.expected);
  const lastMonthBest = lastMonth ? Math.max(lastMonth.received, lastMonth.expected) : 0;
  const delta = thisMonthBest - lastMonthBest;
  const receivedThisMonth = thisMonth.received > 0;

  const ytdReceived = months.slice(0, currentMonth + 1).reduce((s, m) => s + m.received, 0);
  const forwardAnnual = months.reduce((s, m) => s + m.expected, 0);
  const heroMoney = fmtMoney(thisMonthBest);
  const next = upcoming[0] ?? null;
  const totalValue = holdings.reduce((s, h) => s + (h.price ?? 0) * h.quantity, 0);

  const avatarInitials = (user?.email ?? 'U').slice(0, 2).toUpperCase();

  return (
    <>
      <div className="cdn-mobile-only">
        <FreeHomeMobile
          thisMonth={thisMonthBest}
          lastMonth={lastMonthBest}
          ytdReceived={ytdReceived}
          fwdAnnual={forwardAnnual}
          holdings={holdings.slice(0, 6).map((h) => ({
            ticker: h.ticker,
            name: h.name,
            qty: h.quantity,
            price: h.price,
            currency: h.currency,
            fwdDivLocal: h.fwdDivAnnualLocal,
          }))}
          nextPayment={next ? {
            ticker: next.ticker,
            name: next.name,
            estimatedTotalLocal: next.estimatedTotalLocal,
            daysUntil: next.daysUntil,
          } : null}
          portfolioName={portfolio.name}
          avatarInitials={avatarInitials}
        />
      </div>
      <div className="cdn-desktop-only">
      <div className="hero">
        <div className="eyebrow">
          This month, {MONTH_NAMES_LONG[currentMonth]} {year}
        </div>
        <div className="big">
          <span className="cur">€</span>
          {heroMoney.whole}
          <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>.{heroMoney.cents}</span>
        </div>
        <div className="sub">
          {receivedThisMonth ? (
            <>
              Your stocks paid you in dividends.<br />
              {delta >= 0
                ? <>That&apos;s <b>€{fmt(delta)} more</b> than last month.</>
                : <>That&apos;s <b>€{fmt(-delta)} less</b> than last month.</>}
            </>
          ) : thisMonthBest > 0 ? (
            <>
              Your stocks should pay you this month, based on their schedules.<br />
              Tracking <b>{holdings.length} {holdings.length === 1 ? 'stock' : 'stocks'}</b> worth about <b>€{fmt(totalValue)}</b>.
            </>
          ) : (
            <>
              No dividends scheduled for {MONTH_NAMES_LONG[currentMonth]}.<br />
              Tracking <b>{holdings.length} {holdings.length === 1 ? 'stock' : 'stocks'}</b> worth about <b>€{fmt(totalValue)}</b>.
            </>
          )}
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="label">This year so far</div>
          <div className="v">
            <span className="cur">€</span>{fmt(ytdReceived)}
          </div>
          <div className="delta">
            {ytdReceived > 0
              ? <>Across {monthsWithReceipts(months, currentMonth)} month{monthsWithReceipts(months, currentMonth) === 1 ? '' : 's'}</>
              : <>Log past dividends to populate this</>}
          </div>
        </div>
        <div className="card">
          <div className="label">Looking ahead — next 12 months</div>
          <div className="v">
            <span className="cur">€</span>{fmt(forwardAnnual)}
          </div>
          <div className="delta">
            Forward annual income at current holdings
          </div>
        </div>
        <div className="card">
          <div className="label">Next payment</div>
          {next ? (
            <>
              <div className="v sm">{next.ticker}</div>
              <div className="delta">
                €{fmt(next.estimatedTotalLocal, 2)} · in {next.daysUntil} day{next.daysUntil === 1 ? '' : 's'}
                {next.isProjected && <> · est.</>}
              </div>
            </>
          ) : (
            <>
              <div className="v sm">—</div>
              <div className="delta">No upcoming dividends in 60 days</div>
            </>
          )}
        </div>
      </div>

      <div className="divider" />

      {/* Quick holdings strip */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Your holdings</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/app/stocks" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
              See all →
            </Link>
            <Link
              href="/app/add"
              style={{
                fontSize: 12, fontWeight: 500, padding: '6px 12px',
                background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', borderRadius: 999,
                textDecoration: 'none',
              }}
            >
              + Add holding
            </Link>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {holdings.slice(0, 10).map((h) => {
            const monthly = ((h.fwdDivAnnualLocal ?? 0) * h.quantity) / 12;
            const value = (h.price ?? 0) * h.quantity;
            return (
              <div key={h.ticker} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '8px 10px', borderRadius: 10,
              }}>
                <TickerLogo ticker={h.ticker} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{h.ticker}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.name ?? h.ticker} · {fmt(h.quantity, h.quantity % 1 === 0 ? 0 : 2)} share{h.quantity === 1 ? '' : 's'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontSize: 13, fontWeight: 500 }}>€{fmt(value)}</div>
                  <div className="num" style={{ fontSize: 11, color: 'var(--text-dim)' }}>€{fmt(monthly)}/mo</div>
                </div>
              </div>
            );
          })}
        </div>
        {holdings.length > 10 && (
          <div style={{
            marginTop: 10, paddingTop: 10,
            borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 12, color: 'var(--text-dim)',
          }}>
            <span>Showing top 10 by value · {holdings.length - 10} more</span>
            <Link href="/app/stocks" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>
              See all {holdings.length} →
            </Link>
          </div>
        )}
      </div>

      {tier === 'free' && (
        <div style={{ marginTop: 14 }}>
          <div className="upsell">
            <div className="icon">✦</div>
            <div className="body">
              <div className="h">Want to see further ahead?</div>
              <div className="p">Forecast 12 months of income, simulate dividend reinvestment, track your passive income goal, and reclaim foreign tax.</div>
            </div>
            <Link href="/upgrade" className="cta" style={{ textDecoration: 'none' }}>
              Upgrade
            </Link>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

function monthsWithReceipts(months: { received: number }[], throughMonth: number): number {
  return months.slice(0, throughMonth + 1).filter((m) => m.received > 0).length;
}

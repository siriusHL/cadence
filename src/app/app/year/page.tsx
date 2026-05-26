import Link from 'next/link';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getYearOverview, getHoldingsView } from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { EmptyState } from '@/components/EmptyState';
import { YearChart } from '@/components/YearChart';
import { type Tier } from '@/lib/tiers';
import { FreeYearMobile } from '@/components/mobile/FreeMobile';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function YearScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sub } = await supabase
    .from('subscriptions').select('tier').eq('user_id', user!.id).single();
  const tier = (sub?.tier ?? 'free') as Tier;
  const portfolio = await getActivePortfolio(supabase, user!.id);

  if (!portfolio) {
    return (
      <EmptyState
        title="No year to summarise yet"
        body="Once you start logging dividend payments, Cadence will tell the story of your year — month by month."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  // Make sure dividend cache + cadence are populated for held tickers.
  const held = (await getHoldingsView(supabase, portfolio.id)).filter((h) => h.quantity > 0);
  if (held.length > 0) await enrichInstruments(held.map((h) => h.ticker));

  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const months = await getYearOverview(supabase, portfolio.id, year);

  const activeCount = held.length;
  const hasAny = months.some((m) => m.received > 0 || m.expected > 0);
  if (activeCount === 0 || !hasAny) {
    return (
      <EmptyState
        icon="📈"
        title={`Nothing received yet in ${year}`}
        body="Log your first dividend payment — or add holdings and let Cadence forecast the year for you."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  const receivedSoFar = months.slice(0, currentMonth + 1).reduce((s, m) => s + m.received, 0);
  // Expected = (received this year) + (everything projected for any month where we haven't already received more)
  // To avoid double-counting: per month, take max(received, expected).
  const fullYearEstimate = months.reduce((s, m) => s + Math.max(m.received, m.expected), 0);
  const expectedRemaining = Math.max(0, fullYearEstimate - receivedSoFar);

  const dayOfYear = Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / 86_400_000) + 1;
  const dailyAvg = dayOfYear > 0 ? receivedSoFar / dayOfYear : 0;

  // Biggest month — by max(received, expected)
  let biggestMonth = -1; let biggestValue = 0;
  months.forEach((m, i) => {
    const v = Math.max(m.received, m.expected);
    if (v > biggestValue) { biggestValue = v; biggestMonth = i; }
  });

  const avatarInitials = (user?.email ?? 'U').slice(0, 2).toUpperCase();

  return (
    <>
      <div className="cdn-mobile-only">
        <FreeYearMobile
          year={year}
          months={months.map((m) => ({
            month: m.month,
            year: m.year,
            received: m.received,
            expected: m.expected,
          }))}
          nowIndex={currentMonth}
          portfolioName={portfolio.name}
          avatarInitials={avatarInitials}
        />
      </div>
      <div className="cdn-desktop-only">
      <div className="hero">
        <div className="eyebrow">Your {year} so far</div>
        <div className="big">
          <span className="cur">€</span>
          {Math.round(receivedSoFar).toLocaleString('de-DE')}
        </div>
        <div className="sub">
          {receivedSoFar > 0
            ? <>in dividends, just from your stocks.<br/>That&apos;s like <b>€{dailyAvg.toFixed(2)} every day</b>, on autopilot.</>
            : <>No dividends received yet. The faded bars below show what to expect from your current holdings.</>}
        </div>
      </div>

      <div
        className="card year-card yc-anim"
        style={{ padding: '18px 22px', ['--i' as never]: 0 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>Income by month</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
              Solid blocks are what you&apos;ve received. Faded blocks show what&apos;s expected.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="pill" style={{ background: 'var(--surface-2)' }}>{year}</span>
          </div>
        </div>

        <YearChart months={months} currentMonth={currentMonth} />
      </div>

      <div className="grid-3" style={{ marginTop: 12 }}>
        <div className="card yc-anim" style={{ ['--i' as never]: 1 }}>
          <div className="label">Expected by year-end</div>
          <div className="v">
            <span className="cur">€</span>
            {Math.round(fullYearEstimate).toLocaleString('de-DE')}
          </div>
          <div className="delta">
            {receivedSoFar > 0
              ? `€${Math.round(receivedSoFar)} received · €${Math.round(expectedRemaining)} expected`
              : `€${Math.round(expectedRemaining)} expected from your ${activeCount} holding${activeCount === 1 ? '' : 's'}`}
          </div>
        </div>
        <div className="card yc-anim" style={{ ['--i' as never]: 2 }}>
          <div className="label">Biggest paying month</div>
          <div className="v sm">
            {biggestMonth >= 0 ? MONTH_NAMES[biggestMonth] : '—'}
          </div>
          <div className="delta">
            {biggestValue > 0 ? `~€${Math.round(biggestValue)} expected` : 'No data yet'}
          </div>
        </div>
        <div className="card yc-anim" style={{ ['--i' as never]: 3 }}>
          <div className="label">A fun way to think about it</div>
          <div className="v sm">
            {fullYearEstimate / 365 >= 3 ? 'Coffee a day, on us' : 'A daily snack, on autopilot'}
          </div>
          <div className="delta">
            €{(fullYearEstimate / 365).toFixed(2)} daily · forever
          </div>
        </div>
      </div>

      {tier === 'free' && (
        <div className="yc-anim" style={{ marginTop: 14, ['--i' as never]: 4 }}>
          <div className="upsell">
            <div className="icon">✦</div>
            <div className="body">
              <div className="h">See 5, 10, 25 years ahead</div>
              <div className="p">Premium projects how your dividend income compounds with reinvestment, contributions, and historical growth. Plan your path to financial freedom.</div>
            </div>
            <Link href="/upgrade" className="cta" style={{ textDecoration: 'none' }}>Upgrade</Link>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

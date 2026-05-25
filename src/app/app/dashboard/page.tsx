import Link from 'next/link';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getSupabaseServer } from '@/lib/supabase/server';
import {
  
  getHoldingsView,
  getPortfolioSummary,
  getIncomeRhythm,
  getTopContributors,
  getUpcomingDividends,
} from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { EmptyState } from '@/components/EmptyState';
import { TickerLogo } from '@/components/TickerLogo';
import { IncomeRhythmChart } from '@/components/IncomeRhythmChart';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default async function DashboardScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const portfolio = await getActivePortfolio(supabase, user!.id);

  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        body="Add your first holding to bring the Dashboard to life."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  const held = (await getHoldingsView(supabase, portfolio.id)).filter((h) => h.quantity > 0);
  if (held.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="Dashboard is empty"
        body="Add some buy transactions to start tracking your portfolio."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  // Make sure quote/dividend caches are warm for every held ticker
  await enrichInstruments(held.map((h) => h.ticker));

  // Fetch a wide window so the client range selector can show 6M / 1Y / 18M / 3Y
  // without re-querying. 36 past + 6 future = 42 total.
  const FULL_PAST = 36;
  const FULL_FUTURE = 6;

  const [summary, rhythm, contributors, upcoming] = await Promise.all([
    getPortfolioSummary(supabase, portfolio.id),
    getIncomeRhythm(supabase, portfolio.id, FULL_PAST, FULL_FUTURE),
    getTopContributors(supabase, portfolio.id, 6),
    getUpcomingDividends(supabase, portfolio.id, 60),
  ]);

  // Index of the current month inside `rhythm` (0-based).
  const nowIndex = FULL_PAST - 1;
  const today = new Date();
  const todayLabel = today.toLocaleDateString('en', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
  const topContribMax = contributors[0]?.forwardAnnualLocal ?? 0;
  const next5 = upcoming.slice(0, 5);

  // FIRE target placeholder — €30k/year is a common European FIRE benchmark
  const fireTarget = 30_000;
  const firePct = Math.min(100, (summary.forwardAnnualIncome / fireTarget) * 100);
  // Naive years-to-target at assumed 8%/yr income growth
  const growth = 0.08;
  const yearsToFire = summary.forwardAnnualIncome > 0 && summary.forwardAnnualIncome < fireTarget
    ? Math.ceil(Math.log(fireTarget / summary.forwardAnnualIncome) / Math.log(1 + growth))
    : 0;

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Your portfolio · {todayLabel}</div>
          <h1>
            €{Math.floor(summary.totalValue).toLocaleString('en-IE')}
            <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>
              .{(summary.totalValue % 1).toFixed(2).slice(2)}
            </span>
          </h1>
          <div className="sub">
            {summary.unrealizedPL >= 0 ? 'Up ' : 'Down '}
            <b style={{ color: summary.unrealizedPL >= 0 ? 'oklch(0.48 0.08 165)' : 'oklch(0.50 0.16 25)' }}>
              €{fmt(Math.abs(summary.unrealizedPL))} ({summary.unrealizedPLPct >= 0 ? '+' : ''}{summary.unrealizedPLPct.toFixed(2)}%)
            </b>
            {' since you started · '}
            <b>{summary.positionsCount} stock{summary.positionsCount === 1 ? '' : 's'}</b>
            {summary.countriesCount > 0 && (
              <> across {summary.countriesCount} countr{summary.countriesCount === 1 ? 'y' : 'ies'}</>
            )}
            {' paying '}<b>€{fmt(summary.forwardAnnualIncome)}</b>/year forward.
          </div>
        </div>
        <div className="right-meta">
          <span className="live">Live · synced just now</span>
          <span>{summary.positionsCount} positions</span>
        </div>
      </div>

      {/* 4-tile stat strip (cash + safety from template omitted in v0) */}
      <div className="hero-stats dash-stats cdn-anim" style={{ ['--i' as never]: 0 }}>
        <div className="tile" style={{ ['--i' as never]: 0 }}>
          <div className="l">Forward income</div>
          <div className="v"><span className="cur">€</span>{fmt(summary.forwardAnnualIncome)}</div>
          <div className="d">over the next 12 months</div>
        </div>
        <div className="tile" style={{ ['--i' as never]: 1 }}>
          <div className="l">Forward yield</div>
          <div className="v">{summary.forwardYieldPct.toFixed(2)}<span style={{ fontSize: 16, color: 'var(--text-dim)', fontWeight: 400 }}>%</span></div>
          <div className="d">YoC <b style={{ color: 'var(--text)' }}>{summary.yieldOnCostPct.toFixed(2)}%</b></div>
        </div>
        <div className="tile" style={{ ['--i' as never]: 2 }}>
          <div className="l">YTD income</div>
          <div className="v"><span className="cur">€</span>{fmt(summary.ytdReceived)}</div>
          <div className="d">received Jan {today.getFullYear()} → today</div>
        </div>
        <div className="tile" style={{ ['--i' as never]: 3 }}>
          <div className="l">T12M income</div>
          <div className="v"><span className="cur">€</span>{fmt(summary.t12mReceived)}</div>
          <div className="d">trailing 12 months</div>
        </div>
      </div>

      {/* Income rhythm chart */}
      <div className="pcard cdn-anim interactive" style={{ ['--i' as never]: 1 }}>
        <div className="pcard-h">
          <div>
            <div className="t">Income rhythm</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3 }}>
              Dividends received and expected. Hover any month for the breakdown.
            </div>
          </div>
        </div>
        <IncomeRhythmChart months={rhythm} nowIndex={nowIndex} />
      </div>

      {/* 3-column row */}
      <div className="row-3" style={{ gridTemplateColumns: '1.2fr 1.1fr 1fr' }}>
        {/* Top contributors */}
        <div className="pcard cdn-anim interactive contributors-card" style={{ ['--i' as never]: 2 }}>
          <div className="pcard-h">
            <div className="t">Top income contributors</div>
            <span className="tag">Forward 12M</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {contributors.map((c, i) => {
              const widthPct = topContribMax > 0 ? (c.forwardAnnualLocal / topContribMax) * 100 : 0;
              return (
                <div
                  key={c.ticker}
                  className="contrib-row"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, animationDelay: `${360 + i * 70}ms` }}
                >
                  <TickerLogo ticker={c.ticker} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.ticker}
                      {c.name && <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 11.5 }}> · {c.name}</span>}
                    </div>
                    <div className="pbar contrib-bar" style={{ marginTop: 5 }}>
                      <i style={{ width: `${widthPct}%`, animationDelay: `${420 + i * 70}ms` }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }} className="num">
                    <div style={{ fontSize: 13, fontWeight: 600 }}>€{fmt(c.forwardAnnualLocal)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {c.yieldPct != null ? `${c.yieldPct.toFixed(2)}% yld` : '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coming up */}
        <div className="pcard cdn-anim interactive upcoming-card" style={{ ['--i' as never]: 3 }}>
          <div className="pcard-h">
            <div className="t">Coming up · next 5</div>
            <span className="tag">{next5.length === 0 ? '—' : `next ${next5[next5.length - 1]?.daysUntil ?? 0}d`}</span>
          </div>
          {next5.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '20px 0' }}>
              No dividends scheduled in the next 60 days.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {next5.map((e, i) => {
                const d = new Date(e.exDate);
                return (
                  <div
                    key={`${e.ticker}-${i}`}
                    className="upcoming-row"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                      borderBottom: i < next5.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                      animationDelay: `${420 + i * 70}ms`,
                    }}
                  >
                    <div style={{ width: 44, textAlign: 'center' }}>
                      <div className="num" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>
                        {String(d.getDate()).padStart(2, '0')}
                      </div>
                      <div style={{ fontSize: 9.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                        {MONTH_SHORT[d.getMonth()]}
                      </div>
                    </div>
                    <TickerLogo ticker={e.ticker} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{e.ticker}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.name ?? e.ticker}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }} className="num">
                      <div style={{ fontSize: 13, fontWeight: 600 }}>€{fmt(e.estimatedTotalLocal, 2)}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>
                        {e.daysUntil === 0 ? 'today' : `in ${e.daysUntil}d`}
                        {e.isProjected && ' · est'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FIRE progress */}
        <div className="pcard cdn-anim interactive fire-card" style={{ ['--i' as never]: 4 }}>
          <div className="pcard-h">
            <div className="t">FIRE progress</div>
            <span className="tag">€{(fireTarget / 1000).toFixed(0)}k / yr target</span>
          </div>
          <div className="num" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
            <span style={{ fontSize: 17, color: 'var(--text-dim)', fontWeight: 400 }}>€</span>{fmt(summary.forwardAnnualIncome)}
            <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 400, marginLeft: 8 }}>/ €{fmt(fireTarget)}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
            {firePct.toFixed(1)}% of FIRE
            {yearsToFire > 0 && <> · est. <b style={{ color: 'var(--text)' }}>~{yearsToFire} years</b> at {(growth * 100).toFixed(0)}% growth</>}
          </div>

          <div
            className="fire-track"
            style={{
              position: 'relative', height: 8, background: 'var(--surface-hover)', borderRadius: 4,
              overflow: 'hidden', marginTop: 16,
            }}
          >
            <div
              className="fire-fill"
              style={{ position: 'absolute', inset: 0, width: `${firePct}%`, background: 'oklch(0.55 0.10 175)', borderRadius: 4 }}
            />
            {[0.25, 0.5, 0.75].map((p, i) => (
              <div key={i} style={{ position: 'absolute', top: -2, bottom: -2, left: `${p * 100}%`, width: 1, background: 'var(--surface)' }} />
            ))}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 5,
            fontSize: 10, color: 'var(--text-dim)', fontWeight: 500,
          }} className="num">
            <span>€0</span><span>€7.5k</span><span>€15k</span><span>€22.5k</span><span>€30k</span>
          </div>

          <div style={{ marginTop: 18, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>YTD received</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>€{fmt(summary.ytdReceived)}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-dim)' }}>
                {summary.forwardAnnualIncome > 0
                  ? `${((summary.ytdReceived / summary.forwardAnnualIncome) * 100).toFixed(0)}% of forward annual`
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
        <Link href="/app/stocks" style={{ color: 'inherit' }}>← Back to Your Stocks</Link>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getSupabaseServer } from '@/lib/supabase/server';
import {

  getHoldingsView,
  getPortfolioSummary,
  getIncomeRhythm,
  getTopContributors,
  getTopPLContributors,
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('income_target')
    .eq('id', user!.id)
    .maybeSingle();

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

  const [summary, rhythm, contributors, plContributors, upcoming] = await Promise.all([
    getPortfolioSummary(supabase, portfolio.id),
    getIncomeRhythm(supabase, portfolio.id, FULL_PAST, FULL_FUTURE),
    getTopContributors(supabase, portfolio.id, 6),
    getTopPLContributors(supabase, portfolio.id, 6),
    getUpcomingDividends(supabase, portfolio.id, 60),
  ]);

  // Index of the current month inside `rhythm` (0-based).
  const nowIndex = FULL_PAST - 1;
  const today = new Date();
  const todayLabel = today.toLocaleDateString('en', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
  const topContribMax = contributors[0]?.forwardAnnualLocal ?? 0;
  // For the P/L bar we want the largest absolute swing in the list — that way a
  // big loser at the bottom still draws a visible bar instead of a zero stub.
  const topPLMax = plContributors.reduce(
    (m, c) => Math.max(m, Math.abs(c.unrealizedPLLocal)),
    0,
  );
  const next5 = upcoming.slice(0, 5);

  // Portfolio-level avg dividend safety, weighted by position value. Maps the
  // same yield buckets used on the Stocks screen to a 0–100 score: high yield
  // = lower safety (sustainability risk goes up as yields stretch). Holdings
  // without a known yield are excluded — they can't be scored.
  function safetyScoreForYield(yieldPct: number | null): number | null {
    if (yieldPct == null) return null;
    if (yieldPct < 3) return 95;
    if (yieldPct < 5) return 80;
    if (yieldPct < 7) return 55;
    return 30;
  }
  let safetyWeightedSum = 0;
  let safetyWeightTotal = 0;
  let watchCount = 0;
  for (const h of held) {
    const score = safetyScoreForYield(h.fwdYieldPct);
    if (score == null) continue;
    const value = (h.price ?? 0) * h.quantity;
    if (value <= 0) continue;
    safetyWeightedSum += score * value;
    safetyWeightTotal += value;
    if ((h.fwdYieldPct ?? 0) >= 7) watchCount += 1;
  }
  const avgSafety = safetyWeightTotal > 0
    ? Math.round(safetyWeightedSum / safetyWeightTotal)
    : null;
  const safetyLabel = avgSafety == null
    ? '—'
    : avgSafety >= 85 ? 'Very safe'
    : avgSafety >= 70 ? 'Safe'
    : avgSafety >= 50 ? 'Mixed'
    : 'Stretched';
  const safetyColor = avgSafety == null
    ? 'var(--text-dim)'
    : avgSafety >= 70 ? 'oklch(0.48 0.08 165)'
    : avgSafety >= 50 ? 'oklch(0.55 0.10 75)'
    : 'oklch(0.50 0.16 25)';
  function letterGrade(score: number | null): string {
    if (score == null) return '–';
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }
  const safetyLetter = letterGrade(avgSafety);

  // Passive-income target from profile (Settings → Passive income target).
  const incomeTarget = Number(profile?.income_target ?? 30_000);
  const targetPct = Math.min(100, (summary.forwardAnnualIncome / incomeTarget) * 100);
  // Naive years-to-target at assumed 8%/yr income growth
  const growth = 0.08;
  const yearsToTarget = summary.forwardAnnualIncome > 0 && summary.forwardAnnualIncome < incomeTarget
    ? Math.ceil(Math.log(incomeTarget / summary.forwardAnnualIncome) / Math.log(1 + growth))
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

      {/* Stat strip — Cadence Safety Score sits first, wider than the other
          tiles so the ring + headline + sub fit horizontally. */}
      <div
        className="hero-stats dash-stats cdn-anim"
        style={{ ['--i' as never]: 0, gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr' }}
      >
        <div
          className="tile"
          style={{
            ['--i' as never]: 0,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <SafetyRing score={avgSafety} color={safetyColor} size={84} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="l">Cadence Safety Score</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: safetyColor,
                marginTop: 2,
                lineHeight: 1.1,
              }}
            >
              {safetyLabel} · {safetyLetter}
            </div>
            <div className="d" style={{ marginTop: 4 }}>
              {watchCount > 0
                ? `${watchCount} high-yield risk${watchCount === 1 ? '' : 's'} (≥7%)`
                : 'no high-yield risks'}
            </div>
          </div>
        </div>
        <div className="tile" style={{ ['--i' as never]: 1 }}>
          <div className="l">Forward income</div>
          <div className="v"><span className="cur">€</span>{fmt(summary.forwardAnnualIncome)}</div>
          <div className="d">over the next 12 months</div>
        </div>
        <div className="tile" style={{ ['--i' as never]: 2 }}>
          <div className="l">Forward yield</div>
          <div className="v">{summary.forwardYieldPct.toFixed(2)}<span style={{ fontSize: 16, color: 'var(--text-dim)', fontWeight: 400 }}>%</span></div>
          <div className="d">YoC <b style={{ color: 'var(--text)' }}>{summary.yieldOnCostPct.toFixed(2)}%</b></div>
        </div>
        <div className="tile" style={{ ['--i' as never]: 3 }}>
          <div className="l">Total return</div>
          <div
            className="v"
            style={{
              color:
                summary.unrealizedPL >= 0
                  ? 'oklch(0.48 0.08 165)'
                  : 'oklch(0.50 0.16 25)',
            }}
          >
            <span className="cur" style={{ color: 'inherit' }}>
              {summary.unrealizedPL >= 0 ? '+€' : '−€'}
            </span>
            {fmt(Math.abs(summary.unrealizedPL))}
          </div>
          <div className="d">
            <b
              style={{
                color:
                  summary.unrealizedPL >= 0
                    ? 'oklch(0.48 0.08 165)'
                    : 'oklch(0.50 0.16 25)',
              }}
            >
              {summary.unrealizedPLPct >= 0 ? '+' : ''}
              {summary.unrealizedPLPct.toFixed(2)}%
            </b>{' '}
            unrealized
          </div>
        </div>
        <div className="tile" style={{ ['--i' as never]: 4 }}>
          <div className="l">Capital deployed</div>
          <div className="v"><span className="cur">€</span>{fmt(summary.costBasis)}</div>
          <div className="d">
            across <b style={{ color: 'var(--text)' }}>{summary.positionsCount}</b>{' '}
            position{summary.positionsCount === 1 ? '' : 's'}
          </div>
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

      {/* Top contributors — income side-by-side with P/L */}
      <div className="row-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Top income contributors */}
        <div className="pcard cdn-anim interactive contributors-card" style={{ ['--i' as never]: 2 }}>
          <div className="pcard-h">
            <div className="t">Top income contributors</div>
            <span className="tag">Forward 12M</span>
          </div>
          {contributors.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '20px 0' }}>
              No dividend payers in this portfolio yet.
            </div>
          ) : (
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
          )}
        </div>

        {/* Top P/L contributors — peer card surfacing growth/non-payers */}
        <div className="pcard cdn-anim interactive contributors-card" style={{ ['--i' as never]: 3 }}>
          <div className="pcard-h">
            <div className="t">Top P/L contributors</div>
            <span className="tag">Unrealized</span>
          </div>
          {plContributors.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '20px 0' }}>
              Waiting for live prices to compute P/L.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plContributors.map((c, i) => {
                const widthPct = topPLMax > 0 ? (Math.abs(c.unrealizedPLLocal) / topPLMax) * 100 : 0;
                const positive = c.unrealizedPLLocal >= 0;
                const accent = positive
                  ? 'oklch(0.48 0.08 165)'
                  : 'oklch(0.50 0.16 25)';
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
                        <i
                          style={{
                            width: `${widthPct}%`,
                            background: accent,
                            animationDelay: `${420 + i * 70}ms`,
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }} className="num">
                      <div style={{ fontSize: 13, fontWeight: 600, color: accent }}>
                        {positive ? '+' : '−'}€{fmt(Math.abs(c.unrealizedPLLocal))}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {c.returnPct != null
                          ? `${c.returnPct >= 0 ? '+' : ''}${c.returnPct.toFixed(2)}%`
                          : '—'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Coming up + Passive income progress */}
      <div className="row-2" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
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

        {/* Passive-income progress */}
        <div className="pcard cdn-anim interactive fire-card" style={{ ['--i' as never]: 4 }}>
          <div className="pcard-h">
            <div className="t">Passive income progress</div>
            <span className="tag">€{(incomeTarget / 1000).toFixed(0)}k / yr target</span>
          </div>
          <div className="num" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
            <span style={{ fontSize: 17, color: 'var(--text-dim)', fontWeight: 400 }}>€</span>{fmt(summary.forwardAnnualIncome)}
            <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 400, marginLeft: 8 }}>/ €{fmt(incomeTarget)}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
            {targetPct.toFixed(1)}% of target
            {yearsToTarget > 0 && <> · est. <b style={{ color: 'var(--text)' }}>~{yearsToTarget} years</b> at {(growth * 100).toFixed(0)}% growth</>}
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
              style={{ position: 'absolute', inset: 0, width: `${targetPct}%`, background: 'oklch(0.55 0.10 175)', borderRadius: 4 }}
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

/**
 * Compact ring gauge for the Cadence Safety Score card — ported from the
 * research template (templates/pro-holdings.jsx). The arc sweeps ~270° from
 * 4 o'clock around to 8 o'clock so the open mouth sits at the bottom; score
 * sits centred in the middle with a small "SAFETY" caption beneath.
 */
function SafetyRing({
  score,
  color,
  size = 110,
}: {
  score: number | null;
  color: string;
  size?: number;
}) {
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const start = -Math.PI * 0.62;
  const end = Math.PI * 1.62;
  const total = end - start;
  const arc = (frac: number): [number, number] => {
    const a = start + total * frac;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const ringPath = (frac: number): string => {
    if (frac <= 0) return '';
    const [x0, y0] = arc(0);
    const [x1, y1] = arc(frac);
    const large = frac > 0.5 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };
  const frac = score == null ? 0 : Math.max(0, Math.min(1, score / 100));
  return (
    <svg width={size} height={size} aria-hidden style={{ flexShrink: 0 }}>
      <path
        d={ringPath(1)}
        fill="none"
        stroke="rgba(0,0,0,0.06)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d={ringPath(frac)}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <text
        x={cx}
        y={cy + 2}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: 28,
          fontWeight: 600,
          fill: 'var(--text)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}
      >
        {score == null ? '—' : score}
      </text>
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: 9,
          fill: 'var(--text-dim)',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        Safety
      </text>
    </svg>
  );
}

// Mobile Dashboard — V2b chassis (Pro tier, paired-card pattern).
// Mirrors templates/dashboard-v2.jsx V2Breathing:
//   centered hero with split € + delta pill (since-start change)
//   paired stat cards (Annual income · Yield) using .stat-paired
//   income rhythm with "12M + 6M" tag
//   top contributors with .ctr-row
//   coming up with .up-row
//   passive-income progress with .fire-num / .fire-track / .fire-foot
//
// Wrapped in MobileShell (chassis="v2b") which provides the top bar,
// drawer, and bottom tabs.

import Link from 'next/link';
import { MobileShell } from '@/components/mobile/MobileShell';
import { IncomeRhythmChart } from '@/components/IncomeRhythmChart';
import { type MonthOverview } from '@/lib/portfolio';
import { TickerLogo } from '@/components/TickerLogo';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function splitEuro(n: number): { whole: string; frac: string } {
  const whole = Math.floor(Math.abs(n)).toLocaleString('en-IE');
  const frac = (Math.abs(n) % 1).toFixed(2).slice(2);
  return { whole, frac };
}

export interface DashboardMobileSummary {
  totalValue: number;
  unrealizedPL: number;
  unrealizedPLPct: number;
  forwardAnnualIncome: number;
  forwardYieldPct: number;
  yieldOnCostPct: number;
  ytdReceived: number;
  t12mReceived: number;
  positionsCount: number;
  countriesCount: number;
}

export interface DashboardMobileContributor {
  ticker: string;
  name: string | null;
  forwardAnnualLocal: number;
  yieldPct: number | null;
}

export interface DashboardMobileUpcoming {
  ticker: string;
  name: string | null;
  exDate: string;
  estimatedTotalLocal: number;
  daysUntil: number;
  isProjected: boolean;
}

export interface DashboardMobileProps {
  summary: DashboardMobileSummary;
  /** Full MonthOverview window (with byTicker for the chart's hover/
   *  click-to-detail) — fed straight into the desktop IncomeRhythmChart
   *  for visual parity with the desktop dashboard. */
  rhythm: MonthOverview[];
  nowIndex: number;
  contributors: DashboardMobileContributor[];
  upcoming: DashboardMobileUpcoming[];
  todayLabel: string;
  portfolioName: string;
  incomeTarget: number;
  avatarInitials: string;
}

// Small chevron used inside the paired-card headers (template uses an inline SVG).
function Chev({ size = 14 }: { size?: number }) {
  return (
    <svg className="chev" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.3 6.3l5.7 5.7-5.7 5.7-1.4-1.4L11.2 12 7.9 7.7z" />
    </svg>
  );
}

export function DashboardMobile({
  summary,
  rhythm,
  nowIndex,
  contributors,
  upcoming,
  todayLabel,
  portfolioName,
  incomeTarget,
  avatarInitials,
}: DashboardMobileProps) {
  const { whole, frac } = splitEuro(summary.totalValue);
  const top4Contributors = contributors.slice(0, 4);
  const next3 = upcoming.slice(0, 3);
  const deltaIsUp = summary.unrealizedPL >= 0;

  // Paired-card 1: Annual income (Trailing 12M : Forward 12M) with split bar
  const t12m = summary.t12mReceived;
  const fwd = summary.forwardAnnualIncome;
  const totalAB = t12m + fwd;
  const aPct = totalAB > 0 ? (t12m / totalAB) * 100 : 50;
  const bPct = totalAB > 0 ? (fwd / totalAB) * 100 : 50;

  // FIRE progress
  const firePct = incomeTarget > 0
    ? Math.min(100, (summary.forwardAnnualIncome / incomeTarget) * 100)
    : 0;
  const fireYears = summary.forwardAnnualIncome > 0 && incomeTarget > summary.forwardAnnualIncome
    ? Math.ceil(Math.log(incomeTarget / summary.forwardAnnualIncome) / Math.log(1.08))
    : 0;

  return (
    <MobileShell
      currentTab="dashboard"
      portfolioName={portfolioName}
      avatarInitials={avatarInitials}
      chassis="v2b"
    >
      {/* Hero — centered big number with delta pill */}
      <div className="hero cdn-anim" style={{ '--i': 0 } as React.CSSProperties}>
        <div className="eyebrow">Portfolio · {todayLabel}</div>
        <h1>
          <span className="cur">€</span>{whole}<span className="frac">.{frac}</span>
        </h1>
        <div className="delta">
          <span className={'pill' + (deltaIsUp ? '' : ' down')}>
            <span className="arrow">{deltaIsUp ? '▲' : '▼'}</span>
            {deltaIsUp ? '+' : '−'}€{fmt(Math.abs(summary.unrealizedPL))} ·{' '}
            {summary.unrealizedPLPct >= 0 ? '+' : ''}{summary.unrealizedPLPct.toFixed(2)}%
          </span>
          <span style={{ marginLeft: 8 }}>since start</span>
        </div>
      </div>

      {/* Paired stat cards — Annual income (left) + Yield (right) */}
      <div className="stat-paired cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
        {/* Card 1: Annual income, paired (Trailing : Forward) with split bar */}
        <Link
          href="/app/dividends"
          className="pcard-mini"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="ph">
            Annual income
            <Chev />
          </div>
          <div className="paired-vals">
            <span className="num a"><span className="cur">€</span>{fmt(t12m)}</span>
            <span className="sep">:</span>
            <span className="num b"><span className="cur">€</span>{fmt(fwd)}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: `${aPct}%` }} />
            <div className="b" style={{ width: `${bPct}%` }} />
          </div>
          <div className="paired-foot">
            <span>Trailing 12M</span>
            <span>Forward 12M</span>
          </div>
        </Link>

        {/* Card 2: Yield, stacked named rows */}
        <Link
          href="/app/holdings"
          className="pcard-mini"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="ph">
            Yield
            <Chev />
          </div>
          <div className="stacked-rows">
            <div className="srow">
              <span className="name">Forward</span>
              <span className="val">{summary.forwardYieldPct.toFixed(2)}%</span>
            </div>
            <div className="srow">
              <span className="name">YoC</span>
              <span className="val up">{summary.yieldOnCostPct.toFixed(2)}%</span>
            </div>
            <div className="srow">
              <span className="name">YTD</span>
              <span className="val">€{fmt(summary.ytdReceived)}</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Income rhythm — using the desktop IncomeRhythmChart directly so
          mobile and desktop are visually identical (y-axis ticks, legend,
          range selector, hover/tap-to-open detail modal, Now marker). */}
      {rhythm.length > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 2 } as React.CSSProperties}>
          <div className="pcard-h">
            <div className="t">Income rhythm</div>
          </div>
          <IncomeRhythmChart months={rhythm} nowIndex={nowIndex} />
        </div>
      )}

      {/* Top contributors */}
      {top4Contributors.length > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 3 } as React.CSSProperties}>
          <div className="pcard-h">
            <div className="t">Top contributors</div>
            <Link href="/app/holdings" className="more" style={{ textDecoration: 'none' }}>
              See all
            </Link>
          </div>
          <div>
            {top4Contributors.map((c) => (
              <div key={c.ticker} className="ctr-row">
                <span className="logo" style={{ background: 'transparent', padding: 0 }}>
                  <TickerLogo ticker={c.ticker} size={38} radius={10} />
                </span>
                <div className="body">
                  <div className="tk">{c.ticker}</div>
                  {c.name && <div className="nm">{c.name}</div>}
                </div>
                <div className="right">
                  <div className="v">€{fmt(c.forwardAnnualLocal)}</div>
                  {c.yieldPct != null && (
                    <div className="y">{c.yieldPct.toFixed(2)}% yld</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coming up — next dividends */}
      {next3.length > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 4 } as React.CSSProperties}>
          <div className="pcard-h">
            <div className="t">Coming up</div>
            <Link href="/app/dividends" className="more" style={{ textDecoration: 'none' }}>
              See all
            </Link>
          </div>
          <div>
            {next3.map((e) => {
              const d = new Date(e.exDate);
              return (
                <div key={`${e.ticker}-${e.exDate}`} className="up-row">
                  <div className="cal">
                    <div className="d">{String(d.getDate()).padStart(2, '0')}</div>
                    <div className="m">{MONTH_SHORT[d.getMonth()]}</div>
                  </div>
                  <div className="body">
                    <div className="tk">{e.ticker}</div>
                    <div className="in">in {e.daysUntil}d{e.isProjected ? ' · est' : ''}</div>
                  </div>
                  <div className="right">
                    <div className="v">€{fmt(e.estimatedTotalLocal, 2)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Passive income progress (FIRE) */}
      {incomeTarget > 0 && summary.forwardAnnualIncome > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 5 } as React.CSSProperties}>
          <div className="pcard-h">
            <div className="t">Passive income target</div>
            <span className="more">€{(incomeTarget / 1000).toFixed(0)}k / yr</span>
          </div>
          <div className="fire-num">
            <span className="big">
              <span className="cur">€</span>{fmt(summary.forwardAnnualIncome)}
            </span>
            <span className="of">/ €{fmt(incomeTarget)}</span>
          </div>
          <div className="fire-track">
            <div className="fire-fill" style={{ width: `${firePct}%` }} />
          </div>
          <div className="fire-foot">
            <span>
              <span className="pct">{firePct.toFixed(1)}%</span> of target
            </span>
            {fireYears > 0 && <span>~{fireYears} yrs at 8%</span>}
          </div>
        </div>
      )}

      <div className="scroll-pad-bottom" />
    </MobileShell>
  );
}

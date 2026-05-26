// Mobile Dashboard view. Server-rendered — takes the same data the desktop
// dashboard already computes and arranges it in the V1Standard layout from
// templates/dashboard-mobile.jsx (big € hero → 2×2 stat grid → income rhythm
// chart → top contributors → upcoming dividends → passive-income progress).
// Wrapped in MobileShell which provides the top bar, drawer, and bottom tabs.

import Link from 'next/link';
import { MobileShell } from '@/components/mobile/MobileShell';
import { RhythmBars, type RhythmMonth } from '@/components/mobile/RhythmBars';
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
  rhythm: RhythmMonth[];
  nowIndex: number;
  contributors: DashboardMobileContributor[];
  upcoming: DashboardMobileUpcoming[];
  todayLabel: string;
  portfolioName: string;
  incomeTarget: number;
  avatarInitials: string;
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
  const topContribMax = contributors[0]?.forwardAnnualLocal ?? 1;
  const next4 = upcoming.slice(0, 4);
  const top4Contributors = contributors.slice(0, 4);

  // Passive-income progress
  const firePct = incomeTarget > 0
    ? Math.min(100, (summary.forwardAnnualIncome / incomeTarget) * 100)
    : 0;
  const growthRate = 0.08;
  const fireYears = summary.forwardAnnualIncome > 0 && incomeTarget > summary.forwardAnnualIncome
    ? Math.ceil(
        Math.log(incomeTarget / summary.forwardAnnualIncome) / Math.log(1 + growthRate),
      )
    : 0;

  return (
    <MobileShell
      currentTab="dashboard"
      portfolioName={portfolioName}
      avatarInitials={avatarInitials}
    >
      {/* Hero */}
      <div className="hero cdn-anim" style={{ '--i': 0 } as React.CSSProperties}>
        <div className="eyebrow">Your portfolio · {todayLabel}</div>
        <h1>
          <span className="cur">€</span>{whole}<span className="frac">.{frac}</span>
        </h1>
        <div className="sub">
          {summary.unrealizedPL >= 0 ? 'Up ' : 'Down '}
          <span className={summary.unrealizedPL >= 0 ? 'up' : 'down'}>
            €{fmt(Math.abs(summary.unrealizedPL))} ({summary.unrealizedPLPct >= 0 ? '+' : ''}
            {summary.unrealizedPLPct.toFixed(2)}%)
          </span>{' '}
          since you started · <b>{summary.positionsCount} stocks</b> across{' '}
          <b>{summary.countriesCount} countries</b> paying{' '}
          <b>€{fmt(summary.forwardAnnualIncome)}</b>/yr forward.
        </div>
      </div>

      {/* 2×2 stat tiles */}
      <div className="stat-grid cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="tile">
          <div className="l">Forward income</div>
          <div className="v">
            <span className="cur">€</span>{fmt(summary.forwardAnnualIncome)}
          </div>
          <div className="d">over next 12M</div>
        </div>
        <div className="tile">
          <div className="l">Forward yield</div>
          <div className="v">
            {summary.forwardYieldPct.toFixed(2)}<span className="pct">%</span>
          </div>
          <div className="d">
            YoC <b style={{ color: 'var(--text)' }}>{summary.yieldOnCostPct.toFixed(2)}%</b>
          </div>
        </div>
        <div className="tile">
          <div className="l">YTD income</div>
          <div className="v">
            <span className="cur">€</span>{fmt(summary.ytdReceived)}
          </div>
          <div className="d">Jan {new Date().getFullYear()} → today</div>
        </div>
        <div className="tile">
          <div className="l">T12M income</div>
          <div className="v">
            <span className="cur">€</span>{fmt(summary.t12mReceived)}
          </div>
          <div className="d">trailing 12 months</div>
        </div>
      </div>

      {/* Income rhythm chart */}
      {rhythm.length > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 2 } as React.CSSProperties}>
          <div className="pcard-h">
            <div>
              <div className="t">Income rhythm</div>
              <div className="sub">Received + expected</div>
            </div>
            <span className="ppill live">live</span>
          </div>
          <RhythmBars months={rhythm} nowIndex={nowIndex} />
        </div>
      )}

      {/* Top contributors */}
      {top4Contributors.length > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 3 } as React.CSSProperties}>
          <div className="pcard-h">
            <div>
              <div className="t">Top income contributors</div>
              <div className="sub">Forward 12M</div>
            </div>
            <Link href="/app/holdings" className="more" style={{ textDecoration: 'none' }}>
              See all
            </Link>
          </div>
          <div>
            {top4Contributors.map((c) => {
              const w = topContribMax > 0 ? (c.forwardAnnualLocal / topContribMax) * 100 : 0;
              return (
                <div key={c.ticker} className="listrow">
                  <span className="logo" style={{ background: 'transparent', padding: 0 }}>
                    <TickerLogo ticker={c.ticker} size={32} radius={8} />
                  </span>
                  <div className="body">
                    <div className="t">
                      {c.ticker}{' '}
                      {c.name && (
                        <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· {c.name}</span>
                      )}
                    </div>
                    <div className="pbar" style={{ marginTop: 5 }}>
                      <i style={{ width: `${w}%` }} />
                    </div>
                  </div>
                  <div className="right num">
                    <div className="v">€{fmt(c.forwardAnnualLocal)}</div>
                    {c.yieldPct != null && (
                      <div className="s">{c.yieldPct.toFixed(2)}% yld</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming dividends */}
      {next4.length > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 4 } as React.CSSProperties}>
          <div className="pcard-h">
            <div>
              <div className="t">Coming up · next {next4.length}</div>
              <div className="sub">Through next 60 days</div>
            </div>
            {next4[0] && (
              <span className="ppill">next {next4[0].daysUntil}d</span>
            )}
          </div>
          {next4.map((e) => {
            const d = new Date(e.exDate);
            return (
              <div key={`${e.ticker}-${e.exDate}`} className="listrow">
                <div className="datebubble">
                  <div className="d">{String(d.getDate()).padStart(2, '0')}</div>
                  <div className="m">{MONTH_SHORT[d.getMonth()]}</div>
                </div>
                <span className="logo" style={{ background: 'transparent', padding: 0 }}>
                  <TickerLogo ticker={e.ticker} size={28} radius={6} />
                </span>
                <div className="body">
                  <div className="t">{e.ticker}</div>
                  {e.name && <div className="n">{e.name}</div>}
                </div>
                <div className="right num">
                  <div className="v">€{fmt(e.estimatedTotalLocal, 2)}</div>
                  <div className="s">in {e.daysUntil}d{e.isProjected ? ' · est' : ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Passive income progress (FIRE) */}
      {incomeTarget > 0 && summary.forwardAnnualIncome > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 5 } as React.CSSProperties}>
          <div className="pcard-h">
            <div>
              <div className="t">Passive income progress</div>
              <div className="sub">€{(incomeTarget / 1000).toFixed(0)}k / yr target</div>
            </div>
            <span className="ppill">{firePct.toFixed(1)}%</span>
          </div>
          <div
            className="num"
            style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
            }}
          >
            <span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 400 }}>€</span>
            {fmt(summary.forwardAnnualIncome)}
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-dim)',
                fontWeight: 400,
                marginLeft: 6,
              }}
            >
              / €{fmt(incomeTarget)}
            </span>
          </div>
          {fireYears > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              ~<b style={{ color: 'var(--text)' }}>{fireYears} years</b> at 8% growth
            </div>
          )}
          <div
            style={{
              position: 'relative',
              height: 8,
              background: 'var(--surface-2)',
              borderRadius: 4,
              overflow: 'hidden',
              marginTop: 12,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${firePct}%`,
                background: 'var(--accent-soft, oklch(0.55 0.10 175))',
                borderRadius: 4,
                transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)',
              }}
            />
            {[0.25, 0.5, 0.75].map((p) => (
              <div
                key={p}
                style={{
                  position: 'absolute',
                  top: -2,
                  bottom: -2,
                  left: `${p * 100}%`,
                  width: 1,
                  background: 'var(--surface)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom spacer so the last card clears the bottom tab bar */}
      <div style={{ height: 16 }} />
    </MobileShell>
  );
}

// Mobile Performance — V2b chassis (Pro tier).
// Mirrors templates/pro-pages.jsx PerformancePage:
//   pro-hero-mob (centered) with big return % (coloured up/down)
//   stat-paired: YTD vs benchmark + Risk 1y (Sharpe / Sortino / Max DD)
//   cumulative return SVG chart (portfolio vs benchmark)
//   period returns ptable (1M / 3M / YTD / 1Y / 2Y)
//   top winners + detractors as .lr rows
//   risk & ratios ptable

import { MobileShell } from '@/components/mobile/MobileShell';
import { TickerLogo } from '@/components/TickerLogo';

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPct(n: number, digits = 2): string {
  return (n >= 0 ? '+' : '') + n.toFixed(digits) + '%';
}

export interface PerformanceMobileSeriesPoint {
  date: string;
  returnPct: number;
}

export interface PerformanceMobilePeriod {
  label: string;
  portfolio: number;
  benchmark: number | null;
  benchmarkLabel?: string;
}

export interface PerformanceMobileContributor {
  ticker: string;
  name: string | null;
  pl: number;
  plPct: number;
}

export interface PerformanceMobileRisk {
  volPct: number | null;
  sharpe: number | null;
  sortino: number | null;
  beta: number | null;
  alpha: number | null;
  maxDDPct: number;
  winRatePct: number | null;
  winMonths: number;
  totalMonths: number;
}

export interface PerformanceMobileProps {
  portfolioName: string;
  avatarInitials: string;
  /** Days tracked since first transaction. */
  daysTracked: number;
  /** Total return % over the full window. */
  totalReturnPct: number;
  /** Total return absolute (€). */
  totalReturnAbs: number;
  /** YTD return %. */
  ytdReturnPct: number;
  /** Primary benchmark YTD return % (S&P 500 etc.). */
  benchmarkYtdPct: number | null;
  benchmarkName: string;
  /** Total return delta vs benchmark in pp. */
  alphaVsBenchPp: number | null;
  /** Portfolio cumulative-return series (weekly snapshots). */
  series: PerformanceMobileSeriesPoint[];
  /** Primary benchmark cumulative-return series. */
  benchSeries: PerformanceMobileSeriesPoint[];
  /** Period returns table rows. */
  periods: PerformanceMobilePeriod[];
  winners: PerformanceMobileContributor[];
  losers: PerformanceMobileContributor[];
  risk: PerformanceMobileRisk;
}

export function PerformanceMobile({
  portfolioName,
  avatarInitials,
  daysTracked,
  totalReturnPct,
  totalReturnAbs,
  ytdReturnPct,
  benchmarkYtdPct,
  benchmarkName,
  alphaVsBenchPp,
  series,
  benchSeries,
  periods,
  winners,
  losers,
  risk,
}: PerformanceMobileProps) {
  const isUp = totalReturnPct >= 0;
  const upColor = 'var(--up-fg, oklch(0.36 0.08 165))';
  const downColor = 'var(--down)';
  const heroColor = isUp ? upColor : downColor;

  // Paired card 1: YTD vs benchmark — split bar
  const ytdAbs = Math.abs(ytdReturnPct);
  const benchAbs = benchmarkYtdPct == null ? 0 : Math.abs(benchmarkYtdPct);
  const denom = ytdAbs + benchAbs;
  const aPct = denom > 0 ? (ytdAbs / denom) * 100 : 50;
  const bPct = denom > 0 ? (benchAbs / denom) * 100 : 50;

  return (
    <MobileShell
      currentTab="perf"
      portfolioName={portfolioName}
      avatarInitials={avatarInitials}
      chassis="v2b"
    >
      {/* Hero — total return % as the headline */}
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 } as React.CSSProperties}>
        <div className="eyebrow">Performance · {daysTracked} day{daysTracked === 1 ? '' : 's'} tracked</div>
        <h1 style={{ color: heroColor }}>{fmtPct(totalReturnPct)}</h1>
        <div className="sub">
          {alphaVsBenchPp != null && (
            <>
              <b style={{ color: alphaVsBenchPp >= 0 ? upColor : downColor }}>
                {alphaVsBenchPp >= 0 ? '+' : ''}{alphaVsBenchPp.toFixed(1)}pp
              </b>{' '}
              {alphaVsBenchPp >= 0 ? 'ahead of' : 'behind'} {benchmarkName}
              {' · '}
            </>
          )}
          YTD <b>{fmtPct(ytdReturnPct)}</b>
        </div>
        <div className={'delta-pill' + (totalReturnAbs >= 0 ? '' : ' down')}>
          {totalReturnAbs >= 0 ? '▲' : '▼'} €{fmt(Math.abs(totalReturnAbs))} unrealized
        </div>
      </div>

      {/* Paired stat cards: YTD vs benchmark + Risk 1y */}
      <div className="stat-paired cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="pcard-mini">
          <div className="ph">YTD vs {benchmarkName}</div>
          <div className="paired-vals">
            <span className="num a">{fmtPct(ytdReturnPct)}</span>
            <span className="sep">:</span>
            <span className="num b">{benchmarkYtdPct == null ? '—' : fmtPct(benchmarkYtdPct)}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: `${aPct}%` }} />
            <div className="b" style={{ width: `${bPct}%` }} />
          </div>
          <div className="paired-foot">
            <span>Yours</span>
            <span>{benchmarkName}</span>
          </div>
        </div>
        <div className="pcard-mini">
          <div className="ph">Risk · 1y</div>
          <div className="stacked-rows">
            <div className="srow">
              <span className="name">Sharpe</span>
              <span className="val">{risk.sharpe == null ? '—' : risk.sharpe.toFixed(2)}</span>
            </div>
            <div className="srow">
              <span className="name">Sortino</span>
              <span className="val">{risk.sortino == null ? '—' : risk.sortino.toFixed(2)}</span>
            </div>
            <div className="srow">
              <span className="name">Max DD</span>
              <span className="val" style={{ color: downColor }}>{risk.maxDDPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cumulative return chart */}
      {series.length > 1 && (
        <div className="pcard cdn-anim" style={{ '--i': 2 } as React.CSSProperties}>
          <div className="pcard-h">
            <div className="t">Cumulative return</div>
            <span className="more">weekly</span>
          </div>
          <CumulativeChart
            portfolio={series.map((p) => p.returnPct)}
            bench={benchSeries.map((p) => p.returnPct)}
            portLabel={`Yours ${fmtPct(totalReturnPct)}`}
            benchLabel={`${benchmarkName} ${benchmarkYtdPct == null ? '' : fmtPct(benchmarkYtdPct)}`}
          />
        </div>
      )}

      {/* Period returns */}
      {periods.length > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 3 } as React.CSSProperties}>
          <div className="pcard-h">
            <div className="t">Period returns</div>
            <span className="more">vs {benchmarkName}</span>
          </div>
          <table className="ptable">
            <thead>
              <tr>
                <th>Period</th>
                <th className="r">Yours</th>
                <th className="r">{benchmarkName.replace(' Index', '')}</th>
                <th className="r">α</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => {
                const a = p.benchmark == null ? null : p.portfolio - p.benchmark;
                return (
                  <tr key={p.label}>
                    <td className="b">{p.label}</td>
                    <td className={'r b ' + (p.portfolio >= 0 ? 'up' : 'down')}>
                      {fmtPct(p.portfolio)}
                    </td>
                    <td className={'r ' + (p.benchmark != null && p.benchmark >= 0 ? 'up' : 'down')}>
                      {p.benchmark == null ? '—' : fmtPct(p.benchmark)}
                    </td>
                    <td className={'r b ' + (a != null && a >= 0 ? 'up' : a == null ? '' : 'down')}>
                      {a == null ? '—' : (a >= 0 ? '+' : '') + a.toFixed(2) + 'pp'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Top winners */}
      {winners.length > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 4 } as React.CSSProperties}>
          <div className="pcard-h">
            <div className="t">Top winners</div>
            <span className="more">by € P/L</span>
          </div>
          <div>
            {winners.map((w) => (
              <div className="lr" key={w.ticker}>
                <span className="logo" style={{ background: 'transparent', padding: 0 }}>
                  <TickerLogo ticker={w.ticker} size={30} radius={8} />
                </span>
                <div className="body">
                  <div className="tk">{w.ticker}</div>
                  {w.name && <div className="nm">{w.name}</div>}
                </div>
                <div className="right">
                  <div className="v" style={{ color: w.pl >= 0 ? upColor : downColor }}>
                    {w.pl >= 0 ? '+' : '−'}€{fmt(Math.abs(w.pl))}
                  </div>
                  <div className={'s ' + (w.plPct >= 0 ? 'up' : 'down')}>
                    {fmtPct(w.plPct, 1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detractors */}
      <div className="pcard cdn-anim" style={{ '--i': 5 } as React.CSSProperties}>
        <div className="pcard-h">
          <div className="t">Detractors</div>
          <span className="more">P/L &lt; 0</span>
        </div>
        {losers.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '10px 0' }}>
            No losing positions.
          </div>
        ) : (
          <div>
            {losers.map((l) => (
              <div className="lr" key={l.ticker}>
                <span className="logo" style={{ background: 'transparent', padding: 0 }}>
                  <TickerLogo ticker={l.ticker} size={30} radius={8} />
                </span>
                <div className="body">
                  <div className="tk">{l.ticker}</div>
                  {l.name && <div className="nm">{l.name}</div>}
                </div>
                <div className="right">
                  <div className="v" style={{ color: downColor }}>
                    −€{fmt(Math.abs(l.pl))}
                  </div>
                  <div className="s down">{fmtPct(l.plPct, 1)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risk & ratios */}
      <div className="pcard cdn-anim" style={{ '--i': 6 } as React.CSSProperties}>
        <div className="pcard-h">
          <div className="t">Risk &amp; ratios</div>
          <span className="more">rolling 1y</span>
        </div>
        <table className="ptable">
          <tbody>
            {risk.volPct != null && (
              <tr>
                <td className="lbl">Volatility (σ)</td>
                <td className="r b">{risk.volPct.toFixed(1)}%</td>
                <td className="lbl">annualised</td>
              </tr>
            )}
            {risk.sharpe != null && (
              <tr>
                <td className="lbl">Sharpe</td>
                <td className={'r b ' + (risk.sharpe >= 0 ? 'up' : 'down')}>
                  {risk.sharpe.toFixed(2)}
                </td>
                <td className="lbl">rf 4.5%</td>
              </tr>
            )}
            {risk.sortino != null && (
              <tr>
                <td className="lbl">Sortino</td>
                <td className={'r b ' + (risk.sortino >= 0 ? 'up' : 'down')}>
                  {risk.sortino.toFixed(2)}
                </td>
                <td className="lbl">downside σ</td>
              </tr>
            )}
            {risk.beta != null && (
              <tr>
                <td className="lbl">Beta vs {benchmarkName}</td>
                <td className="r b">{risk.beta.toFixed(2)}</td>
                <td className="lbl">market-like</td>
              </tr>
            )}
            {risk.alpha != null && (
              <tr>
                <td className="lbl">Alpha (Jensen)</td>
                <td className={'r b ' + (risk.alpha >= 0 ? 'up' : 'down')}>
                  {(risk.alpha >= 0 ? '+' : '') + risk.alpha.toFixed(2)}%
                </td>
                <td className="lbl">annualised</td>
              </tr>
            )}
            <tr>
              <td className="lbl">Max DD</td>
              <td className="r b down">{risk.maxDDPct.toFixed(1)}%</td>
              <td className="lbl">peak → trough</td>
            </tr>
            {risk.winRatePct != null && (
              <tr>
                <td className="lbl">Win rate</td>
                <td className="r b">{risk.winRatePct.toFixed(0)}%</td>
                <td className="lbl">{risk.winMonths}/{risk.totalMonths} mo</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ height: 80 }} />
    </MobileShell>
  );
}

/**
 * Cumulative-return SVG chart — portfolio area + benchmark dashed line.
 * Ports templates/pro-pages.jsx PerfLineChart but driven by props instead
 * of the templates' static D.perfSeries.
 */
function CumulativeChart({
  portfolio, bench, portLabel, benchLabel,
}: {
  portfolio: number[];
  bench: number[];
  portLabel: string;
  benchLabel: string;
}) {
  const all = [...portfolio, ...bench];
  if (all.length === 0) return null;
  const min = Math.min(0, ...all);
  const max = Math.max(0, ...all);
  const w = 340;
  const h = 130;
  const sy = (v: number) => h - 4 - ((v - min) / (max - min || 1)) * (h - 8);

  const portStepX = w / Math.max(1, portfolio.length - 1);
  const portPath = portfolio
    .map((v, i) => `${i ? 'L' : 'M'}${(i * portStepX).toFixed(1)},${sy(v).toFixed(1)}`)
    .join(' ');

  const benchStepX = w / Math.max(1, bench.length - 1);
  const benchPath = bench
    .map((v, i) => `${i ? 'L' : 'M'}${(i * benchStepX).toFixed(1)},${sy(v).toFixed(1)}`)
    .join(' ');

  return (
    <div style={{ width: '100%', paddingTop: 4 }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        <defs>
          <linearGradient id="cdn-mob-perf-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="var(--up-fg, oklch(0.36 0.08 165))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--up-fg, oklch(0.36 0.08 165))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2={w} y1={sy(0)} y2={sy(0)} stroke="rgba(0,0,0,0.08)" strokeDasharray="2 3" />
        {portfolio.length > 1 && (
          <path d={`${portPath} L${w},${h} L0,${h} Z`} fill="url(#cdn-mob-perf-fill)" />
        )}
        {bench.length > 1 && (
          <path d={benchPath} fill="none" stroke="var(--text-dim)" strokeWidth="1.4" strokeDasharray="3 2" />
        )}
        {portfolio.length > 1 && (
          <path d={portPath} fill="none" stroke="var(--up-fg, oklch(0.36 0.08 165))" strokeWidth="2" strokeLinejoin="round" />
        )}
      </svg>
      <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 10.5, color: 'var(--text-dim)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 2, background: 'var(--up-fg, oklch(0.36 0.08 165))' }} />
          {portLabel}
        </span>
        {bench.length > 1 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 2, background: 'var(--text-dim)' }} />
            {benchLabel}
          </span>
        )}
      </div>
    </div>
  );
}

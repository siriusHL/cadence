import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import {
  getHoldingsView, getPerformanceSeries, getBenchmarkSeries,
} from '@/lib/portfolio';
import { enrichInstruments, enrichWeeklyHistory } from '@/lib/marketdata/enrich';
import { enrichBenchmarkHistory, BENCHMARKS } from '@/lib/marketdata/benchmarks';
import {
  weeklyDeltas, lastNWeeks, volatility, sharpe, sortino,
  beta as betaOf, alpha as alphaOf, correlation, trackingError,
  infoRatio, maxDrawdown, winRateMonthly, RISK_FREE_PCT,
} from '@/lib/marketdata/risk';
import { EmptyState } from '@/components/EmptyState';
import { TickerLogo } from '@/components/TickerLogo';
import { PerformanceChart } from '@/components/PerformanceChart';

function fmt(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPct(n: number, digits = 2): string {
  return (n >= 0 ? '+' : '') + n.toFixed(digits) + '%';
}

export default async function PerformanceScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const portfolio = await getActivePortfolio(supabase, user!.id);

  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        body="Add a holding to start tracking performance."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  const held = (await getHoldingsView(supabase, portfolio.id)).filter((h) => h.quantity > 0);
  if (held.length === 0) {
    return (
      <EmptyState
        icon="📈"
        title="No active positions"
        body="Add some buy transactions and Cadence will track your portfolio's return over time."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  // Enrich latest quotes + lazy-backfill weekly history (cached forever)
  await enrichInstruments(held.map((h) => h.ticker));
  await Promise.all([
    enrichWeeklyHistory(held.map((h) => h.ticker), 104),
    enrichBenchmarkHistory(104),
  ]);

  const [series, benchmarkSeriesMap] = await Promise.all([
    getPerformanceSeries(supabase, portfolio.id, 104),
    getBenchmarkSeries(supabase, 104),
  ]);

  // Assemble chart-ready benchmark lines from the config + fetched series.
  const benchmarkLines = BENCHMARKS.map((b) => ({
    id:     b.id,
    name:   b.name,
    color:  b.color,
    series: benchmarkSeriesMap.get(b.id) ?? [],
  })).filter((b) => b.series.length >= 2);

  // Latest figures
  const last = series[series.length - 1];
  const totalReturnPct = last ? last.returnPct : 0;
  const totalReturnAbs = last ? last.value - last.cost : 0;

  // YTD slice
  const ytdStart = `${new Date().getFullYear()}-01-01`;
  const ytdStartPoint = series.find((p) => p.date >= ytdStart);
  const ytdReturn = ytdStartPoint && last
    ? last.returnPct - ytdStartPoint.returnPct
    : 0;

  // 1-month / 3-month / 1-year deltas (rebased deltas, comparable to YTD)
  const deltaForWeeksBack = (n: number) => {
    if (series.length < 2) return 0;
    const baseIdx = Math.max(0, series.length - 1 - n);
    return series[series.length - 1].returnPct - series[baseIdx].returnPct;
  };
  // Same delta calculation, generalized so we can run it for each benchmark.
  const deltaForSeries = (
    s: { date: string; returnPct: number }[],
    weeksBack: number,
    ytdAnchorDate?: string,
  ) => {
    if (s.length < 2) return 0;
    const lastPt = s[s.length - 1];
    if (ytdAnchorDate) {
      const anchor = s.find((p) => p.date >= ytdAnchorDate);
      if (!anchor) return 0;
      return lastPt.returnPct - anchor.returnPct;
    }
    const baseIdx = Math.max(0, s.length - 1 - weeksBack);
    return lastPt.returnPct - s[baseIdx].returnPct;
  };

  const periodSpecs: { label: string; weeks: number | 'ytd' }[] = [
    { label: '1M',  weeks: 4 },
    { label: '3M',  weeks: 13 },
    { label: 'YTD', weeks: 'ytd' },
    { label: '1Y',  weeks: 52 },
    { label: '2Y',  weeks: 104 },
  ];
  const periods = periodSpecs.map((spec) => {
    const portfolioDelta = spec.weeks === 'ytd'
      ? ytdReturn
      : deltaForSeries(series, spec.weeks);
    const benchmarkDeltas = benchmarkLines.map((b) => ({
      id:    b.id,
      delta: spec.weeks === 'ytd'
        ? deltaForSeries(b.series, 0, ytdStart)
        : deltaForSeries(b.series, spec.weeks),
    }));
    return { label: spec.label, portfolio: portfolioDelta, benchmarks: benchmarkDeltas };
  });

  // Vs-benchmark deltas for the hero subtitle (uses total-window return).
  const heroBenchDeltas = benchmarkLines.map((b) => {
    const blast = b.series[b.series.length - 1]?.returnPct ?? 0;
    return { id: b.id, name: b.name, deltaPp: totalReturnPct - blast };
  });

  // Per-ticker contributors (using current view)
  const contribRows = held.map((h) => {
    const value = (h.price ?? 0) * h.quantity;
    const cost = h.costBasisLocal * h.quantity;
    const pl = value - cost;
    const plPct = cost > 0 ? (pl / cost) * 100 : 0;
    return { ticker: h.ticker, name: h.name, value, cost, pl, plPct };
  });
  const winners = [...contribRows].sort((a, b) => b.pl - a.pl).slice(0, 5);
  const losers = [...contribRows].filter((r) => r.pl < 0).sort((a, b) => a.pl - b.pl).slice(0, 5);

  // Max drawdown over the available series (rebased to start = 0)
  let maxDD = 0;
  if (series.length > 1) {
    const rebased = series.map((p) => p.returnPct - series[0].returnPct);
    let peak = rebased[0];
    for (const v of rebased) {
      if (v > peak) peak = v;
      const dd = v - peak;            // negative
      if (dd < maxDD) maxDD = dd;
    }
  }

  // ─── Risk & ratios (rolling 1y where applicable) ──────────────────────
  const portWeekly       = weeklyDeltas(series);
  const portWeekly1y     = lastNWeeks(portWeekly, 52);
  // Primary benchmark drives Beta / Alpha / Correlation / Tracking error.
  const primaryBench     = benchmarkLines[0];
  const benchWeekly      = primaryBench ? weeklyDeltas(primaryBench.series) : [];
  // Align lengths — risk metrics need equal-length series for both sides.
  const nMatch           = Math.min(portWeekly.length, benchWeekly.length);
  const portMatched      = portWeekly.slice(-nMatch);
  const benchMatched     = benchWeekly.slice(-nMatch);
  const portMatched1y    = lastNWeeks(portMatched, 52);
  const benchMatched1y   = lastNWeeks(benchMatched, 52);

  const volPct           = volatility(portWeekly1y);
  const sharpeRatio      = sharpe(portWeekly1y);
  const sortinoRatio     = sortino(portWeekly1y);
  const calmar           = maxDD < 0 ? ((portWeekly1y.length ? portWeekly1y.reduce((s, x) => s + x, 0) * (52 / portWeekly1y.length) : 0) / Math.abs(maxDD)) : 0;
  const portBeta         = primaryBench ? betaOf(portMatched1y, benchMatched1y) : 0;
  const portAlpha        = primaryBench ? alphaOf(portMatched1y, benchMatched1y) : 0;
  const portCorrelation  = primaryBench ? correlation(portMatched1y, benchMatched1y) : 0;
  const portTrackingErr  = primaryBench ? trackingError(portMatched1y, benchMatched1y) : 0;
  const portInfoRatio    = primaryBench ? infoRatio(portMatched1y, benchMatched1y) : 0;
  const mdd              = maxDrawdown(series);
  const winRate          = winRateMonthly(series);

  // For the right-meta line we want "Max DD … recovered MMM 'YY".
  const mddRecoveredLabel = mdd.recoveredDate
    ? new Date(mdd.recoveredDate).toLocaleDateString('en', { month: 'short', year: '2-digit' })
    : null;

  // "Days held" — span of the series
  const daysHeld = series.length >= 2
    ? Math.round(
        (new Date(last!.date).getTime() - new Date(series[0].date).getTime()) / 86_400_000,
      )
    : 0;

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Performance · {daysHeld > 0 ? `${daysHeld} days tracked` : 'building history'}</div>
          <h1>
            <span style={{ color: totalReturnPct >= 0 ? 'oklch(0.36 0.08 165)' : 'oklch(0.50 0.16 25)' }}>
              {fmtPct(totalReturnPct)}
            </span>{' '}
            <span className="light">total return</span>
          </h1>
          <div className="sub">
            {heroBenchDeltas.length === 0 ? (
              <>
                {totalReturnPct >= 0 ? 'Up ' : 'Down '}
                <b style={{ color: totalReturnPct >= 0 ? 'oklch(0.36 0.08 165)' : 'oklch(0.50 0.16 25)' }}>
                  €{fmt(Math.abs(totalReturnAbs))}
                </b>{' '}
                against your cost basis{ytdStartPoint ? <>, {fmtPct(ytdReturn)} year-to-date.</> : '.'}
              </>
            ) : (
              <>
                You&rsquo;re{' '}
                {heroBenchDeltas.map((d, i) => (
                  <span key={d.id}>
                    <b style={{ color: d.deltaPp >= 0 ? 'oklch(0.36 0.08 165)' : 'oklch(0.50 0.16 25)' }}>
                      {d.deltaPp >= 0 ? '+' : ''}{d.deltaPp.toFixed(1)}pp
                    </b>{' '}
                    {d.deltaPp >= 0 ? 'ahead of' : 'behind'} {d.name}
                    {i < heroBenchDeltas.length - 1 ? (i === heroBenchDeltas.length - 2 ? ' and ' : ', ') : '.'}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="right-meta">
          {sharpeRatio !== 0 && (
            <span>Sharpe {sharpeRatio.toFixed(2)} · Sortino {sortinoRatio.toFixed(2)}</span>
          )}
          {mdd.ddPct < 0 && (
            <span>
              Max DD {mdd.ddPct.toFixed(1)}%
              {mddRecoveredLabel && <> · recovered {mddRecoveredLabel}</>}
            </span>
          )}
          <span className="live">{held.length} positions · {series.length} weekly snapshots</span>
        </div>
      </div>

      <div className="hero-stats" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        <div className="tile">
          <div className="l">YTD</div>
          <div className={'v sm ' + (ytdReturn >= 0 ? 'up' : 'down')}>
            {fmtPct(ytdReturn, 2)}
          </div>
          <div className="d">
            {primaryBench && (
              <>
                {(() => {
                  const yp = periods.find((p) => p.label === 'YTD');
                  const b = yp?.benchmarks[0];
                  const alphaY = yp && b ? yp.portfolio - b.delta : 0;
                  return (
                    <span className={alphaY >= 0 ? 'up' : 'down'}>
                      {alphaY >= 0 ? '+' : ''}{alphaY.toFixed(2)}pp vs {primaryBench.name}
                    </span>
                  );
                })()}
              </>
            )}
            {!primaryBench && <>{new Date().getFullYear()}</>}
          </div>
        </div>
        <div className="tile">
          <div className="l">1 year</div>
          <div className={'v sm ' + (() => {
            const oneY = periods.find((p) => p.label === '1Y')?.portfolio ?? 0;
            return oneY >= 0 ? 'up' : 'down';
          })()}>
            {fmtPct(periods.find((p) => p.label === '1Y')?.portfolio ?? 0, 2)}
          </div>
          <div className="d">
            {(() => {
              const oneY = periods.find((p) => p.label === '1Y');
              const b = oneY?.benchmarks[0];
              if (!oneY || !b) return <>trailing 52w</>;
              const alphaY = oneY.portfolio - b.delta;
              return (
                <span className={alphaY >= 0 ? 'up' : 'down'}>
                  {alphaY >= 0 ? '+' : ''}{alphaY.toFixed(2)}pp vs {primaryBench!.name}
                </span>
              );
            })()}
          </div>
        </div>
        <div className="tile">
          <div className="l">Sharpe (1y)</div>
          <div className="v sm">{sharpeRatio.toFixed(2)}</div>
          <div className="d">rf {RISK_FREE_PCT.toFixed(1)}%</div>
        </div>
        <div className="tile">
          <div className="l">Max drawdown</div>
          <div className="v sm down">{mdd.ddPct.toFixed(1)}%</div>
          <div className="d">
            {mdd.recoveredDate ? (
              <>recovered {mddRecoveredLabel}</>
            ) : mdd.troughDate ? (
              <>peak → trough</>
            ) : (
              <>none yet</>
            )}
          </div>
        </div>
        <div className="tile">
          <div className="l">Beta (1y)</div>
          <div className="v sm">{primaryBench ? portBeta.toFixed(2) : '—'}</div>
          <div className="d">
            {primaryBench ? (
              portBeta < 0.9 ? 'defensive tilt'
              : portBeta < 1.1 ? `~ ${primaryBench.name}`
              : 'amplified'
            ) : 'no benchmark'}
          </div>
        </div>
        <div className="tile">
          <div className="l">Win rate</div>
          <div className="v sm">{winRate.ratePct.toFixed(0)}%</div>
          <div className="d">{winRate.winMonths} / {winRate.totalMonths} months</div>
        </div>
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <div>
            <div className="t">Cumulative total return</div>
            <div style={{ fontSize: 11.5, color: '#86868b', marginTop: 3 }}>
              Weekly snapshots of value vs cost basis. Returns are rebased to the start of the selected range.
            </div>
          </div>
        </div>
        <PerformanceChart series={series} benchmarks={benchmarkLines} />
      </div>

      <div className="row-3" style={{ gridTemplateColumns: '0.9fr 1.1fr 1.1fr' }}>
        {/* Period returns */}
        <div className="pcard flush" style={{ overflow: 'hidden' }}>
          <div className="pcard-h" style={{ padding: '20px 22px 8px', margin: 0 }}>
            <div className="t">Period returns</div>
            {benchmarkLines.length > 0 && <span className="tag">vs benchmarks</span>}
          </div>
          <div>
            <table className="pt">
              <thead>
                <tr>
                  <th>Period</th>
                  <th className="r">Yours</th>
                  {benchmarkLines.map((b) => (
                    <th key={b.id} className="r">{b.name}</th>
                  ))}
                  {benchmarkLines[0] && <th className="r">vs {benchmarkLines[0].name.split(' ')[0]}</th>}
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => {
                  const primaryBench = p.benchmarks[0];
                  const alpha = primaryBench ? p.portfolio - primaryBench.delta : 0;
                  return (
                    <tr key={p.label}>
                      <td className="b">{p.label}</td>
                      <td className={'r b ' + (p.portfolio >= 0 ? 'up' : 'down')}>
                        {fmtPct(p.portfolio, 2)}
                      </td>
                      {p.benchmarks.map((b) => (
                        <td key={b.id} className={'r ' + (b.delta >= 0 ? 'up' : 'down')}>
                          {fmtPct(b.delta, 2)}
                        </td>
                      ))}
                      {primaryBench && (
                        <td className={'r b ' + (alpha >= 0 ? 'up' : 'down')}>
                          {alpha >= 0 ? '+' : ''}{alpha.toFixed(2)}pp
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top winners */}
        <div className="pcard flush" style={{ overflow: 'hidden' }}>
          <div className="pcard-h" style={{ padding: '20px 22px 8px', margin: 0 }}>
            <div className="t">Top winners</div>
            <span className="tag">By € P/L</span>
          </div>
          <div>
            <table className="pt">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th className="r">P/L €</th>
                  <th className="r">Return</th>
                </tr>
              </thead>
              <tbody>
                {winners.map((w) => (
                  <tr key={w.ticker}>
                    <td className="ticker">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <TickerLogo ticker={w.ticker} size={24} />
                        <div>
                          {w.ticker}
                          <span className="name">{w.name ?? ''}</span>
                        </div>
                      </div>
                    </td>
                    <td className={'r b ' + (w.pl >= 0 ? 'up' : 'down')}>
                      {w.pl >= 0 ? '+' : '−'}€{fmt(Math.abs(w.pl))}
                    </td>
                    <td className={'r ' + (w.pl >= 0 ? 'up' : 'down')}>
                      {fmtPct(w.plPct, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk & ratios (rolling 1y) */}
        <div className="pcard flush" style={{ overflow: 'hidden' }}>
          <div className="pcard-h" style={{ padding: '20px 22px 8px', margin: 0 }}>
            <div className="t">Risk &amp; ratios</div>
            <span className="tag">rolling 1y</span>
          </div>
          <div>
            <table className="pt">
              <tbody>
                <RiskRow label="Volatility (σ)" value={`${volPct.toFixed(1)}%`} note="annualised" />
                <RiskRow label="Sharpe" value={sharpeRatio.toFixed(2)}
                  note={`rf ${RISK_FREE_PCT.toFixed(1)}%`}
                  good={sharpeRatio >= 1} bad={sharpeRatio < 0} />
                <RiskRow label="Sortino" value={sortinoRatio.toFixed(2)}
                  note="downside σ only"
                  good={sortinoRatio >= 1} bad={sortinoRatio < 0} />
                <RiskRow label="Calmar" value={calmar.toFixed(2)} note="rtn / max DD"
                  good={calmar >= 0.5} />
                {primaryBench && (
                  <>
                    <RiskRow label={`Beta vs ${primaryBench.name}`} value={portBeta.toFixed(2)}
                      note={portBeta < 0.9 ? 'defensive' : portBeta < 1.1 ? 'market-like' : 'amplified'} />
                    <RiskRow label="Alpha (Jensen)" value={`${portAlpha >= 0 ? '+' : ''}${portAlpha.toFixed(2)}%`}
                      note="annualised"
                      good={portAlpha > 0} bad={portAlpha < 0} />
                    <RiskRow label={`Correl. vs ${primaryBench.name}`} value={portCorrelation.toFixed(2)}
                      note={Math.abs(portCorrelation) < 0.4 ? 'weak' : Math.abs(portCorrelation) < 0.7 ? 'moderate' : 'strong'} />
                    <RiskRow label="Tracking error" value={`${portTrackingErr.toFixed(1)}%`}
                      note="active risk" />
                    <RiskRow label="Info ratio" value={portInfoRatio.toFixed(2)}
                      note={portInfoRatio > 0.5 ? 'skill > noise' : 'within noise'}
                      good={portInfoRatio > 0.5} bad={portInfoRatio < 0} />
                  </>
                )}
                <RiskRow label="Max drawdown" value={`${mdd.ddPct.toFixed(1)}%`}
                  note={mdd.recoveredWeeks ? `recovered in ${mdd.recoveredWeeks}w` : mdd.troughDate ? 'not recovered' : '—'}
                  bad={mdd.ddPct < -10} />
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Losers — kept below the risk panel so detractor detail is still accessible */}
      {losers.length > 0 && (
        <div className="pcard flush" style={{ overflow: 'hidden', marginTop: 14 }}>
          <div className="pcard-h" style={{ padding: '20px 22px 8px', margin: 0 }}>
            <div className="t">Detractors</div>
            <span className="tag">P/L &lt; 0</span>
          </div>
          <div>
            <table className="pt">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th className="r">P/L €</th>
                  <th className="r">Return</th>
                </tr>
              </thead>
              <tbody>
                {losers.map((w) => (
                  <tr key={w.ticker}>
                    <td className="ticker">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <TickerLogo ticker={w.ticker} size={24} />
                        <div>
                          {w.ticker}
                          <span className="name">{w.name ?? ''}</span>
                        </div>
                      </div>
                    </td>
                    <td className="r b down">−€{fmt(Math.abs(w.pl))}</td>
                    <td className="r down">{fmtPct(w.plPct, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskRow({
  label, value, note, good, bad,
}: {
  label: string;
  value: string;
  note?: string;
  good?: boolean;
  bad?: boolean;
}) {
  const color = good ? 'oklch(0.36 0.08 165)' : bad ? 'oklch(0.50 0.16 25)' : '#1d1d1f';
  return (
    <tr>
      <td style={{ color: '#86868b', fontSize: 12 }}>{label}</td>
      <td className="r num" style={{ color, fontWeight: 600 }}>{value}</td>
      <td style={{ color: '#86868b', fontSize: 11, paddingLeft: 8 }}>{note}</td>
    </tr>
  );
}

import { getSupabaseServer } from '@/lib/supabase/server';
import {
  getPrimaryPortfolio, getHoldingsView, getPerformanceSeries,
} from '@/lib/portfolio';
import { enrichInstruments, enrichWeeklyHistory } from '@/lib/marketdata/enrich';
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
  const portfolio = await getPrimaryPortfolio(supabase, user!.id);

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
  await enrichWeeklyHistory(held.map((h) => h.ticker), 104);

  const series = await getPerformanceSeries(supabase, portfolio.id, 104);

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
  const periods = [
    { label: '1M',  delta: deltaForWeeksBack(4) },
    { label: '3M',  delta: deltaForWeeksBack(13) },
    { label: 'YTD', delta: ytdReturn },
    { label: '1Y',  delta: deltaForWeeksBack(52) },
    { label: '2Y',  delta: deltaForWeeksBack(104) },
  ];

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
            {totalReturnPct >= 0 ? 'Up ' : 'Down '}
            <b style={{ color: totalReturnPct >= 0 ? 'oklch(0.36 0.08 165)' : 'oklch(0.50 0.16 25)' }}>
              €{fmt(Math.abs(totalReturnAbs))}
            </b>{' '}
            against your cost basis{ytdStartPoint ? <>, {fmtPct(ytdReturn)} year-to-date.</> : '.'}
          </div>
        </div>
        <div className="right-meta">
          <span className="live">Weekly closes · enriched just now</span>
          <span>{held.length} positions tracked</span>
          {series.length > 0 && <span>{series.length} weekly snapshots</span>}
        </div>
      </div>

      <div className="hero-stats">
        <div className="tile">
          <div className="l">Total return</div>
          <div className={'v ' + (totalReturnPct >= 0 ? 'up' : 'down')}>
            {fmtPct(totalReturnPct, 1)}
          </div>
          <div className="d">since first buy</div>
        </div>
        <div className="tile">
          <div className="l">YTD</div>
          <div className={'v ' + (ytdReturn >= 0 ? 'up' : 'down')}>
            {fmtPct(ytdReturn, 1)}
          </div>
          <div className="d">{new Date().getFullYear()}</div>
        </div>
        <div className="tile">
          <div className="l">Max drawdown</div>
          <div className="v down">{maxDD.toFixed(1)}<span style={{ fontSize: 14, fontWeight: 400 }}>%</span></div>
          <div className="d">peak-to-trough</div>
        </div>
        <div className="tile">
          <div className="l">P/L · absolute</div>
          <div className={'v ' + (totalReturnAbs >= 0 ? 'up' : 'down')}>
            <span className="cur">€</span>{fmt(Math.abs(totalReturnAbs))}
          </div>
          <div className="d">value − cost basis</div>
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
        <PerformanceChart series={series} />
      </div>

      <div className="row-3" style={{ gridTemplateColumns: '0.9fr 1.1fr 1.1fr' }}>
        {/* Period returns */}
        <div className="pcard flush" style={{ overflow: 'hidden' }}>
          <div className="pcard-h" style={{ padding: '20px 22px 8px', margin: 0 }}>
            <div className="t">Period returns</div>
          </div>
          <div>
            <table className="pt">
              <thead>
                <tr>
                  <th>Period</th>
                  <th className="r">Return</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.label}>
                    <td className="b">{p.label}</td>
                    <td className={'r b ' + (p.delta >= 0 ? 'up' : 'down')}>
                      {fmtPct(p.delta, 2)}
                    </td>
                  </tr>
                ))}
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

        {/* Losers */}
        <div className="pcard flush" style={{ overflow: 'hidden' }}>
          <div className="pcard-h" style={{ padding: '20px 22px 8px', margin: 0 }}>
            <div className="t">Detractors</div>
            <span className="tag">P/L &lt; 0</span>
          </div>
          <div>
            {losers.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#86868b', fontSize: 12 }}>
                No losing positions. 🎉
              </div>
            ) : (
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
                      <td className="r b down">
                        −€{fmt(Math.abs(w.pl))}
                      </td>
                      <td className="r down">
                        {fmtPct(w.plPct, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import {
  getHoldingsView, getYearEvents,
} from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { EmptyState } from '@/components/EmptyState';
import { TickerLogo } from '@/components/TickerLogo';
import { YearHeatmap } from '@/components/YearHeatmap';

const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default async function CalendarScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const portfolio = await getActivePortfolio(supabase, user!.id);

  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        body="Add a holding to populate the dividend calendar."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  const held = (await getHoldingsView(supabase, portfolio.id)).filter((h) => h.quantity > 0);
  if (held.length === 0) {
    return (
      <EmptyState
        icon="📅"
        title="Calendar is empty"
        body="Add some buy transactions to start filling the year heatmap."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  await enrichInstruments(held.map((h) => h.ticker));

  const today = new Date();
  const year = today.getFullYear();
  const events = await getYearEvents(supabase, portfolio.id, year);

  // Aggregates for the hero
  const yearTotal = events.reduce((s, e) => s + e.grossLocal, 0);
  const totalCount = events.length;

  // Per-month totals
  const monthSums = Array(12).fill(0);
  for (const e of events) monthSums[new Date(e.exDate).getMonth()] += e.grossLocal;
  let heaviestMonth = 0;
  for (let i = 0; i < 12; i++) if (monthSums[i] > monthSums[heaviestMonth]) heaviestMonth = i;

  // This week's payments
  const weekStart = new Date(today); weekStart.setDate(today.getDate());
  const weekEnd = new Date(today);   weekEnd.setDate(today.getDate() + 7);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr   = weekEnd.toISOString().slice(0, 10);
  const thisWeekCount = events.filter((e) => e.exDate >= weekStartStr && e.exDate <= weekEndStr).length;

  // Next 40 days payments
  const todayStr = today.toISOString().slice(0, 10);
  const horizon = new Date(today); horizon.setDate(today.getDate() + 40);
  const horizonStr = horizon.toISOString().slice(0, 10);
  const next40 = events.filter((e) => e.exDate >= todayStr && e.exDate <= horizonStr);
  const next40Gross = next40.reduce((s, e) => s + e.grossLocal, 0);

  // Withholding heuristic per country (placeholder until we have a tax table)
  const withholdingByCountry = (country: string | null | undefined): number => {
    switch (country) {
      case 'US': return 0.15;
      case 'CA': return 0.15;
      case 'NL': return 0.15;
      case 'DE': return 0.26375;
      case 'FR': return 0.128;
      case 'CH': return 0.35;
      case 'GB': return 0;
      case 'ES': return 0.19;
      default:   return 0.15;
    }
  };

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Dividend calendar · {year}</div>
          <h1>
            €{fmt(yearTotal)} <span className="light">expected this year</span>
          </h1>
          <div className="sub">
            <b>{totalCount}</b> payment{totalCount === 1 ? '' : 's'} from your {held.length} stock{held.length === 1 ? '' : 's'}.
            {yearTotal > 0 && <> Heaviest month is <b style={{ color: 'var(--text)' }}>{MONTH_LONG[heaviestMonth]}</b>.</>}
          </div>
        </div>
        <div className="right-meta">
          <span className="live">Live · synced just now</span>
          <span>{thisWeekCount} payment{thisWeekCount === 1 ? '' : 's'} this week</span>
          {yearTotal > 0 && <span>Avg €{(yearTotal / 365).toFixed(0)}/day</span>}
        </div>
      </div>

      <div className="row-2" style={{ gridTemplateColumns: '1.7fr 1fr' }}>
        <div className="pcard">
          <div className="pcard-h">
            <div className="t">Year heatmap · ex-div by day</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-dim)' }}>
              <span>Less</span>
              {[0.1, 0.3, 0.5, 0.7, 0.95].map((f, i) => (
                <span key={i} style={{
                  width: 14, height: 10, borderRadius: 3,
                  background: `color-mix(in oklab, oklch(0.55 0.10 175) ${f * 100}%, rgba(0,0,0,0.04))`,
                }} />
              ))}
              <span>More</span>
            </div>
          </div>
          <YearHeatmap events={events} year={year} />
        </div>

        <div className="pcard flush">
          <div className="pcard-h" style={{ padding: '20px 22px 8px', margin: 0 }}>
            <div>
              <div className="t">Next 40 days</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>
                {next40.length} payment{next40.length === 1 ? '' : 's'} · €{fmt(next40Gross)} gross
              </div>
            </div>
            <span className="tag">
              {new Date(today).toLocaleDateString('en', { day: '2-digit', month: 'short' })} → {new Date(horizon).toLocaleDateString('en', { day: '2-digit', month: 'short' })}
            </span>
          </div>
          <div style={{ maxHeight: 560, overflow: 'auto' }}>
            {next40.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                No payments scheduled in the next 40 days.
              </div>
            ) : (
              <table className="pt">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Date</th>
                    <th>Ticker</th>
                    <th className="r">Gross</th>
                    <th className="r">Net</th>
                    <th className="c">WH</th>
                  </tr>
                </thead>
                <tbody>
                  {next40.map((e) => {
                    const d = new Date(e.exDate);
                    const daysAway = Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
                    const isSoon = daysAway >= 0 && daysAway <= 7;
                    const wh = withholdingByCountry(null); // TODO: pass country from instruments
                    return (
                      <tr key={`${e.ticker}-${e.exDate}`}>
                        <td>
                          <div style={{
                            fontSize: 12, fontWeight: 600,
                            color: isSoon ? 'oklch(0.36 0.08 175)' : 'var(--text)',
                          }}>
                            {d.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          </div>
                          {e.isProjected && (
                            <div style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>est.</div>
                          )}
                        </td>
                        <td className="ticker">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TickerLogo ticker={e.ticker} size={24} />
                            <div>
                              {e.ticker}
                              <span className="name">{e.name ?? ''}</span>
                            </div>
                          </div>
                        </td>
                        <td className="r">€{fmt(e.grossLocal, 2)}</td>
                        <td className="r b">€{fmt(e.grossLocal * (1 - wh), 2)}</td>
                        <td className="c muted" style={{ fontSize: 11 }}>{(wh * 100).toFixed(0)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

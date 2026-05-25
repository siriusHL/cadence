import { getSupabaseServer } from '@/lib/supabase/server';
import {
  getPrimaryPortfolio, getHoldingsView, getYearEvents,
  getIncomeRhythm, getPortfolioSummary,
} from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { EmptyState } from '@/components/EmptyState';
import { TickerLogo } from '@/components/TickerLogo';
import { ForecastChart, type ForecastMonth } from '@/components/ForecastChart';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default async function ForecastScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const portfolio = await getPrimaryPortfolio(supabase, user!.id);

  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        body="Add a holding to forecast next year's income."
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
        title="Nothing to forecast"
        body="Add some buy transactions and Cadence will project the next 12 months of dividend income."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  await enrichInstruments(held.map((h) => h.ticker));

  const today = new Date();
  const year = today.getFullYear();
  const currentMonth = today.getMonth();

  const [summary, rhythm24, eventsThisYear, eventsNextYear] = await Promise.all([
    getPortfolioSummary(supabase, portfolio.id),
    getIncomeRhythm(supabase, portfolio.id, 0, 24),  // forward 24 months (incl current)
    getYearEvents(supabase, portfolio.id, year),
    getYearEvents(supabase, portfolio.id, year + 1),
  ]);

  // rhythm24[0] is the current month — keep all 24 for the chart slicer
  const forecastMonths: ForecastMonth[] = rhythm24.map((m) => ({
    month: m.month,
    year: m.year,
    // For the forecast we want "what the user would receive going forward",
    // which is max(received, expected) per month — handles the case where the
    // user already logged some manual dividends.
    total: Math.max(m.received, m.expected),
  }));

  const total12 = forecastMonths.slice(0, 12).reduce((s, m) => s + m.total, 0);
  const totalCount12 = forecastMonths.slice(0, 12).reduce((s, m) => s + 0, 0); // events count below

  // ─── Peak / lightest within the 12-month window ─────────────
  const first12 = forecastMonths.slice(0, 12);
  const nonZero = first12.filter((m) => m.total > 0);
  const peak = nonZero.length ? nonZero.reduce((a, b) => (b.total > a.total ? b : a)) : null;
  const trough = nonZero.length ? nonZero.reduce((a, b) => (b.total < a.total ? b : a)) : null;

  // ─── Per-ticker breakdown (forward 12 months) ───────────────
  // Build from the next 12 months of events: filter eventsThisYear + eventsNextYear
  const todayStr = today.toISOString().slice(0, 10);
  const horizon = new Date(today);
  horizon.setMonth(horizon.getMonth() + 12);
  const horizonStr = horizon.toISOString().slice(0, 10);
  const allEvents = [...eventsThisYear, ...eventsNextYear].filter(
    (e) => e.exDate >= todayStr && e.exDate <= horizonStr,
  );

  interface TickerStat { ticker: string; name: string | null; count: number; total: number; }
  const byTickerMap = new Map<string, TickerStat>();
  for (const e of allEvents) {
    const cur = byTickerMap.get(e.ticker) ?? { ticker: e.ticker, name: e.name, count: 0, total: 0 };
    cur.count += 1;
    cur.total += e.grossLocal;
    byTickerMap.set(e.ticker, cur);
  }
  const byTicker = [...byTickerMap.values()].sort((a, b) => b.total - a.total).slice(0, 12);
  const topTickerTotal = byTicker[0]?.total ?? 0;
  const eventsCount = allEvents.length;

  // ─── Cashflow projections ─────────────────────────────────
  // This month + this quarter from the rhythm
  const thisMonthTotal = forecastMonths[0]?.total ?? 0;
  const quarterStart = currentMonth - (currentMonth % 3);
  const thisQuarterTotal = forecastMonths
    .slice(0, 3 - (currentMonth - quarterStart))
    .reduce((s, m) => s + m.total, 0);
  const thisYearRemaining = forecastMonths
    .slice(0, 12 - currentMonth)
    .filter((m) => m.year === year)
    .reduce((s, m) => s + m.total, 0);
  const thisYearTotal = summary.ytdReceived + thisYearRemaining;

  // Simple tax estimate using user's tax country (default NL Box 3 22%)
  const { data: profile } = await supabase
    .from('profiles')
    .select('tax_country')
    .eq('id', user!.id)
    .single();
  const taxRate = profile?.tax_country === 'NL' ? 0.22
                : profile?.tax_country === 'FR' ? 0.30
                : profile?.tax_country === 'DE' ? 0.25
                : profile?.tax_country === 'US' ? 0.15
                : 0.22;
  const taxLabel = profile?.tax_country === 'NL' ? 'NL Box 3 22%'
                 : profile?.tax_country === 'FR' ? 'FR flat 30%'
                 : profile?.tax_country === 'DE' ? 'DE Abgeltung 25%'
                 : profile?.tax_country === 'US' ? 'US qualified 15%'
                 : 'NL Box 3 22% (default)';
  const total12Net = total12 * (1 - taxRate);

  // ─── Growth scenarios ────────────────────────────────────
  const fivePct = total12 * 0.05;
  const in5y = total12 * Math.pow(1.078, 5);
  const in10y = total12 * Math.pow(1.078, 10);

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">
            12-month forecast · {MONTH_NAMES[currentMonth]} {String(year).slice(2)} → {MONTH_NAMES[(currentMonth + 11) % 12]} {String(year + (currentMonth >= 1 ? 1 : 0)).slice(2)}
          </div>
          <h1>€{fmt(total12)} <span className="light">expected</span></h1>
          <div className="sub">
            <b>{eventsCount}</b> payment{eventsCount === 1 ? '' : 's'} forecasted ·
            avg <b style={{ color: '#1d1d1f' }}>€{fmt(total12 / 12)}/mo</b> ·
            based on declared schedules and projected cadence.
          </div>
        </div>
        <div className="right-meta">
          <span className="live">Forward · enriched just now</span>
          {peak && <span>Peak: {MONTH_NAMES[peak.month]} {String(peak.year).slice(2)} · €{fmt(peak.total)}</span>}
          {trough && <span>Lightest: {MONTH_NAMES[trough.month]} {String(trough.year).slice(2)} · €{fmt(trough.total)}</span>}
        </div>
      </div>

      {/* Forward monthly + cumulative chart */}
      <div className="pcard cdn-anim interactive" style={{ ['--i' as never]: 0 }}>
        <div className="pcard-h">
          <div>
            <div className="t">Forward monthly income + cumulative</div>
            <div style={{ fontSize: 11.5, color: '#86868b', marginTop: 3 }}>
              Bars are per-month gross. Line tracks the running total over the selected range.
            </div>
          </div>
        </div>
        <ForecastChart months={forecastMonths} />
      </div>

      <div className="row-2" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        {/* Income by holding */}
        <div className="pcard flush cdn-anim interactive forecast-holdings-card" style={{ ['--i' as never]: 1 }}>
          <div className="pcard-h" style={{ padding: '20px 22px 8px', margin: 0 }}>
            <div className="t">Income by holding · forward 12M</div>
            <span className="tag">Top {byTicker.length}</span>
          </div>
          <div>
            <table className="pt forecast-holdings-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th className="r">Payments</th>
                  <th className="r">Per pay</th>
                  <th className="r">12M €</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {byTicker.map((s, i) => {
                  const sharePct = total12 > 0 ? (s.total / total12) * 100 : 0;
                  const barPct = topTickerTotal > 0 ? (s.total / topTickerTotal) * 100 : 0;
                  return (
                    <tr
                      key={s.ticker}
                      style={{ animationDelay: `${320 + i * 55}ms` }}
                    >
                      <td className="ticker">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <TickerLogo ticker={s.ticker} size={26} />
                          <div>
                            {s.ticker}
                            <span className="name">{s.name ?? ''}</span>
                          </div>
                        </div>
                      </td>
                      <td className="r">{s.count}×</td>
                      <td className="r muted">€{fmt(s.total / s.count, 2)}</td>
                      <td className="r b">€{fmt(s.total)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="pbar holding-bar" style={{ flex: 1 }}>
                            <i style={{ width: `${barPct}%`, animationDelay: `${400 + i * 55}ms` }} />
                          </div>
                          <span style={{ minWidth: 42, textAlign: 'right', fontSize: 11 }}>{sharePct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column — cashflow + growth */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="pcard cdn-anim interactive cashflow-card" style={{ ['--i' as never]: 2 }}>
            <div className="pcard-h">
              <div className="t">Cashflow projections</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <CashRow
                label={`This month · ${MONTH_NAMES[currentMonth]}`}
                value={`€${fmt(thisMonthTotal)}`}
              />
              <CashRow
                label="This quarter"
                value={`€${fmt(thisQuarterTotal)}`}
              />
              <CashRow
                label={`This year · ${year}`}
                value={`€${fmt(thisYearTotal)}`}
                hint={`€${fmt(summary.ytdReceived)} received · €${fmt(thisYearRemaining)} expected`}
              />
              <CashRow
                label="Next 12 months"
                value={`€${fmt(total12)}`}
                emphasized
              />
              <CashRow
                label={`Net after tax (${taxLabel})`}
                value={`€${fmt(total12Net)}`}
                hint={`@ ${(taxRate * 100).toFixed(0)}% effective rate`}
              />
            </div>
          </div>

          <div
            className="pcard cdn-anim interactive growth-card"
            style={{ background: 'linear-gradient(135deg, oklch(0.97 0.01 175), oklch(0.94 0.03 195))', ['--i' as never]: 3 }}
          >
            <div style={{ fontSize: 11, color: '#6e6e73', fontWeight: 500, marginBottom: 4 }}>
              If every holding raises 5%
            </div>
            <div className="num" style={{
              fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em',
              color: 'oklch(0.42 0.07 175)',
            }}>
              +€{fmt(fivePct)}/yr
            </div>
            <div style={{ fontSize: 11.5, color: '#6e6e73', marginTop: 8, lineHeight: 1.45 }}>
              At a historical <b style={{ color: '#1d1d1f' }}>7.8%</b> dividend growth rate,
              income would hit <b style={{ color: '#1d1d1f' }}>€{fmt(in5y)}</b> in 5 years and
              <b style={{ color: '#1d1d1f' }}> €{fmt(in10y)}</b> in 10.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CashRow({ label, value, hint, emphasized }: {
  label: string; value: string; hint?: string; emphasized?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      gap: 12, paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.04)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: '#6e6e73' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: '#86868b', marginTop: 2 }}>{hint}</div>}
      </div>
      <div className="num" style={{
        fontSize: emphasized ? 18 : 15,
        fontWeight: emphasized ? 600 : 500,
        color: emphasized ? 'oklch(0.42 0.07 175)' : '#1d1d1f',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
    </div>
  );
}

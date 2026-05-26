import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import {
  getHoldingsView, getYearEvents,
  getIncomeRhythm, getPortfolioSummary,
} from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { canAccessScreen, type Tier } from '@/lib/tiers';
import { EmptyState } from '@/components/EmptyState';
import { TickerLogo } from '@/components/TickerLogo';
import { YearHeatmap } from '@/components/YearHeatmap';
import { ForecastChart, type ForecastMonth } from '@/components/ForecastChart';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type Tab = 'upcoming' | 'forecast' | 'year';
const VALID_TABS: Tab[] = ['upcoming', 'forecast', 'year'];

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function DividendsScreen({ searchParams }: PageProps) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', user!.id)
    .maybeSingle();
  const tier = (sub?.tier ?? 'free') as Tier;
  if (!canAccessScreen(tier, 'dividends')) redirect('/upgrade');

  const portfolio = await getActivePortfolio(supabase, user!.id);
  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        body="Add a holding to populate your dividend timeline."
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
        title="No dividend data yet"
        body="Add some buy transactions and your upcoming, forecast, and yearly views will fill in."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  await enrichInstruments(held.map((h) => h.ticker));

  const params = await searchParams;
  const tab: Tab = VALID_TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'upcoming';

  return (
    <div className="cdn-pro">
      <DividendsTabs active={tab} />
      {tab === 'upcoming' && <UpcomingTab portfolioId={portfolio.id} heldCount={held.length} />}
      {tab === 'forecast' && <ForecastTab portfolioId={portfolio.id} userId={user!.id} />}
      {tab === 'year'     && <YearTab     portfolioId={portfolio.id} heldCount={held.length} />}
    </div>
  );
}

// ─── Tab nav ───────────────────────────────────────────────────────────

function DividendsTabs({ active }: { active: Tab }) {
  const TABS: { id: Tab; label: string }[] = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'forecast', label: 'Forecast' },
    { id: 'year',     label: 'Year view' },
  ];
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        role="tablist"
        style={{
          display: 'inline-flex',
          padding: 4,
          background: 'var(--surface-2)',
          borderRadius: 999,
          gap: 2,
        }}
      >
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <Link
              key={t.id}
              href={t.id === 'upcoming' ? '/app/dividends' : `/app/dividends?tab=${t.id}`}
              role="tab"
              aria-selected={isActive}
              style={{
                padding: '7px 18px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                background: isActive ? 'var(--surface)' : 'transparent',
                boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04)' : 'none',
                textDecoration: 'none',
                transition: 'color 160ms ease, background 160ms ease',
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Upcoming tab ──────────────────────────────────────────────────────

interface InstrumentCountry { ticker: string; country: string | null; }

async function UpcomingTab({ portfolioId, heldCount }: { portfolioId: string; heldCount: number }) {
  const supabase = await getSupabaseServer();
  const today = new Date();
  const year = today.getFullYear();

  const events = await getYearEvents(supabase, portfolioId, year);

  const todayStr = today.toISOString().slice(0, 10);
  const horizon = new Date(today); horizon.setDate(today.getDate() + 40);
  const horizonStr = horizon.toISOString().slice(0, 10);
  const next40 = events.filter((e) => e.exDate >= todayStr && e.exDate <= horizonStr);
  const next40Gross = next40.reduce((s, e) => s + e.grossLocal, 0);

  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);
  const thisWeekCount = next40.filter((e) => e.exDate <= weekEndStr).length;

  // Join in instrument countries for withholding estimates.
  const tickers = Array.from(new Set(next40.map((e) => e.ticker)));
  const { data: instRows } = await supabase
    .from('instruments')
    .select('ticker, country')
    .in('ticker', tickers);
  const countryByT = new Map((instRows as InstrumentCountry[] ?? []).map((r) => [r.ticker, r.country]));

  return (
    <>
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Upcoming dividends · next 40 days</div>
          <h1>
            €{fmt(next40Gross)} <span className="light">expected</span>
          </h1>
          <div className="sub">
            <b>{next40.length}</b> payment{next40.length === 1 ? '' : 's'} from your {heldCount} stock{heldCount === 1 ? '' : 's'}
            {thisWeekCount > 0 && <> · <b style={{ color: 'var(--text)' }}>{thisWeekCount}</b> within 7 days</>}.
          </div>
        </div>
        <div className="right-meta">
          <span className="live">Live · synced just now</span>
          <span>
            {new Date(today).toLocaleDateString('en', { day: '2-digit', month: 'short' })} → {new Date(horizon).toLocaleDateString('en', { day: '2-digit', month: 'short' })}
          </span>
        </div>
      </div>

      <div className="pcard flush">
        <div className="pcard-h" style={{ padding: '20px 22px 8px', margin: 0 }}>
          <div>
            <div className="t">Next 40 days</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>
              {next40.length} payment{next40.length === 1 ? '' : 's'} · €{fmt(next40Gross)} gross
            </div>
          </div>
        </div>
        <div style={{ maxHeight: 600, overflow: 'auto' }}>
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
                  const wh = withholdingByCountry(countryByT.get(e.ticker) ?? null);
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
    </>
  );
}

// ─── Forecast tab ──────────────────────────────────────────────────────

async function ForecastTab({ portfolioId, userId }: { portfolioId: string; userId: string }) {
  const supabase = await getSupabaseServer();
  const today = new Date();
  const year = today.getFullYear();
  const currentMonth = today.getMonth();

  const [summary, rhythm24, eventsThisYear, eventsNextYear] = await Promise.all([
    getPortfolioSummary(supabase, portfolioId),
    getIncomeRhythm(supabase, portfolioId, 0, 24),
    getYearEvents(supabase, portfolioId, year),
    getYearEvents(supabase, portfolioId, year + 1),
  ]);

  const forecastMonths: ForecastMonth[] = rhythm24.map((m) => ({
    month: m.month,
    year: m.year,
    total: Math.max(m.received, m.expected),
    byTicker: m.byTicker.map((line) => ({
      ticker:     line.ticker,
      name:       line.name,
      amount:     line.received + line.expected,
      // A row is an estimate when there's no received cash yet — i.e. the
      // payment hasn't actually happened, only the cadence projection has
      // placed it in this month.
      isEstimate: line.expected > 0 && line.received === 0,
    })),
  }));

  const total12 = forecastMonths.slice(0, 12).reduce((s, m) => s + m.total, 0);
  const first12 = forecastMonths.slice(0, 12);
  const nonZero = first12.filter((m) => m.total > 0);
  const peak = nonZero.length ? nonZero.reduce((a, b) => (b.total > a.total ? b : a)) : null;
  const trough = nonZero.length ? nonZero.reduce((a, b) => (b.total < a.total ? b : a)) : null;

  const todayStr = today.toISOString().slice(0, 10);
  const horizon = new Date(today); horizon.setMonth(horizon.getMonth() + 12);
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('tax_country')
    .eq('id', userId)
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

  const fivePct = total12 * 0.05;
  const in5y = total12 * Math.pow(1.078, 5);
  const in10y = total12 * Math.pow(1.078, 10);

  return (
    <>
      <div className="pro-hero">
        <div>
          <div className="eyebrow">
            12-month forecast · {MONTH_NAMES[currentMonth]} {String(year).slice(2)} → {MONTH_NAMES[(currentMonth + 11) % 12]} {String(year + (currentMonth >= 1 ? 1 : 0)).slice(2)}
          </div>
          <h1>€{fmt(total12)} <span className="light">expected</span></h1>
          <div className="sub">
            <b>{eventsCount}</b> payment{eventsCount === 1 ? '' : 's'} forecasted ·
            avg <b style={{ color: 'var(--text)' }}>€{fmt(total12 / 12)}/mo</b> ·
            based on declared schedules and projected cadence.
          </div>
        </div>
        <div className="right-meta">
          <span className="live">Forward · enriched just now</span>
          {peak && <span>Peak: {MONTH_NAMES[peak.month]} {String(peak.year).slice(2)} · €{fmt(peak.total)}</span>}
          {trough && <span>Lightest: {MONTH_NAMES[trough.month]} {String(trough.year).slice(2)} · €{fmt(trough.total)}</span>}
        </div>
      </div>

      <div className="pcard cdn-anim interactive" style={{ ['--i' as never]: 0 }}>
        <div className="pcard-h">
          <div>
            <div className="t">Forward monthly income + cumulative</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3 }}>
              Bars are per-month gross. Line tracks the running total over the selected range.
            </div>
          </div>
        </div>
        <ForecastChart months={forecastMonths} />
      </div>

      <div className="row-2" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
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
                    <tr key={s.ticker} style={{ animationDelay: `${320 + i * 55}ms` }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="pcard cdn-anim interactive cashflow-card" style={{ ['--i' as never]: 2 }}>
            <div className="pcard-h">
              <div className="t">Cashflow projections</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <CashRow label={`This month · ${MONTH_NAMES[currentMonth]}`} value={`€${fmt(thisMonthTotal)}`} />
              <CashRow label="This quarter" value={`€${fmt(thisQuarterTotal)}`} />
              <CashRow
                label={`This year · ${year}`}
                value={`€${fmt(thisYearTotal)}`}
                hint={`€${fmt(summary.ytdReceived)} received · €${fmt(thisYearRemaining)} expected`}
              />
              <CashRow label="Next 12 months" value={`€${fmt(total12)}`} emphasized />
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
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 4 }}>
              If every holding raises 5%
            </div>
            <div className="num" style={{
              fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em',
              color: 'oklch(0.42 0.07 175)',
            }}>
              +€{fmt(fivePct)}/yr
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.45 }}>
              At a historical <b style={{ color: 'var(--text)' }}>7.8%</b> dividend growth rate,
              income would hit <b style={{ color: 'var(--text)' }}>€{fmt(in5y)}</b> in 5 years and
              <b style={{ color: 'var(--text)' }}> €{fmt(in10y)}</b> in 10.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CashRow({ label, value, hint, emphasized }: {
  label: string; value: string; hint?: string; emphasized?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div className="num" style={{
        fontSize: emphasized ? 18 : 15,
        fontWeight: emphasized ? 600 : 500,
        color: emphasized ? 'oklch(0.42 0.07 175)' : 'var(--text)',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
    </div>
  );
}

// ─── Year-view tab ─────────────────────────────────────────────────────

async function YearTab({ portfolioId, heldCount }: { portfolioId: string; heldCount: number }) {
  const supabase = await getSupabaseServer();
  const today = new Date();
  const year = today.getFullYear();
  const events = await getYearEvents(supabase, portfolioId, year);

  const yearTotal = events.reduce((s, e) => s + e.grossLocal, 0);
  const totalCount = events.length;

  const monthSums = Array(12).fill(0);
  for (const e of events) monthSums[new Date(e.exDate).getMonth()] += e.grossLocal;
  let heaviestMonth = 0;
  for (let i = 0; i < 12; i++) if (monthSums[i] > monthSums[heaviestMonth]) heaviestMonth = i;

  return (
    <>
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Year view · {year}</div>
          <h1>
            €{fmt(yearTotal)} <span className="light">across {year}</span>
          </h1>
          <div className="sub">
            <b>{totalCount}</b> payment{totalCount === 1 ? '' : 's'} from your {heldCount} stock{heldCount === 1 ? '' : 's'}.
            {yearTotal > 0 && <> Heaviest month is <b style={{ color: 'var(--text)' }}>{MONTH_LONG[heaviestMonth]}</b>.</>}
          </div>
        </div>
        <div className="right-meta">
          {yearTotal > 0 && <span>Avg €{(yearTotal / 365).toFixed(0)}/day</span>}
          <span>{monthSums.filter((s) => s > 0).length} active months</span>
        </div>
      </div>

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
    </>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

function withholdingByCountry(country: string | null | undefined): number {
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
}

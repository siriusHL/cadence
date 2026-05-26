// Mobile Dividends — V2b chassis (Pro tier).
// Mirrors templates/pro-pages.jsx DividendsPage:
//   .segtop-pro tab strip (Upcoming / Forecast / Year — Simulator dropped
//   on mobile per template, still reachable via desktop ?tab=simulator)
//   Each tab fully ported: hero + paired cards + content

import Link from 'next/link';
import { MobileShell } from '@/components/mobile/MobileShell';
import { TickerLogo } from '@/components/TickerLogo';
import { RhythmBars, type RhythmMonth } from '@/components/mobile/RhythmBars';
import { ForecastBarsMobile, type ForecastBarsMonth } from '@/components/mobile/ForecastBarsMobile';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export type DividendsTab = 'upcoming' | 'forecast' | 'simulator' | 'year';

export interface DividendsMobileUpcomingEvent {
  ticker: string;
  name: string | null;
  exDate: string;
  grossLocal: number;
  daysUntil: number;
  isProjected: boolean;
  /** Country withholding rate as fraction (e.g. 0.15 for 15%). */
  withholdingRate: number;
}

export interface DividendsMobileForecast {
  /** Total forecasted income over the next 12 months. */
  next12M: number;
  /** Net (after tax) version of next12M. */
  next12MNet: number;
  taxLabel: string;
  thisMonth: number;
  thisQuarter: number;
  thisYearTotal: number;
  /** 12 forward months (next month → same month next year) for the
   *  Forward monthly income + cumulative chart. Mirrors the desktop
   *  ForecastChart's default 12M slice. */
  forecastMonths: ForecastBarsMonth[];
  /** Growth scenarios. */
  fivePctGrowth: number;
  in5y: number;
  in10y: number;
  /** Range label, e.g. "Jun → May". */
  rangeLabel: string;
}

export interface DividendsMobileYear {
  /** Calendar year shown. */
  year: number;
  /** Total YTD received this year. */
  ytdReceived: number;
  /** 12 calendar months for the current year. */
  months: RhythmMonth[];
  nowIndex: number;
  /** Active months (any income). */
  activeMonths: number;
  /** Number of distinct paying tickers. */
  payerCount: number;
}

export interface DividendsMobileProps {
  tab: DividendsTab;
  portfolioName: string;
  avatarInitials: string;
  /** For the Upcoming tab only. */
  upcomingEvents?: DividendsMobileUpcomingEvent[];
  /** Total stocks held — used in copy. */
  heldCount?: number;
  /** Forecast tab data. */
  forecast?: DividendsMobileForecast;
  /** Year tab data. */
  yearData?: DividendsMobileYear;
}

/* Mobile segtop drops Simulator per template (3 tabs only). Simulator is
   still reachable on desktop and via direct URL — the mobile route just
   renders a friendly placeholder when ?tab=simulator. */
const MOBILE_TABS: { id: DividendsTab; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'year',     label: 'Year' },
];

export function DividendsMobile({
  tab,
  portfolioName,
  avatarInitials,
  upcomingEvents = [],
  heldCount = 0,
  forecast,
  yearData,
}: DividendsMobileProps) {
  return (
    <MobileShell
      currentTab="dividends"
      portfolioName={portfolioName}
      avatarInitials={avatarInitials}
      chassis="v2b"
    >
      {/* Tab strip */}
      <div className="segtop-pro cdn-anim" style={{ '--i': 0 } as React.CSSProperties}>
        {MOBILE_TABS.map((t) => {
          const isActive = tab === t.id;
          return (
            <Link
              key={t.id}
              href={t.id === 'upcoming' ? '/app/dividends' : `/app/dividends?tab=${t.id}`}
              className={'seg' + (isActive ? ' is-active' : '')}
              aria-current={isActive ? 'page' : undefined}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {tab === 'upcoming' && (
        <UpcomingMobile events={upcomingEvents} heldCount={heldCount} />
      )}
      {tab === 'forecast' && forecast && <ForecastMobile data={forecast} />}
      {tab === 'simulator' && <SimulatorPlaceholder />}
      {tab === 'year' && yearData && <YearMobile data={yearData} />}

      <div className="scroll-pad-bottom" />
    </MobileShell>
  );
}

function UpcomingMobile({
  events,
  heldCount,
}: {
  events: DividendsMobileUpcomingEvent[];
  heldCount: number;
}) {
  const totalGross = events.reduce((s, e) => s + e.grossLocal, 0);
  const totalNet = events.reduce((s, e) => s + e.grossLocal * (1 - e.withholdingRate), 0);
  const totalWithheld = totalGross - totalNet;
  const thisWeek = events.filter((e) => e.daysUntil <= 7).length;

  // Average effective rate (weighted by gross)
  const effRate = totalGross > 0 ? (totalWithheld / totalGross) * 100 : 0;

  // Paired split: withheld vs net to you
  const aPct = totalGross > 0 ? (totalWithheld / totalGross) * 100 : 0;
  const bPct = 100 - aPct;

  return (
    <>
      {/* Hero */}
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="eyebrow">Upcoming · next 40 days</div>
        <h1>
          <span className="cur">€</span>{fmt(Math.round(totalGross))}{' '}
          <span className="light">expected</span>
        </h1>
        <div className="sub">
          <b>{events.length}</b> payment{events.length === 1 ? '' : 's'} from your{' '}
          {heldCount} stock{heldCount === 1 ? '' : 's'}
          {thisWeek > 0 && (
            <>
              {' · '}
              <b style={{ color: 'var(--text)' }}>{thisWeek}</b> within 7 days
            </>
          )}
        </div>
      </div>

      {/* Paired stat cards — Gross/Net + Withholding breakdown */}
      {events.length > 0 && (
        <div className="stat-paired cdn-anim" style={{ '--i': 2 } as React.CSSProperties}>
          <div className="pcard-mini">
            <div className="ph">Gross vs net</div>
            <div className="paired-vals">
              <span className="num a">€{fmt(Math.round(totalGross))}</span>
              <span className="sep">:</span>
              <span className="num b">€{fmt(Math.round(totalNet))}</span>
            </div>
            <div className="paired-bar">
              <div className="a" style={{ width: `${aPct}%` }} />
              <div className="b" style={{ width: `${bPct}%` }} />
            </div>
            <div className="paired-foot">
              <span>Withheld</span>
              <span>Net to you</span>
            </div>
          </div>
          <div className="pcard-mini">
            <div className="ph">Withholding</div>
            <div className="stacked-rows">
              <div className="srow">
                <span className="name">Effective rate</span>
                <span className="val">{effRate.toFixed(1)}%</span>
              </div>
              <div className="srow">
                <span className="name">Withheld €</span>
                <span className="val down">€{fmt(Math.round(totalWithheld))}</span>
              </div>
              <div className="srow">
                <span className="name">Payments</span>
                <span className="val">{events.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Events list */}
      <div className="pcard cdn-anim" style={{ '--i': 3 } as React.CSSProperties}>
        <div className="pcard-h">
          <div className="t">Next {events.length} payment{events.length === 1 ? '' : 's'}</div>
          <span className="more">€{fmt(Math.round(totalGross))} gross</span>
        </div>
        {events.length === 0 ? (
          <div style={{ padding: '24px 4px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
            No payments scheduled in the next 40 days.
          </div>
        ) : (
          <div>
            {events.map((e) => {
              const d = new Date(e.exDate);
              const net = e.grossLocal * (1 - e.withholdingRate);
              return (
                <div key={`${e.ticker}-${e.exDate}`} className="lr">
                  <div className="cal">
                    <div className="d">{String(d.getDate()).padStart(2, '0')}</div>
                    <div className="m">{MONTH_SHORT[d.getMonth()]}</div>
                  </div>
                  <span className="logo" style={{ background: 'transparent', padding: 0 }}>
                    <TickerLogo ticker={e.ticker} size={30} radius={8} />
                  </span>
                  <div className="body">
                    <div className="tk">{e.ticker}</div>
                    <div className="nm">
                      in {e.daysUntil}d
                      {e.isProjected ? ' · est' : ''}
                      {' · '}{(e.withholdingRate * 100).toFixed(0)}% WH
                    </div>
                  </div>
                  <div className="right">
                    <div className="v">€{fmt(net, 2)}</div>
                    <div className="s">€{fmt(e.grossLocal, 2)} gross</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function ForecastMobile({ data }: { data: DividendsMobileForecast }) {
  const grossPct = data.next12M > 0 ? ((data.next12M - data.next12MNet) / data.next12M) * 100 : 0;
  const netPct = 100 - grossPct;
  const avgMonthly = Math.round(data.next12M / 12);

  return (
    <>
      {/* Hero */}
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="eyebrow">12-month forecast · {data.rangeLabel}</div>
        <h1>
          <span className="cur">€</span>{fmt(Math.round(data.next12M))}{' '}
          <span className="light">expected</span>
        </h1>
        <div className="sub">
          avg <b>€{fmt(avgMonthly)}/mo</b> · based on declared schedules
        </div>
      </div>

      {/* Paired: Gross vs net + Year totals */}
      <div className="stat-paired cdn-anim" style={{ '--i': 2 } as React.CSSProperties}>
        <div className="pcard-mini">
          <div className="ph">Gross vs net</div>
          <div className="paired-vals">
            <span className="num a">€{fmt(Math.round(data.next12M))}</span>
            <span className="sep">:</span>
            <span className="num b">€{fmt(Math.round(data.next12MNet))}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: `${grossPct}%` }} />
            <div className="b" style={{ width: `${netPct}%` }} />
          </div>
          <div className="paired-foot">
            <span>Tax · {data.taxLabel}</span>
            <span>Net</span>
          </div>
        </div>
        <div className="pcard-mini">
          <div className="ph">Year totals</div>
          <div className="stacked-rows">
            <div className="srow">
              <span className="name">This month</span>
              <span className="val">€{fmt(Math.round(data.thisMonth))}</span>
            </div>
            <div className="srow">
              <span className="name">This quarter</span>
              <span className="val">€{fmt(Math.round(data.thisQuarter))}</span>
            </div>
            <div className="srow">
              <span className="name">{new Date().getFullYear()} total</span>
              <span className="val">€{fmt(Math.round(data.thisYearTotal))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forward monthly income + cumulative chart — mirrors desktop's
          12-month forward window with bar+line overlay. */}
      {data.forecastMonths.length > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 3 } as React.CSSProperties}>
          <div className="pcard-h">
            <div className="t">Forward monthly income + cumulative</div>
            <span className="more">12M</span>
          </div>
          <ForecastBarsMobile months={data.forecastMonths} height={140} />
        </div>
      )}

      {/* Growth scenario */}
      <div className="pcard cdn-anim" style={{ '--i': 4 } as React.CSSProperties}>
        <div className="pcard-h">
          <div className="t">If every holding raises 5%</div>
          <span className="more">growth scenario</span>
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: '-0.025em',
            color: 'var(--up-fg, oklch(0.36 0.08 165))',
          }}
        >
          +€{fmt(Math.round(data.fivePctGrowth))}/yr
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: 'var(--text-muted)',
            marginTop: 8,
            lineHeight: 1.45,
          }}
        >
          At <b style={{ color: 'var(--text)' }}>7.8%</b> historical dividend growth,
          income hits <b style={{ color: 'var(--text)' }}>€{fmt(Math.round(data.in5y))}</b> in 5 years
          and <b style={{ color: 'var(--text)' }}> €{fmt(Math.round(data.in10y))}</b> in 10.
        </div>
      </div>
    </>
  );
}

function YearMobile({ data }: { data: DividendsMobileYear }) {
  // Identify the biggest month for the "heaviest: Mar" hint
  const biggest = data.months.reduce(
    (best, m) => (m.received > (best?.received ?? -1) ? m : best),
    null as RhythmMonth | null,
  );

  return (
    <>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="eyebrow">Year view · {data.year}</div>
        <h1>
          <span className="cur">€</span>{fmt(Math.round(data.ytdReceived))}{' '}
          <span className="light">YTD</span>
        </h1>
        <div className="sub">
          <b>{data.payerCount}</b> stock{data.payerCount === 1 ? '' : 's'} paid in{' '}
          <b>{data.activeMonths}</b> month{data.activeMonths === 1 ? '' : 's'}
        </div>
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 2 } as React.CSSProperties}>
        <div className="pcard-h">
          <div className="t">Monthly income</div>
          <span className="more">{data.year}</span>
        </div>
        {/* Calendar Year view — solid bars everywhere (projection bars
            faded but filled, not dashed) and every month labelled. */}
        <RhythmBars
          months={data.months}
          nowIndex={data.nowIndex}
          height={140}
          solid
          showAllLabels
        />
      </div>

      {biggest && biggest.received > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 3 } as React.CSSProperties}>
          <div className="pcard-h">
            <div className="t">Biggest month</div>
            <span className="more">{data.year}</span>
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: '-0.025em',
            }}
          >
            {MONTH_SHORT[biggest.month]}{' '}
            <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>·</span>{' '}
            <span style={{ color: 'var(--up-fg, oklch(0.36 0.08 165))' }}>
              €{fmt(Math.round(biggest.received))}
            </span>
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--text-muted)',
              marginTop: 6,
            }}
          >
            {((biggest.received / data.ytdReceived) * 100).toFixed(1)}% of YTD income landed in this
            month alone.
          </div>
        </div>
      )}
    </>
  );
}

function SimulatorPlaceholder() {
  return (
    <div className="pcard cdn-anim" style={{ '--i': 1, marginTop: 24 } as React.CSSProperties}>
      <div className="pcard-h">
        <div className="t">Income simulator</div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        The simulator needs more room for the input sliders + projection chart than a phone has.
        Open Cadence on tablet or desktop for the full simulator.
      </div>
      <div style={{ marginTop: 12 }}>
        <Link
          href="/app/dividends"
          style={{
            display: 'inline-block',
            padding: '8px 14px',
            background: 'var(--text)',
            color: 'var(--surface)',
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Back to Upcoming
        </Link>
      </div>
    </div>
  );
}

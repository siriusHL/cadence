// Mobile Dividends — V2b chassis (Pro tier).
// Mirrors templates/pro-pages.jsx DividendsPage:
//   .segtop-pro tab strip (Upcoming / Forecast / Year)
//   Upcoming tab fully ported (template fidelity)
//   Forecast / Year / Simulator: placeholder pointing users to desktop
//
// Tab switching is URL-driven (?tab=...) so it stays consistent with the
// desktop page and survives navigation/back. Each tab is a Link.

import Link from 'next/link';
import { MobileShell } from '@/components/mobile/MobileShell';
import { TickerLogo } from '@/components/TickerLogo';

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

export interface DividendsMobileProps {
  tab: DividendsTab;
  portfolioName: string;
  avatarInitials: string;
  /** For the Upcoming tab only — events in the next 40 days. */
  upcomingEvents?: DividendsMobileUpcomingEvent[];
  /** Total stocks held — used in the hero copy. */
  heldCount?: number;
}

const TABS: { id: DividendsTab; label: string }[] = [
  { id: 'upcoming',  label: 'Upcoming' },
  { id: 'forecast',  label: 'Forecast' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'year',      label: 'Year' },
];

export function DividendsMobile({
  tab,
  portfolioName,
  avatarInitials,
  upcomingEvents = [],
  heldCount = 0,
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
        {TABS.map((t) => {
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
      {tab === 'forecast'  && <Placeholder label="Forecast" />}
      {tab === 'simulator' && <Placeholder label="Simulator" />}
      {tab === 'year'      && <Placeholder label="Year view" />}

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

function Placeholder({ label }: { label: string }) {
  return (
    <div className="pcard cdn-anim" style={{ '--i': 1, marginTop: 24 } as React.CSSProperties}>
      <div className="pcard-h">
        <div className="t">{label}</div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        This view is best on a larger screen — charts and tables get cramped on phone. Open Cadence on
        desktop or tablet for the full <b style={{ color: 'var(--text)' }}>{label}</b> experience.
      </div>
      <div style={{ marginTop: 12 }}>
        <Link
          href="/app/dividends"
          style={{
            display: 'inline-block',
            padding: '8px 14px',
            background: 'var(--text)', color: 'var(--surface)',
            borderRadius: 999,
            fontSize: 12.5, fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Back to Upcoming
        </Link>
      </div>
    </div>
  );
}

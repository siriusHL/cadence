// Mobile Free tier — 4 screens (Home / Coming up / Stocks / Year).
// Mirrors templates/free-pages.jsx. All use the V2b chassis + Free tab set.
// Each shows a soft "Upgrade to Premium" strip at the bottom of the scroll.

import Link from 'next/link';
import { MobileShell } from '@/components/mobile/MobileShell';
import { RhythmBars, type RhythmMonth } from '@/components/mobile/RhythmBars';
import { TickerLogo } from '@/components/TickerLogo';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function symbolFor(ccy: string | null): string {
  switch (ccy) {
    case 'EUR': return '€';
    case 'USD': return '$';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'CHF': return 'CHF ';
    case 'CAD': return 'C$';
    default: return '';
  }
}

interface UpsellStripProps { title: string; body: string }
function UpsellStrip({ title, body }: UpsellStripProps) {
  return (
    <div
      className="pcard cdn-anim"
      style={{
        '--i': 6,
        background: 'linear-gradient(135deg, oklch(0.22 0.03 175) 0%, oklch(0.16 0.02 200) 100%)',
        color: '#fff',
        border: 0,
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'rgba(255,255,255,0.12)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, border: '1px solid rgba(255,255,255,0.18)',
            flexShrink: 0,
          }}
        >
          ✦
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, lineHeight: 1.45 }}>
            {body}
          </div>
        </div>
        <Link
          href="/upgrade"
          style={{
            padding: '7px 14px',
            background: '#fff',
            color: '#1d1d1f',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          Upgrade
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Home — this month's income
// ─────────────────────────────────────────────────────────────────────
export interface FreeHomeMobileProps {
  /** € received this month (current calendar month). */
  thisMonth: number;
  /** € received last month — used for the delta. */
  lastMonth: number;
  /** YTD received so far. */
  ytdReceived: number;
  /** Forward 12M expected. */
  fwdAnnual: number;
  /** Top 6 holdings preview. */
  holdings: {
    ticker: string;
    name: string | null;
    qty: number;
    price: number | null;
    currency: string | null;
    fwdDivLocal: number | null;
  }[];
  /** Next upcoming dividend. */
  nextPayment: {
    ticker: string;
    name: string | null;
    estimatedTotalLocal: number;
    daysUntil: number;
  } | null;
  portfolioName: string;
  avatarInitials: string;
}

export function FreeHomeMobile({
  thisMonth, lastMonth, ytdReceived, fwdAnnual,
  holdings, nextPayment, portfolioName, avatarInitials,
}: FreeHomeMobileProps) {
  const delta = thisMonth - lastMonth;
  const fixed = thisMonth.toFixed(2);
  const [whole, cents] = fixed.split('.');
  const monthLabel = new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' });

  // Paired split — what % of the (received + forward) is already received
  const denom = ytdReceived + fwdAnnual;
  const aPct = denom > 0 ? (ytdReceived / denom) * 100 : 50;
  const bPct = 100 - aPct;

  return (
    <MobileShell
      currentTab="home"
      tabSet="free"
      portfolioName={portfolioName}
      avatarInitials={avatarInitials}
      chassis="v2b"
    >
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 } as React.CSSProperties}>
        <div className="eyebrow">This month, {monthLabel}</div>
        <h1>
          <span className="cur">€</span>{Number(whole).toLocaleString('en-IE')}
          <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>.{cents}</span>
        </h1>
        <div className="sub">
          Your stocks paid you in dividends.
          {Math.abs(delta) > 0.01 && (
            <>
              <br />
              {delta >= 0 ? (
                <>That&rsquo;s <b style={{ color: 'var(--up-fg, oklch(0.36 0.08 165))' }}>€{fmt(delta)} more</b> than last month.</>
              ) : (
                <>That&rsquo;s <b style={{ color: 'var(--down)' }}>€{fmt(Math.abs(delta))} less</b> than last month.</>
              )}
            </>
          )}
        </div>
      </div>

      {/* Paired: YTD : Forward 12M + next payment */}
      <div className="stat-paired cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="pcard-mini">
          <div className="ph">This year so far</div>
          <div className="paired-vals">
            <span className="num a">€{fmt(Math.round(ytdReceived))}</span>
            <span className="sep">:</span>
            <span className="num b">€{fmt(Math.round(fwdAnnual))}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: `${aPct}%` }} />
            <div className="b" style={{ width: `${bPct}%` }} />
          </div>
          <div className="paired-foot">
            <span>Received YTD</span>
            <span>Next 12 months</span>
          </div>
        </div>
        <div className="pcard-mini">
          <div className="ph">Next payment</div>
          {nextPayment ? (
            <div className="stacked-rows">
              <div className="srow">
                <span className="name">Ticker</span>
                <span className="val">{nextPayment.ticker}</span>
              </div>
              <div className="srow">
                <span className="name">Amount</span>
                <span className="val">€{fmt(nextPayment.estimatedTotalLocal, 2)}</span>
              </div>
              <div className="srow">
                <span className="name">When</span>
                <span className="val">in {nextPayment.daysUntil}d</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              No upcoming dividend in the next 60 days.
            </div>
          )}
        </div>
      </div>

      {/* Holdings preview */}
      {holdings.length > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 2 } as React.CSSProperties}>
          <div className="pcard-h">
            <div className="t">Your holdings</div>
            <Link href="/app/stocks" className="more" style={{ textDecoration: 'none' }}>
              See all →
            </Link>
          </div>
          <div>
            {holdings.slice(0, 6).map((h) => {
              const monthly = ((h.fwdDivLocal ?? 0) * h.qty) / 12;
              const value = (h.price ?? 0) * h.qty;
              return (
                <div className="lr" key={h.ticker}>
                  <span className="logo" style={{ background: 'transparent', padding: 0 }}>
                    <TickerLogo ticker={h.ticker} size={32} radius={8} />
                  </span>
                  <div className="body">
                    <div className="tk">{h.ticker}</div>
                    <div className="nm">
                      {fmt(h.qty, h.qty % 1 === 0 ? 0 : 2)} sh{h.name && ` · ${h.name}`}
                    </div>
                  </div>
                  <div className="right">
                    <div className="v">€{fmt(Math.round(value))}</div>
                    {monthly > 0 && <div className="s">€{fmt(Math.round(monthly))}/mo</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <UpsellStrip
        title="See further ahead with Premium"
        body="Forecast 12 months of income, simulate dividend reinvestment, and track your passive-income goal."
      />
      <div style={{ height: 80 }} />
    </MobileShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Coming up — next dividend hero + upcoming list
// ─────────────────────────────────────────────────────────────────────
export interface FreeNextMobileProps {
  nextPayment: {
    ticker: string;
    name: string | null;
    estimatedTotalLocal: number;
    daysUntil: number;
    exDate: string;
    isProjected: boolean;
  } | null;
  more: {
    ticker: string;
    name: string | null;
    exDate: string;
    estimatedTotalLocal: number;
    daysUntil: number;
    isProjected: boolean;
  }[];
  portfolioName: string;
  avatarInitials: string;
}

export function FreeNextMobile({
  nextPayment, more, portfolioName, avatarInitials,
}: FreeNextMobileProps) {
  const nextArrives = nextPayment
    ? new Date(nextPayment.exDate).toLocaleDateString('en', { day: '2-digit', month: 'short' })
    : '—';

  return (
    <MobileShell
      currentTab="next"
      tabSet="free"
      portfolioName={portfolioName}
      avatarInitials={avatarInitials}
      chassis="v2b"
    >
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 } as React.CSSProperties}>
        <div className="eyebrow">Coming up</div>
        {nextPayment ? (
          <>
            <h1>
              <span style={{ color: 'var(--accent-soft, oklch(0.55 0.10 175))' }}>
                {nextPayment.ticker}
              </span>
              <span
                style={{
                  fontSize: '0.42em',
                  fontWeight: 400,
                  color: 'var(--text-dim)',
                  marginLeft: 10,
                }}
              >
                pays you in
              </span>
            </h1>
            <div
              style={{
                marginTop: 14,
                fontSize: 36,
                fontWeight: 600,
                letterSpacing: '-0.025em',
                color: 'var(--text)',
              }}
            >
              {nextPayment.daysUntil}{' '}
              <span style={{ fontSize: 18, color: 'var(--text-dim)', fontWeight: 400 }}>days</span>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 18,
                padding: '10px 16px',
                background: 'var(--surface)',
                borderRadius: 999,
                border: '1px solid var(--border)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.04)',
              }}
            >
              <TickerLogo ticker={nextPayment.ticker} size={32} radius={8} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {nextPayment.name ?? nextPayment.ticker}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                  {nextPayment.isProjected ? 'Projected · not yet declared' : 'Dividend payment'}
                </div>
              </div>
              <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  €{fmt(nextPayment.estimatedTotalLocal, 2)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                  arriving {nextArrives}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1>Nothing for 60 days</h1>
            <div className="sub">
              Your portfolio doesn&rsquo;t have any declared or projected dividends in the next two months.
            </div>
          </>
        )}
      </div>

      {more.length > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
          <div className="pcard-h">
            <div className="t">More on the way</div>
            <span className="more">{more.length} payment{more.length === 1 ? '' : 's'}</span>
          </div>
          <div>
            {more.map((p) => {
              const d = new Date(p.exDate);
              return (
                <div className="lr" key={`${p.ticker}-${p.exDate}`}>
                  <div className="cal">
                    <div className="d">{String(d.getDate()).padStart(2, '0')}</div>
                    <div className="m">{MONTH_SHORT[d.getMonth()]}</div>
                  </div>
                  <span className="logo" style={{ background: 'transparent', padding: 0 }}>
                    <TickerLogo ticker={p.ticker} size={30} radius={7} />
                  </span>
                  <div className="body">
                    <div className="tk">
                      {p.ticker}{' '}
                      {p.isProjected && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: '1px 5px',
                            background: 'var(--surface-2)',
                            color: 'var(--text-muted)',
                            borderRadius: 4,
                            marginLeft: 4,
                            verticalAlign: 'middle',
                          }}
                        >
                          EST
                        </span>
                      )}
                    </div>
                    <div className="nm">in {p.daysUntil} days</div>
                  </div>
                  <div className="right">
                    <div className="v">€{fmt(p.estimatedTotalLocal, 2)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <UpsellStrip
        title="See your full payment calendar"
        body="Premium shows every payment for 12 months and reminds you 3 days before each one."
      />
      <div style={{ height: 80 }} />
    </MobileShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Your stocks — 2-column card grid
// ─────────────────────────────────────────────────────────────────────
function safetyForYield(p: number | null): { label: string; cls: string } {
  if (p == null) return { label: 'New', cls: '' };
  if (p < 3) return { label: 'Very safe', cls: 'safe' };
  if (p < 5) return { label: 'Safe', cls: 'safe' };
  if (p < 7) return { label: 'OK', cls: '' };
  return { label: 'Watch', cls: 'watch' };
}

export interface FreeStocksMobileProps {
  holdings: {
    ticker: string;
    qty: number;
    price: number | null;
    currency: string | null;
    fwdDivLocal: number | null;
    fwdYieldPct: number | null;
  }[];
  portfolioName: string;
  avatarInitials: string;
}

export function FreeStocksMobile({
  holdings, portfolioName, avatarInitials,
}: FreeStocksMobileProps) {
  const totalValueEur = holdings.reduce((s, h) => s + (h.price ?? 0) * h.qty, 0);
  const totalMonthlyEur = holdings.reduce(
    (s, h) => s + ((h.fwdDivLocal ?? 0) * h.qty) / 12,
    0,
  );
  const visible = holdings.slice(0, 8);

  return (
    <MobileShell
      currentTab="stocks"
      tabSet="free"
      portfolioName={portfolioName}
      avatarInitials={avatarInitials}
      chassis="v2b"
    >
      <div
        className="pro-hero-mob cdn-anim"
        style={{ '--i': 0, paddingTop: 32 } as React.CSSProperties}
      >
        <div className="eyebrow">Your stocks</div>
        <h1>
          {holdings.length}{' '}
          <span className="light">
            dividend stock{holdings.length === 1 ? '' : 's'}
          </span>
        </h1>
        <div className="sub">
          Worth <b>€{fmt(Math.round(totalValueEur))}</b>, paying you{' '}
          <b>€{fmt(Math.round(totalMonthlyEur))} every month</b>.
        </div>
      </div>

      {/* Stocks grid — 2 columns */}
      <div
        className="cdn-anim"
        style={{
          '--i': 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          padding: '12px var(--pad) 0',
        } as React.CSSProperties}
      >
        {visible.map((h) => {
          const monthly = ((h.fwdDivLocal ?? 0) * h.qty) / 12;
          const value = (h.price ?? 0) * h.qty;
          const sym = symbolFor(h.currency);
          const safety = safetyForYield(h.fwdYieldPct);
          const safetyBg = safety.cls === 'safe' ? 'var(--up-bg, oklch(0.94 0.04 165))' : 'var(--surface-2)';
          const safetyFg = safety.cls === 'safe' ? 'var(--up-fg, oklch(0.36 0.08 165))' : 'var(--text-muted)';
          return (
            <Link
              key={h.ticker}
              href={`/app/stocks/${encodeURIComponent(h.ticker)}/edit`}
              style={{
                background: 'var(--surface)',
                borderRadius: 14,
                border: '1px solid var(--border)',
                padding: 12,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <TickerLogo ticker={h.ticker} size={26} radius={7} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{h.ticker}</div>
                </div>
                {safety.label !== 'New' && (
                  <span
                    style={{
                      fontSize: 8.5,
                      padding: '1px 5px',
                      borderRadius: 999,
                      background: safetyBg,
                      color: safetyFg,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {safety.label}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-dim)', marginBottom: 2 }}>
                Pays you
              </div>
              <div
                style={{
                  fontSize: 18, fontWeight: 600,
                  letterSpacing: '-0.02em', lineHeight: 1,
                }}
              >
                {sym}{fmt(monthly, monthly < 10 ? 2 : 0)}
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 400 }}>
                  {' '}/mo
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                {sym}{fmt((h.fwdDivLocal ?? 0) * h.qty)}/yr
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 4,
                  paddingTop: 8,
                  marginTop: 8,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontSize: 8.5, color: 'var(--text-dim)' }}>Shares</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 1 }}>
                    {fmt(h.qty, h.qty % 1 === 0 ? 0 : 2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 8.5, color: 'var(--text-dim)' }}>Value</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 1 }}>
                    {sym}{value >= 1000 ? fmt(Math.round(value / 1000)) + 'k' : fmt(Math.round(value))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 8.5, color: 'var(--text-dim)' }}>Yield</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 1 }}>
                    {h.fwdYieldPct == null ? '—' : `${h.fwdYieldPct.toFixed(1)}%`}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {holdings.length > 8 && (
        <div
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-dim)',
            padding: 12,
          }}
        >
          Showing 8 of {holdings.length} ·{' '}
          <Link href="/app/holdings" style={{ color: 'var(--text)', textDecoration: 'none' }}>
            See all →
          </Link>
        </div>
      )}

      <UpsellStrip
        title="Unlock deeper research"
        body="Premium shows safety scores, dividend history, payout ratios, and analyst views for every stock."
      />
      <div style={{ height: 80 }} />
    </MobileShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Your year — story of this year's income
// ─────────────────────────────────────────────────────────────────────
export interface FreeYearMobileProps {
  year: number;
  months: RhythmMonth[];
  nowIndex: number;
  portfolioName: string;
  avatarInitials: string;
}

export function FreeYearMobile({
  year, months, nowIndex, portfolioName, avatarInitials,
}: FreeYearMobileProps) {
  const receivedSoFar = months.slice(0, nowIndex + 1).reduce((s, m) => s + m.received, 0);
  const fullYear = months.reduce((s, m) => s + Math.max(m.received, m.expected), 0);
  const expectedRemaining = Math.max(0, fullYear - receivedSoFar);
  // Days into the year so far
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 86_400_000,
  ) + 1;
  const dailyAvg = dayOfYear > 0 ? receivedSoFar / dayOfYear : 0;

  let biggestIdx = -1;
  let biggestVal = 0;
  months.forEach((m, i) => {
    const v = Math.max(m.received, m.expected);
    if (v > biggestVal) {
      biggestVal = v;
      biggestIdx = i;
    }
  });
  const activeMonths = months.filter((m) => m.received > 0).length;

  const recPct = fullYear > 0 ? (receivedSoFar / fullYear) * 100 : 0;
  const expPct = 100 - recPct;

  return (
    <MobileShell
      currentTab="year"
      tabSet="free"
      portfolioName={portfolioName}
      avatarInitials={avatarInitials}
      chassis="v2b"
    >
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 } as React.CSSProperties}>
        <div className="eyebrow">Your {year} so far</div>
        <h1>
          <span className="cur">€</span>{fmt(Math.round(receivedSoFar))}
        </h1>
        <div className="sub">
          in dividends, just from your stocks.
          <br />
          That&rsquo;s like <b>€{dailyAvg.toFixed(2)} every day</b>, on autopilot.
        </div>
      </div>

      {months.length > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
          <div className="pcard-h">
            <div className="t">Income by month</div>
            <span className="more">{year}</span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-dim)',
              marginBottom: 10,
              marginTop: -8,
            }}
          >
            Solid blocks are received. Faded blocks are expected.
          </div>
          <RhythmBars months={months} nowIndex={nowIndex} height={130} />
        </div>
      )}

      <div className="stat-paired cdn-anim" style={{ '--i': 2 } as React.CSSProperties}>
        <div className="pcard-mini">
          <div className="ph">Year total</div>
          <div className="paired-vals">
            <span className="num a">€{fmt(Math.round(receivedSoFar))}</span>
            <span className="sep">:</span>
            <span className="num b">€{fmt(Math.round(expectedRemaining))}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: `${recPct}%` }} />
            <div className="b" style={{ width: `${expPct}%` }} />
          </div>
          <div className="paired-foot">
            <span>Received</span>
            <span>Expected</span>
          </div>
        </div>
        <div className="pcard-mini">
          <div className="ph">Highlights</div>
          <div className="stacked-rows">
            <div className="srow">
              <span className="name">Biggest month</span>
              <span className="val">{biggestIdx >= 0 ? MONTH_SHORT[months[biggestIdx].month] : '—'}</span>
            </div>
            <div className="srow">
              <span className="name">Active months</span>
              <span className="val">{activeMonths}</span>
            </div>
            <div className="srow">
              <span className="name">Daily avg</span>
              <span className="val">€{dailyAvg.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <UpsellStrip
        title="See 5, 10, 25 years ahead"
        body="Premium projects how dividend income compounds with reinvestment, contributions, and growth."
      />
      <div style={{ height: 80 }} />
    </MobileShell>
  );
}

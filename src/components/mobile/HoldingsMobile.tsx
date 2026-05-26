'use client';

// Mobile Holdings — V2b chassis (Pro tier).
// Mirrors templates/pro-pages.jsx HoldingsPage:
//   pro-hero-mob (centered eyebrow + "N stocks paying you" + sub line)
//   stat-paired (Portfolio totals + Cadence breakdown)
//   filter chips (All / Monthly / Quarterly / Annual / USD / EUR)
//   list of .lr rows — one per holding, with TickerLogo + tk/nm + value/changePct
//   FAB to add a new holding

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MobileShell } from '@/components/mobile/MobileShell';
import { Icon } from '@/components/mobile/Icon';
import { TickerLogo } from '@/components/TickerLogo';

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

export interface HoldingsMobileRow {
  ticker: string;
  name: string | null;
  currency: string | null;
  quantity: number;
  price: number | null;
  changePct: number | null;
  fwdYieldPct: number | null;
  payoutFreq: number | null;
}

export interface HoldingsMobileProps {
  rows: HoldingsMobileRow[];
  /** Portfolio total value in EUR (already rolled up server-side). */
  totalValueEur: number;
  /** Distinct country count. */
  countriesCount: number;
  /** Cadence counts already aggregated server-side. */
  cadenceCounts: { monthly: number; quarterly: number; semi: number; annual: number };
  portfolioName: string;
  avatarInitials: string;
}

type Filter = 'all' | 'monthly' | 'quarterly' | 'annual' | 'usd' | 'eur';

export function HoldingsMobile({
  rows,
  totalValueEur,
  countriesCount,
  cadenceCounts,
  portfolioName,
  avatarInitials,
}: HoldingsMobileProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'monthly')   return rows.filter((r) => r.payoutFreq === 12);
    if (filter === 'quarterly') return rows.filter((r) => r.payoutFreq === 4);
    if (filter === 'annual')    return rows.filter((r) => r.payoutFreq === 1);
    if (filter === 'usd') return rows.filter((r) => r.currency === 'USD');
    if (filter === 'eur') return rows.filter((r) => r.currency === 'EUR');
    return rows;
  }, [rows, filter]);

  const totalKEur = Math.round(totalValueEur / 1000);

  // Paired bar — portfolio value vs country diversity, rough visual split
  const aPct = 70;
  const bPct = 30;

  const cadenceParts: string[] = [];
  if (cadenceCounts.monthly)   cadenceParts.push(`${cadenceCounts.monthly} monthly`);
  if (cadenceCounts.quarterly) cadenceParts.push(`${cadenceCounts.quarterly} quarterly`);
  if (cadenceCounts.annual)    cadenceParts.push(`${cadenceCounts.annual} annual`);
  if (cadenceCounts.semi)      cadenceParts.push(`${cadenceCounts.semi} semi`);

  return (
    <MobileShell
      currentTab="holdings"
      portfolioName={portfolioName}
      avatarInitials={avatarInitials}
      chassis="v2b"
    >
      {/* Hero — compact left-aligned */}
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 } as React.CSSProperties}>
        <div className="eyebrow">Your positions</div>
        <h1>
          {rows.length} stock{rows.length === 1 ? '' : 's'}{' '}
          <span className="light">paying you</span>
        </h1>
        <div className="sub">
          <b>€{fmt(Math.round(totalValueEur))}</b> across{' '}
          <b>{countriesCount} countr{countriesCount === 1 ? 'y' : 'ies'}</b>
          {cadenceParts.length > 0 && <> · {cadenceParts.join(', ')} payers</>}
        </div>
      </div>

      {/* Paired stat cards — Portfolio + Cadence */}
      <div className="stat-paired cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="pcard-mini">
          <div className="ph">Portfolio</div>
          <div className="paired-vals">
            <span className="num a">€{fmt(totalKEur)}k</span>
            <span className="sep">·</span>
            <span className="num b">{countriesCount}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: `${aPct}%` }} />
            <div className="b" style={{ width: `${bPct}%` }} />
          </div>
          <div className="paired-foot">
            <span>Total value</span>
            <span>Countries</span>
          </div>
        </div>

        <div className="pcard-mini">
          <div className="ph">Cadence</div>
          <div className="stacked-rows">
            <div className="srow">
              <span className="name">Monthly</span>
              <span className="val">{cadenceCounts.monthly}</span>
            </div>
            <div className="srow">
              <span className="name">Quarterly</span>
              <span className="val">{cadenceCounts.quarterly}</span>
            </div>
            <div className="srow">
              <span className="name">Annual</span>
              <span className="val">{cadenceCounts.annual}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="chips">
        {[
          { id: 'all',       label: 'All' },
          { id: 'monthly',   label: 'Monthly' },
          { id: 'quarterly', label: 'Quarterly' },
          { id: 'annual',    label: 'Annual' },
          { id: 'usd',       label: 'USD' },
          { id: 'eur',       label: 'EUR' },
        ].map((c) => (
          <button
            key={c.id}
            type="button"
            className={'chip' + (filter === c.id ? ' is-active' : '')}
            onClick={() => setFilter(c.id as Filter)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Holdings list */}
      <div className="pcard cdn-anim" style={{ '--i': 2 } as React.CSSProperties}>
        <div className="pcard-h">
          <div className="t">Holdings</div>
          <span className="more">
            {filtered.length} of {rows.length}
          </span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '24px 4px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
            No holdings match this filter.
          </div>
        ) : (
          <div>
            {filtered.map((h) => {
              const value = (h.price ?? 0) * h.quantity;
              const sym = symbolFor(h.currency);
              const isUp = (h.changePct ?? 0) >= 0;
              return (
                <Link
                  key={h.ticker}
                  href={`/app/stocks/${encodeURIComponent(h.ticker)}/edit`}
                  className="lr"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <span className="logo" style={{ background: 'transparent', padding: 0 }}>
                    <TickerLogo ticker={h.ticker} size={34} radius={9} />
                  </span>
                  <div className="body">
                    <div className="tk">
                      {h.ticker}
                      {h.name && (
                        <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 11 }}>
                          {' · '}{h.name}
                        </span>
                      )}
                    </div>
                    <div className="nm">
                      {fmt(h.quantity, h.quantity % 1 === 0 ? 0 : 2)} sh
                      {h.price != null && <> · {sym}{h.price.toFixed(2)}</>}
                      {h.fwdYieldPct != null && <> · {h.fwdYieldPct.toFixed(2)}% yld</>}
                    </div>
                  </div>
                  <div className="right">
                    <div className="v">{sym}{fmt(Math.round(value))}</div>
                    {h.changePct != null && (
                      <div className={'s ' + (isUp ? 'up' : 'down')}>
                        {isUp ? '+' : ''}{h.changePct.toFixed(2)}%
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ height: 80 }} />

      {/* FAB — Add holding */}
      <Link href="/app/add" className="fab" aria-label="Add holding">
        <Icon name="plus" size={22} />
      </Link>
    </MobileShell>
  );
}

'use client';

// Mobile Holdings — V2b chassis (Pro tier).
// Mirrors templates/pro-pages.jsx HoldingsPage:
//   pro-hero-mob (centered eyebrow + "N stocks paying you" + sub line)
//   stat-paired (Portfolio totals + Cadence breakdown)
//   filter chips (All / Monthly / Quarterly / Annual / USD / EUR)
//   list of .lr rows — one per holding, with checkbox + TickerLogo + tk/nm + value/changePct
//   tap row body → open HoldingEditModal (quick edit/delete, no navigation)
//   tap checkbox → bulk-select; selection bar appears with Clear + Delete N actions
//   FAB to add a new holding
//
// Selection model mirrors desktop HoldingsTable: write-side `selectedRaw`
// plus a derived live view that prunes stale tickers (deleted holdings drop
// out automatically without touching state).

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MobileShell } from '@/components/mobile/MobileShell';
import { Icon } from '@/components/mobile/Icon';
import { TickerLogo } from '@/components/TickerLogo';
import { HoldingEditModal } from '@/components/HoldingEditModal';
import { HoldingAddModal } from '@/components/HoldingAddModal';
import { useConfirm, useToast } from '@/components/DialogProvider';

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
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  // Quick-edit modal: ticker of the row being inspected, or null if closed.
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  // Add-holding modal: open when the FAB is tapped. Replaces the old
  // `<Link href="/app/add">` that navigated away and left the user
  // stranded on a separate page with no back button.
  const [addOpen, setAddOpen] = useState(false);
  // Bulk-select state. `selectedRaw` is what the user has toggled — stale
  // tickers (deleted holdings) are pruned via the derived `selected` below.
  const [selectedRaw, setSelectedRaw] = useState<Set<string>>(() => new Set());
  // Disables row interaction while a bulk delete is in flight.
  const [bulkBusy, setBulkBusy] = useState(false);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'monthly')   return rows.filter((r) => r.payoutFreq === 12);
    if (filter === 'quarterly') return rows.filter((r) => r.payoutFreq === 4);
    if (filter === 'annual')    return rows.filter((r) => r.payoutFreq === 1);
    if (filter === 'usd') return rows.filter((r) => r.currency === 'USD');
    if (filter === 'eur') return rows.filter((r) => r.currency === 'EUR');
    return rows;
  }, [rows, filter]);

  // Live ticker set — used to prune stale entries from `selectedRaw`.
  const liveTickers = useMemo(() => new Set(rows.map((r) => r.ticker)), [rows]);

  // Pruned, live view of the user's selection. Stale entries drop out
  // automatically without ever touching state.
  const selected = useMemo(() => {
    if (selectedRaw.size === 0) return selectedRaw;
    let hasStale = false;
    for (const t of selectedRaw) {
      if (!liveTickers.has(t)) { hasStale = true; break; }
    }
    if (!hasStale) return selectedRaw;
    const next = new Set<string>();
    for (const t of selectedRaw) if (liveTickers.has(t)) next.add(t);
    return next;
  }, [selectedRaw, liveTickers]);

  function toggleOne(ticker: string) {
    setSelectedRaw((cur) => {
      const next = new Set(cur);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }

  function clearSelection() {
    setSelectedRaw(new Set());
  }

  async function bulkDelete() {
    const tickers = Array.from(selected);
    if (tickers.length === 0) return;

    // Resolve { ticker, name } for each selection — preserves filter order so
    // the list in the confirm dialog matches what the user sees on screen.
    const byTicker = new Map(rows.map((r) => [r.ticker, r]));
    const items = tickers
      .map((t) => byTicker.get(t))
      .filter((r): r is HoldingsMobileRow => r != null);

    const ok = await confirm({
      title: `Delete ${tickers.length} holding${tickers.length === 1 ? '' : 's'}?`,
      body: (
        <div>
          <div style={{ marginBottom: 10 }}>
            These holdings and all of their transactions will be removed.{' '}
            <b style={{ color: 'var(--text)' }}>This can&rsquo;t be undone.</b>
          </div>
          <div
            style={{
              maxHeight: 200,
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: 10,
              background: 'var(--surface)',
            }}
          >
            {items.map((it, i) => (
              <div
                key={it.ticker}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderTop: i === 0 ? 0 : '1px solid var(--border)',
                }}
              >
                <TickerLogo ticker={it.ticker} size={22} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {it.ticker}
                  </div>
                  {it.name && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'var(--text-dim)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {it.name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      confirmLabel: `Delete ${tickers.length}`,
      destructive: true,
    });
    if (!ok) return;

    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        tickers.map((t) =>
          fetch(`/api/holdings/${encodeURIComponent(t)}`, { method: 'DELETE' }),
        ),
      );
      const succeeded: string[] = [];
      const failed: string[] = [];
      results.forEach((r, i) => {
        const t = tickers[i];
        if (r.status === 'fulfilled' && r.value.ok) succeeded.push(t);
        else failed.push(t);
      });

      // Drop only the successfully-deleted tickers from selection; keep failed
      // ones checked so the user can retry without re-selecting.
      setSelectedRaw((cur) => {
        const next = new Set(cur);
        for (const t of succeeded) next.delete(t);
        return next;
      });

      if (failed.length === 0) {
        toast(`Deleted ${succeeded.length} holding${succeeded.length === 1 ? '' : 's'}.`, 'info');
      } else if (succeeded.length === 0) {
        toast(`Couldn't delete ${failed.join(', ')}.`, 'error');
      } else {
        toast(
          `Deleted ${succeeded.length}; ${failed.length} failed (${failed.join(', ')}).`,
          'error',
        );
      }
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

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

      {/* Selection action bar — shown when ≥1 row is selected */}
      {selected.size > 0 && (
        <div
          role="region"
          aria-label={`${selected.size} holding${selected.size === 1 ? '' : 's'} selected`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            margin: '12px 0',
            background: 'oklch(0.96 0.02 175)',
            border: '1px solid oklch(0.86 0.06 175)',
            borderRadius: 12,
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'oklch(0.30 0.07 175)' }}>
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={clearSelection}
            disabled={bulkBusy}
            style={{
              height: 26,
              padding: '0 10px',
              background: 'transparent',
              border: 0,
              color: 'oklch(0.40 0.06 175)',
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 999,
              cursor: bulkBusy ? 'wait' : 'pointer',
            }}
          >
            Clear
          </button>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={bulkDelete}
            disabled={bulkBusy}
            style={{
              height: 30,
              padding: '0 14px',
              background: bulkBusy ? 'oklch(0.85 0.05 25)' : 'oklch(0.55 0.16 25)',
              color: '#fff',
              border: 0,
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: bulkBusy ? 'wait' : 'pointer',
            }}
          >
            {bulkBusy ? `Deleting ${selected.size}…` : `Delete ${selected.size}`}
          </button>
        </div>
      )}

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
              const isChecked = selected.has(h.ticker);
              return (
                <div
                  key={h.ticker}
                  className="lr"
                  role="button"
                  tabIndex={0}
                  onClick={() => { if (!bulkBusy) setEditingTicker(h.ticker); }}
                  onKeyDown={(e) => {
                    if (bulkBusy) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setEditingTicker(h.ticker);
                    }
                  }}
                  aria-label={`Edit ${h.ticker}`}
                  style={{
                    cursor: bulkBusy ? 'not-allowed' : 'pointer',
                    opacity: bulkBusy ? 0.55 : 1,
                    background: isChecked ? 'oklch(0.97 0.02 175)' : undefined,
                    transition: 'background 120ms, opacity 120ms',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={bulkBusy}
                    onChange={() => toggleOne(h.ticker)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${h.ticker}`}
                    style={{
                      width: 18,
                      height: 18,
                      margin: '0 10px 0 0',
                      cursor: 'pointer',
                      accentColor: 'oklch(0.55 0.10 175)',
                      flexShrink: 0,
                    }}
                  />
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
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ height: 80 }} />

      {/* FAB — opens the add-holding modal in place. No navigation,
          no back-button trap. */}
      <button
        type="button"
        className="fab"
        aria-label="Add holding"
        onClick={() => setAddOpen(true)}
      >
        <Icon name="plus" size={22} />
      </button>

      {/* Quick edit modal — opened by tapping a row */}
      {editingTicker && (
        <HoldingEditModal
          ticker={editingTicker}
          onClose={() => setEditingTicker(null)}
        />
      )}

      {/* Add-holding modal — opened by the FAB */}
      <HoldingAddModal open={addOpen} onClose={() => setAddOpen(false)} />
    </MobileShell>
  );
}

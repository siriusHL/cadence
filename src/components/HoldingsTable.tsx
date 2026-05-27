'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TickerLogo } from '@/components/TickerLogo';
import { HoldingEditModal } from '@/components/HoldingEditModal';
import { useConfirm, useToast } from '@/components/DialogProvider';
import { InfoTooltip } from '@/components/InfoTooltip';

export interface HoldingRow {
  ticker: string;
  name: string | null;
  sector: string | null;
  country: string | null;
  currency: string | null;
  quantity: number;
  price: number | null;
  changePct: number | null;
  costBasisLocal: number;
  fwdYieldPct: number | null;
  yieldOnCostPct: number | null;
  fwdDivAnnualLocal: number | null;
  payoutFreq: number | null;
}

type SortField =
  | 'ticker' | 'price' | 'change' | 'shares' | 'value' | 'weight'
  | 'pl' | 'plPct' | 'yield' | 'yoc' | 'fwd';
type GroupKey = 'none' | 'sector' | 'country';

interface Props {
  rows: HoldingRow[];
}

function fmt(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
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

function freqLabel(n: number | null): string {
  if (n === 12) return 'Mon';
  if (n === 4)  return 'Qtr';
  if (n === 2)  return 'Semi';
  if (n === 1)  return 'Ann';
  return '—';
}

export function HoldingsTable({ rows }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<GroupKey>('none');
  // Quick-edit modal: ticker of the row being inspected, or null if closed.
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  // Bulk-select state. `selectedRaw` is what the user has toggled — it may
  // contain stale tickers after a holding gets deleted (from the quick-edit
  // modal, the full edit page, or quantity hitting 0). `selected` below is
  // the live-pruned view derived from `rows`; everything in the UI reads
  // `selected`. Stale entries in the raw set are harmless — they're invisible
  // to every consumer and get filtered out the next time the user mutates
  // the selection.
  const [selectedRaw, setSelectedRaw] = useState<Set<string>>(() => new Set());
  // Disables row interaction while a bulk delete is in flight.
  const [bulkBusy, setBulkBusy] = useState(false);

  // Compute derived columns per row
  const enriched = useMemo(() => {
    return rows.map((r) => {
      const value = (r.price ?? 0) * r.quantity;
      const cost = r.costBasisLocal * r.quantity;
      const pl = value - cost;
      const plPct = cost > 0 ? (pl / cost) * 100 : 0;
      const fwdIncome = (r.fwdDivAnnualLocal ?? 0) * r.quantity;
      return { ...r, value, cost, pl, plPct, fwdIncome };
    });
  }, [rows]);

  const totalValue = enriched.reduce((s, r) => s + r.value, 0);
  const totalCost = enriched.reduce((s, r) => s + r.cost, 0);
  const totalFwd = enriched.reduce((s, r) => s + r.fwdIncome, 0);
  const totalPL = totalValue - totalCost;
  const totalPlPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const totalYield = totalValue > 0 ? (totalFwd / totalValue) * 100 : 0;
  const totalYoC = totalCost > 0 ? (totalFwd / totalCost) * 100 : 0;

  // Filter by search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((r) =>
      r.ticker.toLowerCase().includes(q) ||
      (r.name ?? '').toLowerCase().includes(q),
    );
  }, [enriched, search]);

  // Sort
  const sorted = useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      switch (sortField) {
        case 'ticker': av = a.ticker; bv = b.ticker; break;
        case 'price':  av = a.price ?? 0; bv = b.price ?? 0; break;
        case 'change': av = a.changePct ?? 0; bv = b.changePct ?? 0; break;
        case 'shares': av = a.quantity; bv = b.quantity; break;
        case 'value':  av = a.value; bv = b.value; break;
        case 'weight': av = a.value; bv = b.value; break;     // weight is value-derived
        case 'pl':     av = a.pl; bv = b.pl; break;
        case 'plPct':  av = a.plPct; bv = b.plPct; break;
        case 'yield':  av = a.fwdYieldPct ?? 0; bv = b.fwdYieldPct ?? 0; break;
        case 'yoc':    av = a.yieldOnCostPct ?? 0; bv = b.yieldOnCostPct ?? 0; break;
        case 'fwd':    av = a.fwdIncome; bv = b.fwdIncome; break;
      }
      const cmp = typeof av === 'string'
        ? av.localeCompare(bv as string)
        : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [filtered, sortField, sortDir]);

  // Group
  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: '', rows: sorted }];
    const map = new Map<string, typeof sorted>();
    for (const r of sorted) {
      const k = (groupBy === 'sector' ? r.sector : r.country) ?? 'Other';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => {
        const av = a[1].reduce((s, r) => s + r.value, 0);
        const bv = b[1].reduce((s, r) => s + r.value, 0);
        return bv - av;
      })
      .map(([key, rs]) => ({ key, rows: rs }));
  }, [sorted, groupBy]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  // ─── Selection helpers ───────────────────────────────────
  // Live ticker set — used to prune stale entries from `selectedRaw` and to
  // scope "all visible".
  const liveTickers = useMemo(() => new Set(rows.map((r) => r.ticker)), [rows]);

  // Pruned, live view of the user's selection. Stale entries (deleted
  // holdings) drop out automatically here without ever touching state.
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

  // "All" / "none" / "some" is scoped to the currently-visible (filtered) rows,
  // not the full portfolio — matches the GitHub/Gmail mental model.
  const visibleTickers = useMemo(() => filtered.map((r) => r.ticker), [filtered]);
  const visibleCount = visibleTickers.length;
  const selectedVisibleCount = useMemo(
    () => visibleTickers.reduce((n, t) => n + (selected.has(t) ? 1 : 0), 0),
    [visibleTickers, selected],
  );
  const allVisibleSelected = visibleCount > 0 && selectedVisibleCount === visibleCount;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  function toggleOne(ticker: string) {
    setSelectedRaw((cur) => {
      const next = new Set(cur);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedRaw((cur) => {
      if (allVisibleSelected) {
        // Deselect all visible — keep selection of any tickers filtered out of view.
        const next = new Set(cur);
        for (const t of visibleTickers) next.delete(t);
        return next;
      }
      // Select all visible — union with prior selection.
      const next = new Set(cur);
      for (const t of visibleTickers) next.add(t);
      return next;
    });
  }

  function clearSelection() {
    setSelectedRaw(new Set());
  }

  // ─── Bulk delete ──────────────────────────────────────────
  async function bulkDelete() {
    const tickers = Array.from(selected);
    if (tickers.length === 0) return;

    // Resolve { ticker, name } for each selection — preserves the table's
    // current sort order so the list in the confirm dialog matches what the
    // user sees on screen.
    const byTicker = new Map(enriched.map((r) => [r.ticker, r]));
    const items = tickers
      .map((t) => byTicker.get(t))
      .filter((r): r is (typeof enriched)[number] => r != null);

    const ok = await confirm({
      title: `Delete ${tickers.length} holding${tickers.length === 1 ? '' : 's'}?`,
      body: <DeleteConfirmList items={items.map((r) => ({ ticker: r.ticker, name: r.name }))} />,
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
      // ones checked so the user can retry without re-selecting. The derived
      // `selected` view will also drop them once `rows` refreshes — this
      // setState just keeps the raw set tidy.
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

  return (
    <div>
      <div className="filterbar">
        <button className={'chip' + (groupBy === 'none' ? ' active' : '')} onClick={() => setGroupBy('none')}>All</button>
        <button className={'chip' + (groupBy === 'sector' ? ' active' : '')} onClick={() => setGroupBy('sector')}>By sector</button>
        <button className={'chip' + (groupBy === 'country' ? ' active' : '')} onClick={() => setGroupBy('country')}>By country</button>
        <span className="spacer" />
        <input
          className="search"
          type="search"
          placeholder="Search ticker or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {selected.size > 0 && (
        <SelectionActionBar
          count={selected.size}
          busy={bulkBusy}
          onClear={clearSelection}
          onDelete={bulkDelete}
        />
      )}

      <div className="pcard flush">
        <div style={{ overflow: 'auto', maxHeight: 640 }}>
          <table className="pt">
            <thead>
              <tr>
                <th className="c" style={{ width: 36, paddingLeft: 14, paddingRight: 6 }}>
                  <HeaderCheckbox
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    disabled={visibleCount === 0}
                    onChange={toggleAllVisible}
                  />
                </th>
                <Th field="ticker" label="Ticker" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                <Th field="price"  label="Price"  align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort}
                  info="Latest market price per share. Updates with the live quote feed during market hours." />
                <Th field="change" label="Day"    align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort}
                  info="How much the share price has moved today, as a percentage. Green = up, red = down. Resets each trading day." />
                <Th field="shares" label="Shares" align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                <Th field="value"  label="Value"  align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort}
                  info="Current market value of this position — share price × shares you own, converted to euros." />
                <Th field="weight" label="Weight" align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort}
                  info="What share of your total portfolio this holding represents. Helps you spot concentration — one stock at 30% means a lot of your money rides on it." />
                <Th field="pl"     label="P/L"    align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort}
                  info="Profit and Loss: current value minus what you paid. Unrealized — only becomes real when you sell." />
                <Th field="plPct"  label="P/L %"  align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort}
                  info="The same Profit/Loss expressed as a percentage of your cost basis, so positions of any size are comparable." />
                <Th field="yield"  label="Yield"  align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort}
                  info="Forward dividend yield: expected yearly dividend divided by today's price. Tells you the cash return you'd get buying the stock right now." />
                <Th field="yoc"    label="YoC"    align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort}
                  info="Yield on Cost: yearly dividend divided by what you originally paid per share. Tends to climb above the market yield as dividends grow over the years." />
                <Th field="fwd"    label="Fwd income" align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort}
                  info="The cash dividends this position is expected to pay over the next 12 months, based on the current declared dividend." />
                <th className="c">
                  Freq
                  <InfoTooltip label="Payout frequency — how often this stock pays its dividend. Mon = monthly, Qtr = quarterly (every 3 months), Semi = twice a year, Ann = once a year." />
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Group
                  key={g.key || 'all'}
                  group={g}
                  totalValue={totalValue}
                  onPick={setEditingTicker}
                  selected={selected}
                  onToggle={toggleOne}
                  rowsDisabled={bulkBusy}
                />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="c muted">—</td>
                <td className="b">Total · {sorted.length} position{sorted.length === 1 ? '' : 's'}</td>
                <td className="r muted">—</td>
                <td className="r muted">—</td>
                <td className="r muted">—</td>
                <td className="r b">€{fmt(totalValue)}</td>
                <td className="r">100.0%</td>
                <td className={'r b ' + (totalPL >= 0 ? 'up' : 'down')}>
                  {totalPL >= 0 ? '+' : '−'}€{fmt(Math.abs(totalPL))}
                </td>
                <td className={'r b ' + (totalPlPct >= 0 ? 'up' : 'down')}>
                  {totalPlPct >= 0 ? '+' : ''}{totalPlPct.toFixed(2)}%
                </td>
                <td className="r">{totalYield.toFixed(2)}%</td>
                <td className="r up">{totalYoC.toFixed(2)}%</td>
                <td className="r b">€{fmt(totalFwd)}</td>
                <td className="c muted">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
          No holdings match &ldquo;{search}&rdquo;.
        </div>
      )}

      {editingTicker && (
        <HoldingEditModal
          ticker={editingTicker}
          onClose={() => setEditingTicker(null)}
        />
      )}
    </div>
  );
}

function DeleteConfirmList({ items }: { items: { ticker: string; name: string | null }[] }) {
  // Cap visible height so 50+ selections don't push the dialog buttons off-screen.
  // List scrolls inside the dialog body; the dialog itself stays a fixed size.
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        These holdings and all of their transactions will be removed.{' '}
        <b style={{ color: 'var(--text)' }}>This can&rsquo;t be undone.</b>
      </div>
      <div
        style={{
          maxHeight: 220,
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
            <TickerLogo ticker={it.ticker} size={24} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 13, fontWeight: 600,
                  color: 'var(--text)', letterSpacing: '-0.01em',
                }}
              >
                {it.ticker}
              </div>
              {it.name && (
                <div
                  style={{
                    fontSize: 11.5, color: 'var(--text-dim)',
                    overflow: 'hidden', textOverflow: 'ellipsis',
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
  );
}

function HeaderCheckbox({
  checked, indeterminate, disabled, onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      aria-label={checked ? 'Deselect all visible' : 'Select all visible'}
      title={checked ? 'Deselect all visible' : 'Select all visible'}
      style={checkboxStyle}
    />
  );
}

function RowCheckbox({
  checked, disabled, onChange, ...rest
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  'aria-label': string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      style={checkboxStyle}
      {...rest}
    />
  );
}

const checkboxStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  margin: 0,
  cursor: 'pointer',
  accentColor: 'oklch(0.55 0.10 175)',
};

function SelectionActionBar({
  count, busy, onClear, onDelete,
}: {
  count: number;
  busy: boolean;
  onClear: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="region"
      aria-label={`${count} holding${count === 1 ? '' : 's'} selected`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        marginBottom: 14,
        background: 'oklch(0.96 0.02 175)',
        border: '1px solid oklch(0.86 0.06 175)',
        borderRadius: 12,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.30 0.07 175)' }}>
        {count} holding{count === 1 ? '' : 's'} selected
      </span>
      <button
        type="button"
        onClick={onClear}
        disabled={busy}
        style={{
          height: 28, padding: '0 12px',
          background: 'transparent', border: 0,
          color: 'oklch(0.40 0.06 175)',
          fontSize: 12, fontWeight: 500,
          borderRadius: 999, cursor: busy ? 'wait' : 'pointer',
          transition: 'background 120ms',
        }}
        onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = 'oklch(0.92 0.04 175)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        Clear
      </button>
      <span style={{ flex: 1 }} />
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        style={{
          height: 30, padding: '0 14px',
          background: busy ? 'oklch(0.85 0.05 25)' : 'oklch(0.55 0.16 25)',
          color: '#fff',
          border: 0, borderRadius: 999,
          fontSize: 13, fontWeight: 500,
          cursor: busy ? 'wait' : 'pointer',
          transition: 'background 120ms, transform 80ms',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
        onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = 'oklch(0.50 0.18 25)'; }}
        onMouseLeave={(e) => { if (!busy) e.currentTarget.style.background = 'oklch(0.55 0.16 25)'; }}
        onMouseDown={(e) => { if (!busy) e.currentTarget.style.transform = 'scale(0.97)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {busy
          ? `Deleting ${count}…`
          : `Delete ${count} holding${count === 1 ? '' : 's'}`}
      </button>
    </div>
  );
}

function Th({ field, label, align, sortField, sortDir, onClick, info }: {
  field: SortField;
  label: string;
  align?: 'r' | 'c';
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  onClick: (f: SortField) => void;
  info?: string;
}) {
  const active = sortField === field;
  const arrow = active ? (sortDir === 'asc' ? '↑' : '↓') : '';
  return (
    <th
      className={[
        'sortable',
        align === 'r' ? 'r' : align === 'c' ? 'c' : '',
        active ? 'sorted' : '',
      ].join(' ').trim()}
      onClick={() => onClick(field)}
    >
      {label}{arrow && <span style={{ marginLeft: 4 }}>{arrow}</span>}
      {info && (
        <span onClick={(e) => e.stopPropagation()}>
          <InfoTooltip label={info} />
        </span>
      )}
    </th>
  );
}

interface Group {
  key: string;
  rows: (HoldingRow & {
    value: number; cost: number; pl: number; plPct: number; fwdIncome: number;
  })[];
}
function Group({ group, totalValue, onPick, selected, onToggle, rowsDisabled }: {
  group: Group;
  totalValue: number;
  /** Open the quick-edit modal for this ticker. */
  onPick: (ticker: string) => void;
  /** Set of currently-checked tickers. */
  selected: Set<string>;
  /** Toggle a single row's checkbox. */
  onToggle: (ticker: string) => void;
  /** Disable row interaction (modal open, checkbox) while a bulk op is running. */
  rowsDisabled: boolean;
}) {
  return (
    <>
      {group.key && (
        <tr className="group-header">
          <td colSpan={13}>
            {group.key} · {group.rows.length} · €{fmt(group.rows.reduce((s, r) => s + r.value, 0))}
          </td>
        </tr>
      )}
      {group.rows.map((r) => {
        const weight = totalValue > 0 ? (r.value / totalValue) * 100 : 0;
        const sym = symbolFor(r.currency);
        const dayClass = r.changePct == null ? 'muted' : r.changePct >= 0 ? 'up' : 'down';
        const isChecked = selected.has(r.ticker);
        return (
          <tr
            key={r.ticker}
            onClick={() => { if (!rowsDisabled) onPick(r.ticker); }}
            style={{
              cursor: rowsDisabled ? 'not-allowed' : 'pointer',
              opacity: rowsDisabled ? 0.55 : 1,
              background: isChecked ? 'oklch(0.97 0.02 175)' : undefined,
              transition: 'background 120ms, opacity 120ms',
            }}
            title="Click to modify or delete · use the checkbox to bulk select"
          >
            <td
              className="c"
              style={{ paddingLeft: 14, paddingRight: 6 }}
              onClick={(e) => e.stopPropagation()}
            >
              <RowCheckbox
                checked={isChecked}
                disabled={rowsDisabled}
                aria-label={`Select ${r.ticker}`}
                onChange={() => onToggle(r.ticker)}
              />
            </td>
            <td className="ticker">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TickerLogo ticker={r.ticker} size={28} />
                <div>
                  {r.ticker}
                  <span className="name">{r.name ?? ''}</span>
                </div>
              </div>
            </td>
            <td className="r b">
              {r.price != null ? `${sym}${r.price.toFixed(2)}` : '—'}
              {r.currency && r.currency !== 'EUR' && <span className="muted" style={{ fontSize: 10.5, fontWeight: 400, marginLeft: 4 }}>{r.currency}</span>}
            </td>
            <td className={'r ' + dayClass}>
              {r.changePct != null
                ? `${r.changePct >= 0 ? '+' : ''}${r.changePct.toFixed(2)}%`
                : '—'}
            </td>
            <td className="r">{fmt(r.quantity, r.quantity % 1 === 0 ? 0 : 4)}</td>
            <td className="r b">€{fmt(r.value)}</td>
            <td className="r">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
                <div className="pbar" style={{ width: 50 }}>
                  <i style={{ width: `${Math.min(100, weight * 4)}%` }} />
                </div>
                <span style={{ minWidth: 38, textAlign: 'right' }}>{weight.toFixed(1)}%</span>
              </div>
            </td>
            <td className={'r ' + (r.pl >= 0 ? 'up' : 'down')}>
              {r.pl >= 0 ? '+' : '−'}€{fmt(Math.abs(r.pl))}
            </td>
            <td className={'r ' + (r.plPct >= 0 ? 'up' : 'down')}>
              {r.plPct >= 0 ? '+' : ''}{r.plPct.toFixed(1)}%
            </td>
            <td className="r">{r.fwdYieldPct != null ? `${r.fwdYieldPct.toFixed(2)}%` : '—'}</td>
            <td className="r up">{r.yieldOnCostPct != null ? `${r.yieldOnCostPct.toFixed(2)}%` : '—'}</td>
            <td className="r b">€{fmt(r.fwdIncome)}</td>
            <td className="c muted" style={{ fontSize: 11 }}>{freqLabel(r.payoutFreq)}</td>
          </tr>
        );
      })}
    </>
  );
}

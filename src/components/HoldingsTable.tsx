'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TickerLogo } from '@/components/TickerLogo';

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
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<GroupKey>('none');

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

      <div className="pcard flush">
        <div style={{ overflow: 'auto', maxHeight: 640 }}>
          <table className="pt">
            <thead>
              <tr>
                <Th field="ticker" label="Ticker" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                <Th field="price"  label="Price"  align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                <Th field="change" label="Day"    align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                <Th field="shares" label="Shares" align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                <Th field="value"  label="Value"  align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                <Th field="weight" label="Weight" align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                <Th field="pl"     label="P/L"    align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                <Th field="plPct"  label="P/L %"  align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                <Th field="yield"  label="Yield"  align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                <Th field="yoc"    label="YoC"    align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                <Th field="fwd"    label="Fwd income" align="r" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
                <th className="c">Freq</th>
                <th className="c" style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Group key={g.key || 'all'} group={g} totalValue={totalValue} router={router} />
              ))}
            </tbody>
            <tfoot>
              <tr>
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
                <td className="c muted">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: '#86868b', fontSize: 13 }}>
          No holdings match &ldquo;{search}&rdquo;.
        </div>
      )}
    </div>
  );
}

function Th({ field, label, align, sortField, sortDir, onClick }: {
  field: SortField;
  label: string;
  align?: 'r' | 'c';
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  onClick: (f: SortField) => void;
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
    </th>
  );
}

interface Group {
  key: string;
  rows: (HoldingRow & {
    value: number; cost: number; pl: number; plPct: number; fwdIncome: number;
  })[];
}
function Group({ group, totalValue, router }: { group: Group; totalValue: number; router: ReturnType<typeof useRouter> }) {
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
        return (
          <tr
            key={r.ticker}
            onClick={() => router.push(`/app/stocks/${encodeURIComponent(r.ticker)}/edit`)}
            style={{ cursor: 'pointer' }}
          >
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
            <td className="c">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/app/stocks/${encodeURIComponent(r.ticker)}/edit`);
                }}
                aria-label="Edit"
                title="Edit"
                style={{
                  display: 'inline-block', width: 22, height: 22, lineHeight: '22px',
                  textAlign: 'center', borderRadius: 6, color: '#86868b',
                  fontSize: 12, cursor: 'pointer',
                  transition: 'background 120ms, color 120ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#1d1d1f'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#86868b'; }}
              >
                ›
              </span>
            </td>
          </tr>
        );
      })}
    </>
  );
}

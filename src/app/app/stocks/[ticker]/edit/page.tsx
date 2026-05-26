'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TickerLogo } from '@/components/TickerLogo';
import { useConfirm, useToast } from '@/components/DialogProvider';
import { MobileShell } from '@/components/mobile/MobileShell';
import { useIsMobile } from '@/components/mobile/useMediaQuery';

interface Transaction {
  id: string;
  kind: 'buy' | 'sell' | 'dividend' | 'split' | 'fee';
  occurred_on: string;
  quantity: number | string;
  price_local: number | string;
  fee_local: number | string;
  fx_to_base: number | string;
}
interface Instrument {
  ticker: string;
  name: string | null;
  currency: string | null;
}
interface Payload {
  holding: { ticker: string; notes: string | null };
  instrument: Instrument | null;
  transactions: Transaction[];
}

const today = () => new Date().toISOString().slice(0, 10);

export default function EditStockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: tickerRaw } = use(params);
  const ticker = tickerRaw.toUpperCase();
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const isMobile = useIsMobile();

  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // New-lot draft
  const [draftQty, setDraftQty] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [draftDate, setDraftDate] = useState(today());
  const [draftFee, setDraftFee] = useState('0');

  // Inline edit state — one row at a time
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ qty: string; price: string; date: string; fee: string }>({
    qty: '', price: '', date: today(), fee: '0',
  });

  function startEdit(tx: Transaction) {
    setEditingId(tx.id);
    setEditDraft({
      qty:   String(tx.quantity),
      price: String(tx.price_local),
      date:  tx.occurred_on,
      fee:   String(tx.fee_local),
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    if (!editDraft.qty || Number(editDraft.qty) <= 0) { toast('Shares must be positive.', 'error'); return; }
    if (!editDraft.price) { toast('Price is required.', 'error'); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          quantity:    editDraft.qty,
          price_local: editDraft.price,
          occurred_on: editDraft.date,
          fee_local:   editDraft.fee || '0',
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(`Could not save: ${j.error ?? res.statusText}`, 'error');
        return;
      }
      setEditingId(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function load() {
    const res = await fetch(`/api/holdings/${encodeURIComponent(ticker)}`);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? `Could not load (${res.status})`);
      return;
    }
    const j = await res.json();
    setData(j);
  }

  useEffect(() => { load(); }, [ticker]);   // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteLot(id: string) {
    const ok = await confirm({
      title: 'Remove this lot?',
      body: 'Other lots in this holding stay.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(`Could not delete: ${j.error ?? res.statusText}`, 'error');
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteHolding() {
    const ok = await confirm({
      title: `Remove ${ticker} entirely?`,
      body: `This deletes the holding and all of its transactions. This can't be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/holdings/${encodeURIComponent(ticker)}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(`Could not delete: ${j.error ?? res.statusText}`, 'error');
        return;
      }
      router.push('/app/stocks');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addLot() {
    if (!draftQty || !draftPrice) {
      toast('Shares and price are required.', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/holdings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ticker,
          currency: data?.instrument?.currency ?? 'USD',
          lots: [{
            quantity:    draftQty,
            price_local: draftPrice,
            occurred_on: draftDate,
            fee_local:   draftFee || '0',
          }],
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(`Could not add: ${j.error ?? res.statusText}`, 'error');
        return;
      }
      setDraftQty(''); setDraftPrice(''); setDraftDate(today()); setDraftFee('0');
      setAddOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div style={{ maxWidth: 640, margin: '32px auto' }}>
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Couldn&apos;t load {ticker}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{error}</div>
          <Link href="/app/stocks" className="btn" style={{ textDecoration: 'none' }}>Back to stocks</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ maxWidth: 640, margin: '32px auto', textAlign: 'center', color: 'var(--text-dim)' }}>
        Loading…
      </div>
    );
  }

  const buyOrSells = data.transactions.filter((t) => t.kind === 'buy' || t.kind === 'sell');
  const totalShares = buyOrSells.reduce(
    (s, t) => s + (t.kind === 'buy' ? Number(t.quantity) : -Number(t.quantity)),
    0,
  );
  const totalCost = buyOrSells.reduce(
    (s, t) => t.kind === 'buy'
      ? s + Number(t.quantity) * Number(t.price_local) + Number(t.fee_local)
      : s,
    0,
  );
  const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
  const cur = data.instrument?.currency ?? 'USD';
  const curSym = symbolFor(cur);

  const body = (
    <div style={{ maxWidth: 720, margin: isMobile ? '0' : '32px auto', padding: isMobile ? '0' : undefined }}>
      <div style={{ marginBottom: 18 }}>
        <Link href="/app/stocks" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Back to stocks
        </Link>
      </div>

      {/* Header */}
      <div className="card" style={{ padding: 24, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <TickerLogo ticker={ticker} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{ticker}</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {data.instrument?.name ?? ticker}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>
            {totalShares.toLocaleString('en-IE', { maximumFractionDigits: 4 })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            shares · avg cost {curSym}{avgCost.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Lots */}
      <div className="card" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Lots ({buyOrSells.length})</div>
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="btn"
            style={{ height: 30, padding: '0 14px', fontSize: 12 }}
          >
            {addOpen ? 'Cancel' : '+ Add lot'}
          </button>
        </div>

        {addOpen && (
          <div style={{ padding: '14px 18px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.7fr', gap: 10, marginBottom: 12 }}>
              <Field label="Shares">
                <input required type="number" min="0" step="any" value={draftQty}
                       onChange={(e) => setDraftQty(e.target.value)} placeholder="100" style={inputStyle} />
              </Field>
              <Field label="Price">
                <input required type="number" min="0" step="any" value={draftPrice}
                       onChange={(e) => setDraftPrice(e.target.value)} placeholder="48.35" style={inputStyle} />
              </Field>
              <Field label="Date">
                <input required type="date" max={today()} value={draftDate}
                       onChange={(e) => setDraftDate(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Fee">
                <input type="number" min="0" step="any" value={draftFee}
                       onChange={(e) => setDraftFee(e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <button type="button" onClick={addLot} disabled={busy} className="btn"
                    style={{ height: 34, padding: '0 16px', fontSize: 13 }}>
              {busy ? 'Adding…' : 'Add lot'}
            </button>
          </div>
        )}

        {buyOrSells.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
            No lots yet. Add one above.
          </div>
        ) : (
          <div>
            {buyOrSells.map((tx, i) => {
              const isEditing = editingId === tx.id;
              const cost = Number(tx.quantity) * Number(tx.price_local);
              const rowBorderTop = i === 0 ? 0 : '1px solid rgba(0,0,0,0.04)';

              if (isEditing) {
                return (
                  <div key={tx.id} style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr auto',
                    gap: 16, alignItems: 'end',
                    padding: '12px 18px',
                    borderTop: rowBorderTop,
                    background: 'oklch(0.97 0.02 175)',
                  }}>
                    <span style={kindChipStyle(tx.kind)}>{tx.kind}</span>
                    <Field label="Date">
                      <input type="date" max={today()}
                             value={editDraft.date}
                             onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })}
                             style={inputStyle} />
                    </Field>
                    <Field label="Shares">
                      <input type="number" min="0" step="any"
                             value={editDraft.qty}
                             onChange={(e) => setEditDraft({ ...editDraft, qty: e.target.value })}
                             style={inputStyle} />
                    </Field>
                    <Field label="Price">
                      <input type="number" min="0" step="any"
                             value={editDraft.price}
                             onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })}
                             style={inputStyle} />
                    </Field>
                    <Field label="Fee">
                      <input type="number" min="0" step="any"
                             value={editDraft.fee}
                             onChange={(e) => setEditDraft({ ...editDraft, fee: e.target.value })}
                             style={inputStyle} />
                    </Field>
                    <div style={{ display: 'flex', gap: 4, paddingBottom: 2 }}>
                      <button type="button" onClick={cancelEdit} disabled={busy}
                              aria-label="Cancel" title="Cancel"
                              style={iconBtnStyle('var(--text-muted)')}>
                        ×
                      </button>
                      <button type="button" onClick={() => saveEdit(tx.id)} disabled={busy}
                              aria-label="Save" title="Save"
                              style={{ ...iconBtnStyle('var(--text)'), background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}>
                        ✓
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={tx.id} style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr auto',
                  gap: 16, alignItems: 'center',
                  padding: '12px 18px',
                  borderTop: rowBorderTop,
                }}>
                  <span style={kindChipStyle(tx.kind)}>{tx.kind}</span>
                  <div style={{ fontSize: 13 }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Date</div>
                    {tx.occurred_on}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Shares</div>
                    <span className="num">{Number(tx.quantity).toLocaleString('en-IE', { maximumFractionDigits: 4 })}</span>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Price</div>
                    <span className="num">{curSym}{Number(tx.price_local).toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Cost</div>
                    <span className="num">{curSym}{cost.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button" onClick={() => startEdit(tx)} disabled={busy}
                      aria-label="Edit lot" title="Edit"
                      style={iconBtnStyle('var(--text-muted)')}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = 'var(--text)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      ✎
                    </button>
                    <button
                      type="button" onClick={() => deleteLot(tx.id)} disabled={busy}
                      aria-label="Remove lot" title="Delete"
                      style={iconBtnStyle('var(--text-muted)')}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.97 0.02 25)'; e.currentTarget.style.color = 'oklch(0.50 0.16 25)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div style={{
        padding: '14px 18px',
        border: '1px solid oklch(0.88 0.06 25)',
        background: 'oklch(0.98 0.01 25)',
        borderRadius: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.40 0.14 25)' }}>Remove this holding</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Deletes {ticker} and all its transactions. Can&apos;t be undone.
          </div>
        </div>
        <button
          type="button"
          onClick={deleteHolding}
          disabled={busy}
          style={{
            height: 34, padding: '0 14px',
            background: 'var(--surface)',
            border: '1px solid oklch(0.50 0.16 25)',
            color: 'oklch(0.50 0.16 25)',
            borderRadius: 999, fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 120ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.96 0.04 25)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
        >
          Delete {ticker}
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileShell chassis="v2b" currentTab="more" tabSet="pro">
        <div
          className="pro-hero-mob cdn-anim"
          style={{ '--i': 0, paddingBottom: 8 } as React.CSSProperties}
        >
          <div className="eyebrow">Holding · {ticker}</div>
          <h1>{data.instrument?.name ?? ticker}</h1>
          <div className="sub">
            <b>{totalShares.toLocaleString('en-IE', { maximumFractionDigits: 4 })}</b>{' '}
            share{totalShares === 1 ? '' : 's'} ·{' '}
            avg cost <b>{curSym}{avgCost.toFixed(2)}</b>
          </div>
        </div>
        <div style={{ padding: '8px 16px 24px' }}>{body}</div>
      </MobileShell>
    );
  }

  return body;
}

function symbolFor(ccy: string): string {
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 10px',
  border: '1px solid var(--border-strong)',
  borderRadius: 8,
  background: 'var(--surface)',
  fontFamily: 'inherit',
  fontSize: 13,
  outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </label>
  );
}

function kindChipStyle(kind: string): React.CSSProperties {
  const isBuy = kind === 'buy';
  return {
    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
    background: isBuy ? 'oklch(0.94 0.04 165)' : 'oklch(0.96 0.04 25)',
    color: isBuy ? 'oklch(0.36 0.07 165)' : 'oklch(0.46 0.10 25)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  };
}

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    width: 28, height: 28, borderRadius: 8,
    background: 'transparent', border: 0, cursor: 'pointer',
    fontSize: 14, color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
    transition: 'background 120ms, color 120ms',
  };
}

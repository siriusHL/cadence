'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { TickerLogo } from '@/components/TickerLogo';
import { useConfirm, useToast } from '@/components/DialogProvider';

/**
 * Quick-edit modal opened from a Holdings table row. Lets the user:
 *   - tweak quantity / price / date / fee on each lot
 *   - delete an individual lot
 *   - add a new lot
 *   - delete the entire holding ("danger zone" at the bottom)
 *
 * Talks to the same REST endpoints as the full /app/stocks/[ticker]/edit
 * page; the page route stays as a deeper-flow alternative reachable from the
 * trailing › on each table row.
 */

interface Transaction {
  id: string;
  kind: 'buy' | 'sell' | 'dividend' | 'split' | 'fee';
  occurred_on: string;
  quantity: number | string;
  price_local: number | string;
  fee_local: number | string;
  fx_to_base: number | string;
}
interface Payload {
  holding: { ticker: string; notes: string | null };
  instrument: { ticker: string; name: string | null; currency: string | null } | null;
  transactions: Transaction[];
}

const today = () => new Date().toISOString().slice(0, 10);

function symbolFor(ccy: string | null | undefined): string {
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

export interface HoldingEditModalProps {
  ticker: string;
  onClose: () => void;
}

export function HoldingEditModal({ ticker, onClose }: HoldingEditModalProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // New-lot drawer
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ qty: '', price: '', date: today(), fee: '0' });

  // Inline lot edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ qty: '', price: '', date: today(), fee: '0' });

  // Body scroll lock + ESC handler (mirrors EventDetailModal pattern)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Initial + after-mutation loader. Inlined in the effect with an `ignore`
  // flag scoped to the effect so a late-arriving fetch can't setState after
  // the modal closes or after `ticker` changes underneath us. The setState
  // calls happen post-await, which satisfies react-hooks/set-state-in-effect.
  useEffect(() => {
    let ignore = false;
    (async () => {
      setError(null);
      try {
        const res = await fetch(`/api/holdings/${encodeURIComponent(ticker)}`);
        if (ignore) return;
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          if (ignore) return;
          setError(j.error ?? `Could not load (${res.status})`);
          return;
        }
        const json = await res.json();
        if (ignore) return;
        setData(json);
      } catch (e) {
        if (ignore) return;
        setError(e instanceof Error ? e.message : 'Network error');
      }
    })();
    return () => { ignore = true; };
  }, [ticker]);

  // Manual reload after mutations (PATCH/DELETE/POST). Safe to setState
  // unconditionally — only fires from user-triggered handlers while the
  // modal is open.
  const reload = useCallback(async () => {
    try {
      const res = await fetch(`/api/holdings/${encodeURIComponent(ticker)}`);
      if (!res.ok) return;
      setData(await res.json());
    } catch {
      /* keep previous data on failure */
    }
  }, [ticker]);

  function startEdit(tx: Transaction) {
    setEditingId(tx.id);
    setEditDraft({
      qty:   String(tx.quantity),
      price: String(tx.price_local),
      date:  tx.occurred_on,
      fee:   String(tx.fee_local),
    });
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
      await reload();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

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
      await reload();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addLot() {
    if (!draft.qty || !draft.price) {
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
            quantity:    draft.qty,
            price_local: draft.price,
            occurred_on: draft.date,
            fee_local:   draft.fee || '0',
          }],
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(`Could not add: ${j.error ?? res.statusText}`, 'error');
        return;
      }
      setDraft({ qty: '', price: '', date: today(), fee: '0' });
      setAddOpen(false);
      await reload();
      router.refresh();
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
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === 'undefined') return null;

  const buyOrSells = data?.transactions.filter((t) => t.kind === 'buy' || t.kind === 'sell') ?? [];
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
  const cur = data?.instrument?.currency ?? 'USD';
  const curSym = symbolFor(cur);

  return createPortal(
    <div
      className="cdn-modal-backdrop"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="cdn-modal holding-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cdn-holding-edit-title"
        style={{ width: 'min(640px, 100%)', maxHeight: 'min(86vh, 760px)', padding: 0 }}
      >
        <button
          type="button"
          className="cdn-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {/* Header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '20px 22px 14px',
            borderBottom: '1px solid var(--border)',
          }}
          id="cdn-holding-edit-title"
        >
          <TickerLogo ticker={ticker} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em' }}>{ticker}</div>
            <div
              style={{
                fontSize: 12.5, color: 'var(--text-dim)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {data?.instrument?.name ?? (error ? '—' : 'Loading…')}
            </div>
          </div>
          {data && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div
                className="num"
                style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalShares.toLocaleString('en-IE', { maximumFractionDigits: 4 })}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                shares · avg {curSym}{avgCost.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 22px' }}>
          {error ? (
            <div
              style={{
                padding: 18, textAlign: 'center', color: 'var(--text-dim)',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : !data ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              Loading…
            </div>
          ) : (
            <>
              {/* Lots section heading + add toggle */}
              <div
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
                  Lots ({buyOrSells.length})
                </div>
                <button
                  type="button"
                  onClick={() => setAddOpen((v) => !v)}
                  className="chip"
                  style={{ height: 26, fontSize: 11.5 }}
                >
                  {addOpen ? 'Cancel' : '+ Add lot'}
                </button>
              </div>

              {/* New-lot drawer */}
              {addOpen && (
                <div
                  style={{
                    padding: 12,
                    background: 'var(--surface-2)',
                    borderRadius: 10,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'grid', gap: 8,
                      gridTemplateColumns: '1fr 1fr 1fr 0.7fr',
                      marginBottom: 10,
                    }}
                  >
                    <Field label="Shares">
                      <input
                        type="number" min="0" step="any" value={draft.qty}
                        onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
                        placeholder="100"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Price">
                      <input
                        type="number" min="0" step="any" value={draft.price}
                        onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                        placeholder="48.35"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Date">
                      <input
                        type="date" max={today()} value={draft.date}
                        onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Fee">
                      <input
                        type="number" min="0" step="any" value={draft.fee}
                        onChange={(e) => setDraft({ ...draft, fee: e.target.value })}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <button
                    type="button" onClick={addLot} disabled={busy}
                    className="btn"
                    style={{ height: 30, padding: '0 14px', fontSize: 12 }}
                  >
                    {busy ? 'Adding…' : 'Add lot'}
                  </button>
                </div>
              )}

              {/* Lots list */}
              {buyOrSells.length === 0 ? (
                <div
                  style={{
                    padding: 22, textAlign: 'center',
                    color: 'var(--text-dim)', fontSize: 12.5,
                    border: '1px dashed var(--border)', borderRadius: 10,
                  }}
                >
                  No lots yet. Add one above to start.
                </div>
              ) : (
                <div
                  style={{
                    border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
                  }}
                >
                  {buyOrSells.map((tx, i) => {
                    const isEditing = editingId === tx.id;
                    const cost = Number(tx.quantity) * Number(tx.price_local);
                    const borderTop = i === 0 ? 0 : '1px solid var(--border)';

                    if (isEditing) {
                      return (
                        <div
                          key={tx.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'auto 1fr 1fr 1fr 0.8fr auto',
                            gap: 10, alignItems: 'end',
                            padding: '10px 12px',
                            borderTop,
                            background: 'oklch(0.97 0.02 175)',
                          }}
                        >
                          <span style={kindChipStyle(tx.kind)}>{tx.kind}</span>
                          <Field label="Date">
                            <input
                              type="date" max={today()} value={editDraft.date}
                              onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })}
                              style={inputStyle}
                            />
                          </Field>
                          <Field label="Shares">
                            <input
                              type="number" min="0" step="any" value={editDraft.qty}
                              onChange={(e) => setEditDraft({ ...editDraft, qty: e.target.value })}
                              style={inputStyle}
                            />
                          </Field>
                          <Field label="Price">
                            <input
                              type="number" min="0" step="any" value={editDraft.price}
                              onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })}
                              style={inputStyle}
                            />
                          </Field>
                          <Field label="Fee">
                            <input
                              type="number" min="0" step="any" value={editDraft.fee}
                              onChange={(e) => setEditDraft({ ...editDraft, fee: e.target.value })}
                              style={inputStyle}
                            />
                          </Field>
                          <div style={{ display: 'flex', gap: 4, paddingBottom: 2 }}>
                            <button
                              type="button" onClick={() => setEditingId(null)} disabled={busy}
                              aria-label="Cancel" title="Cancel"
                              style={iconBtnStyle('var(--text-muted)')}
                            >×</button>
                            <button
                              type="button" onClick={() => saveEdit(tx.id)} disabled={busy}
                              aria-label="Save" title="Save"
                              style={{
                                ...iconBtnStyle('var(--text)'),
                                background: 'var(--btn-primary-bg)',
                                color: 'var(--btn-primary-text)',
                              }}
                            >✓</button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={tx.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr auto',
                          gap: 10, alignItems: 'center',
                          padding: '10px 12px',
                          borderTop,
                        }}
                      >
                        <span style={kindChipStyle(tx.kind)}>{tx.kind}</span>
                        <LotCell label="Date" value={tx.occurred_on} />
                        <LotCell
                          label="Shares"
                          value={Number(tx.quantity).toLocaleString('en-IE', { maximumFractionDigits: 4 })}
                          mono
                        />
                        <LotCell
                          label="Price"
                          value={`${curSym}${Number(tx.price_local).toFixed(2)}`}
                          mono
                        />
                        <LotCell label="Cost" value={`${curSym}${cost.toFixed(2)}`} mono />
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            type="button" onClick={() => startEdit(tx)} disabled={busy}
                            aria-label="Edit lot" title="Edit"
                            style={iconBtnStyle('var(--text-muted)')}
                          >✎</button>
                          <button
                            type="button" onClick={() => deleteLot(tx.id)} disabled={busy}
                            aria-label="Remove lot" title="Delete"
                            style={iconBtnStyle('var(--text-muted)')}
                          >×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — danger zone */}
        {data && (
          <div
            style={{
              padding: '12px 22px',
              borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              background: 'var(--surface-2)',
            }}
          >
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Deleting removes {ticker} and all of its transactions. Can&apos;t be undone.
            </div>
            <button
              type="button"
              onClick={deleteHolding}
              disabled={busy}
              style={{
                height: 32, padding: '0 14px',
                background: 'var(--surface)',
                border: '1px solid oklch(0.50 0.16 25)',
                color: 'oklch(0.50 0.16 25)',
                borderRadius: 999, fontSize: 12.5, fontWeight: 500,
                cursor: busy ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 120ms',
              }}
              onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = 'oklch(0.96 0.04 25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
            >
              Delete {ticker}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function LotCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ fontSize: 12.5, minWidth: 0 }}>
      <div style={{ color: 'var(--text-dim)', fontSize: 10.5, marginBottom: 1 }}>{label}</div>
      <span
        className={mono ? 'num' : undefined}
        style={{
          ...(mono ? { fontVariantNumeric: 'tabular-nums' } : {}),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'block',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 8px',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  background: 'var(--surface)',
  fontFamily: 'inherit',
  fontSize: 12.5,
  outline: 'none',
};

function kindChipStyle(kind: string): React.CSSProperties {
  const isBuy = kind === 'buy';
  return {
    fontSize: 9.5, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
    background: isBuy ? 'oklch(0.94 0.04 165)' : 'oklch(0.96 0.04 25)',
    color: isBuy ? 'oklch(0.36 0.07 165)' : 'oklch(0.46 0.10 25)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
    alignSelf: 'center',
    whiteSpace: 'nowrap',
  };
}

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    width: 26, height: 26, borderRadius: 6,
    background: 'transparent', border: 0, cursor: 'pointer',
    fontSize: 13, color,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
    transition: 'background 120ms, color 120ms',
  };
}

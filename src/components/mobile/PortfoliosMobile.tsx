'use client';

// Mobile Portfolios — matches templates/account-pages.jsx
// AccountPortfoliosPage:
//   • stat-paired: Usage (X / cap with bar) + Plan (Tier / Cap / Renews)
//   • pcard "Your portfolios" with "+ New" header link
//   • Each row: letter avatar + name + Active/Default badges +
//     holdings · €k subtitle + €fwd · /yr fwd on the right
//
// Interactions: tap a row to open an action sheet (Set as active /
// Rename / Delete). Tap "+ New" to open the create sheet. All API
// calls go through the same endpoints as the desktop PortfolioManager.

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useConfirm, useToast } from '@/components/DialogProvider';
import type { Tier } from '@/lib/tiers';

export interface PortfoliosMobileItem {
  id: string;
  name: string;
  active: boolean;
  isDefault: boolean;
  holdings: number;
  value: number;
  fwdIncome: number;
}

interface Props {
  tier: Tier;
  /** Pre-formatted tier label, e.g. "✦ Premium" / "Free plan". */
  tierLabel: string;
  /** Portfolio cap for this plan. `Infinity` for Elite. */
  cap: number;
  /** ISO string of `subscriptions.current_period_end`, or null. */
  renewsOn: string | null;
  portfolios: PortfoliosMobileItem[];
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-IE');
}

export function PortfoliosMobile({
  tier,
  tierLabel,
  cap,
  renewsOn,
  portfolios,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [actioning, setActioning] = useState<PortfoliosMobileItem | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [newName, setNewName] = useState('');

  const atCap = portfolios.length >= cap;
  const capDisplay = Number.isFinite(cap) ? String(cap) : '∞';
  // Bar split: in-use (a) vs available (b). Elite (∞ cap) shows full bar.
  const aPct = Number.isFinite(cap)
    ? (portfolios.length / cap) * 100
    : 100;
  const bPct = 100 - aPct;

  function setActive(id: string) {
    start(async () => {
      const res = await fetch('/api/portfolios/active', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ portfolioId: id }),
      });
      if (!res.ok) { toast('Could not switch portfolio.', 'error'); return; }
      toast('Active portfolio switched.');
      router.refresh();
    });
  }

  function createPortfolio() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    start(async () => {
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(
          j.reason === 'portfolio_cap_reached'
            ? `You've hit the ${cap}-portfolio limit on your plan.`
            : `Could not create: ${j.error ?? res.statusText}`,
          'error',
        );
        return;
      }
      toast('Portfolio created.');
      setNewName('');
      setAddOpen(false);
      router.refresh();
    });
  }

  function commitRename(id: string, current: string) {
    const next = renameDraft.trim();
    if (!next || next === current) { setRenamingId(null); return; }
    start(async () => {
      const res = await fetch(`/api/portfolios/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: next }),
      });
      if (!res.ok) { toast('Could not rename.', 'error'); return; }
      toast('Renamed.');
      setRenamingId(null);
      setActioning(null);
      router.refresh();
    });
  }

  async function removePortfolio(p: PortfoliosMobileItem) {
    setActioning(null);
    const ok = await confirm({
      title: `Delete "${p.name}"?`,
      body: 'Holdings and transactions inside it will also be deleted. This can’t be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await fetch(`/api/portfolios/${p.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(
          j.error === 'last_portfolio'
            ? 'You need at least one portfolio.'
            : 'Could not delete.',
          'error',
        );
        return;
      }
      toast('Portfolio deleted.');
      router.refresh();
    });
  }

  return (
    <>
      {/* stat-paired: Usage + Plan */}
      <div className="stat-paired cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="pcard-mini">
          <div className="ph">Usage</div>
          <div className="paired-vals">
            <span className="num a">{portfolios.length}</span>
            <span className="sep">/</span>
            <span className="num b">{capDisplay}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: `${aPct}%` }} />
            <div className="b" style={{ width: `${bPct}%` }} />
          </div>
          <div className="paired-foot">
            <span>In use</span>
            <span>Available</span>
          </div>
        </div>

        <div className="pcard-mini">
          <div className="ph">Plan</div>
          <div className="stacked-rows">
            <div className="srow">
              <span className="name">Tier</span>
              <span className="val">{tierLabel}</span>
            </div>
            <div className="srow">
              <span className="name">Cap</span>
              <span className="val">
                {Number.isFinite(cap) ? `${cap} portfolios` : 'Unlimited'}
              </span>
            </div>
            {renewsOn && (
              <div className="srow">
                <span className="name">Renews</span>
                <span className="val">
                  {new Date(renewsOn).toLocaleDateString('en', {
                    month: 'short', day: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Your portfolios card */}
      <div className="pcard cdn-anim" style={{ '--i': 2 } as React.CSSProperties}>
        <div className="pcard-h">
          <div className="t">Your portfolios</div>
          <button
            type="button"
            disabled={atCap || pending}
            onClick={() => setAddOpen(true)}
            className="more"
            style={{
              background: 'transparent',
              border: 0,
              font: 'inherit',
              cursor: atCap ? 'not-allowed' : 'pointer',
              opacity: atCap ? 0.4 : 1,
              color: 'var(--text)',
            }}
          >
            + New
          </button>
        </div>

        <div>
          {portfolios.map((p, i) => {
            const isRenaming = renamingId === p.id;
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => { if (!isRenaming) setActioning(p); }}
                onKeyDown={(e) => {
                  if (isRenaming) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActioning(p);
                  }
                }}
                aria-label={`Manage ${p.name}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: i === portfolios.length - 1 ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                {/* Letter avatar — teal when active, gray otherwise */}
                <div
                  aria-hidden
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: p.active ? 'var(--accent-soft, oklch(0.55 0.10 175))' : 'var(--surface-2)',
                    color: p.active ? '#fff' : 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {p.name.slice(0, 1).toUpperCase()}
                </div>

                {/* Name + badges + subtitle */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isRenaming ? (
                    <input
                      type="text"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') commitRename(p.id, p.name);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onBlur={() => commitRename(p.id, p.name)}
                      autoFocus
                      maxLength={80}
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        fontSize: 13,
                        fontWeight: 600,
                        border: '1px solid var(--border-strong)',
                        borderRadius: 6,
                        color: 'var(--text)',
                        background: 'var(--input-bg)',
                      }}
                    />
                  ) : (
                    <>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                      }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          color: 'var(--text)',
                        }}>
                          {p.name}
                        </div>
                        {p.active && <Badge tone="up">Active</Badge>}
                        {p.isDefault && <Badge tone="neutral">Default</Badge>}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: 'var(--text-dim)',
                        marginTop: 2,
                      }}>
                        {p.holdings} holding{p.holdings === 1 ? '' : 's'}
                        {p.value > 0 && <> · €{fmt(Math.round(p.value / 1000))}k</>}
                      </div>
                    </>
                  )}
                </div>

                {/* Right: forward income */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--text)',
                  }}>
                    €{fmt(p.fwdIncome)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                    / yr fwd
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action sheet for a tapped portfolio */}
      {actioning && (
        <ActionSheet
          title={actioning.name}
          subtitle={`${actioning.holdings} holding${actioning.holdings === 1 ? '' : 's'} · €${fmt(actioning.fwdIncome)}/yr fwd`}
          actions={[
            ...(actioning.active ? [] : [{
              label: 'Set as active',
              onClick: () => { setActive(actioning.id); setActioning(null); },
            }]),
            {
              label: 'Rename',
              onClick: () => {
                setRenameDraft(actioning.name);
                setRenamingId(actioning.id);
                setActioning(null);
              },
            },
            {
              label: 'Delete',
              destructive: true,
              disabled: portfolios.length <= 1,
              onClick: () => removePortfolio(actioning),
            },
          ]}
          onClose={() => setActioning(null)}
        />
      )}

      {/* Create sheet */}
      {addOpen && (
        <CreateSheet
          value={newName}
          onChange={setNewName}
          onSubmit={createPortfolio}
          onClose={() => { setAddOpen(false); setNewName(''); }}
          pending={pending}
        />
      )}
    </>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────
function Badge({ tone, children }: { tone: 'up' | 'neutral'; children: React.ReactNode }) {
  const styles =
    tone === 'up'
      ? { background: 'var(--up-bg, oklch(0.94 0.04 165))', color: 'var(--up-fg, oklch(0.36 0.08 165))' }
      : { background: 'var(--surface-2)', color: 'var(--text-dim)' };
  return (
    <span
      style={{
        fontSize: 9,
        padding: '1px 6px',
        borderRadius: 999,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...styles,
      }}
    >
      {children}
    </span>
  );
}

// ─── ActionSheet (bottom-anchored modal with buttons) ────────────────────
interface ActionSheetAction {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}
function ActionSheet({
  title, subtitle, actions, onClose,
}: {
  title: string;
  subtitle?: string;
  actions: ActionSheetAction[];
  onClose: () => void;
}) {
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

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.40)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          background: 'var(--surface)',
          width: 'min(420px, 100%)',
          borderRadius: '14px 14px 0 0',
          padding: '12px 12px max(20px, env(safe-area-inset-bottom)) 12px',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'var(--border-strong)',
          margin: '0 auto 12px',
        }} />
        <div style={{ padding: '4px 12px 12px' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              disabled={a.disabled}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                background: 'transparent',
                border: 0,
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                color: a.destructive ? 'var(--down, oklch(0.50 0.18 25))' : 'var(--text)',
                cursor: a.disabled ? 'not-allowed' : 'pointer',
                opacity: a.disabled ? 0.4 : 1,
                fontFamily: 'inherit',
              }}
            >
              {a.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: 6,
              padding: '12px 14px',
              background: 'var(--surface-2)',
              border: 0,
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── CreateSheet (bottom modal with single input) ────────────────────────
function CreateSheet({
  value, onChange, onSubmit, onClose, pending,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  pending: boolean;
}) {
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

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.40)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        role="dialog"
        aria-modal="true"
        aria-label="Create a portfolio"
        style={{
          background: 'var(--surface)',
          width: 'min(420px, 100%)',
          borderRadius: '14px 14px 0 0',
          padding: '12px 16px max(20px, env(safe-area-inset-bottom)) 16px',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'var(--border-strong)',
          margin: '0 auto 12px',
        }} />
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
          Create a portfolio
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>
          Give it a short name — Retirement, Watchlist, anything.
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Retirement IRA"
          maxLength={80}
          autoFocus
          style={{
            width: '100%',
            height: 40,
            padding: '0 12px',
            fontSize: 14,
            border: '1px solid var(--border-strong)',
            borderRadius: 8,
            boxSizing: 'border-box',
            background: 'var(--input-bg)',
            color: 'var(--text)',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              height: 40,
              background: 'var(--surface-2)',
              border: 0,
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !value.trim()}
            style={{
              flex: 1,
              height: 40,
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: 0,
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: pending ? 'wait' : 'pointer',
              opacity: !value.trim() ? 0.5 : 1,
              fontFamily: 'inherit',
            }}
          >
            {pending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

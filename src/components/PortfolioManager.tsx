'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm, useToast } from './DialogProvider';
import type { Tier } from '@/lib/tiers';

interface PortfolioRow {
  id: string;
  name: string;
  created_at: string;
}

interface Props {
  tier: Tier;
  portfolios: PortfolioRow[];
  activeId: string | null;
  cap: number;
}

export function PortfolioManager({ tier, portfolios, activeId, cap }: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const atCap = portfolios.length >= cap;

  function setActive(id: string) {
    if (id === activeId) return;
    start(async () => {
      const res = await fetch('/api/portfolios/active', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ portfolioId: id }),
      });
      if (!res.ok) {
        toast('Could not switch portfolio.', 'error');
        return;
      }
      toast('Active portfolio switched.');
      router.refresh();
    });
  }

  function createPortfolio(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    start(async () => {
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
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
      router.refresh();
    });
  }

  function beginRename(id: string, current: string) {
    setEditingId(id);
    setEditingName(current);
  }

  function cancelRename() {
    setEditingId(null);
    setEditingName('');
  }

  function commitRename(id: string, current: string) {
    const next = editingName.trim();
    if (!next || next === current) {
      cancelRename();
      return;
    }
    start(async () => {
      const res = await fetch(`/api/portfolios/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: next }),
      });
      if (!res.ok) {
        toast('Could not rename.', 'error');
        return;
      }
      toast('Renamed.');
      cancelRename();
      router.refresh();
    });
  }

  async function remove(id: string, name: string) {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      body: 'Holdings and transactions inside it will also be deleted. This can’t be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await fetch(`/api/portfolios/${id}`, { method: 'DELETE' });
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="pcard">
        <div className="pcard-h">
          <div className="t">Your portfolios</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {portfolios.map((p, i) => (
            <div key={p.id}>
              <div
                className="portfolio-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                <input
                  type="radio"
                  name="active"
                  checked={p.id === activeId}
                  onChange={() => setActive(p.id)}
                  disabled={pending}
                  aria-label={`Set ${p.name} active`}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === p.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(p.id, p.name);
                        if (e.key === 'Escape') cancelRename();
                      }}
                      autoFocus
                      maxLength={80}
                      disabled={pending}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'var(--text)',
                      }}
                    />
                  ) : (
                    <>
                      <div style={{ fontWeight: 500, color: 'var(--text)' }}>
                        {p.name}
                        {p.id === activeId && (
                          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent)' }}>active</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                        Created {new Date(p.created_at).toLocaleDateString('en', { month: 'short', day: '2-digit', year: 'numeric' })}
                      </div>
                    </>
                  )}
                </div>
                <div className="portfolio-row-actions" style={{ display: 'flex', gap: 8 }}>
                  {editingId === p.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => commitRename(p.id, p.name)}
                        style={btnPrimary}
                        disabled={pending || !editingName.trim()}
                      >
                        Save
                      </button>
                      <button type="button" onClick={cancelRename} style={btnGhost} disabled={pending}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => beginRename(p.id, p.name)} style={btnGhost} disabled={pending}>
                        Rename
                      </button>
                      <button type="button" onClick={() => remove(p.id, p.name)} style={btnDanger} disabled={pending}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {portfolios.length === 0 && (
            <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center' }}>
              No portfolios yet.
            </div>
          )}
        </div>
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <div className="t">Create a portfolio</div>
        </div>
        <form
          onSubmit={createPortfolio}
          className="portfolio-create-form"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={atCap ? `Plan limit reached (${cap})` : 'e.g. Retirement IRA'}
            maxLength={80}
            disabled={atCap || pending}
            className="portfolio-create-input"
            style={{
              background: atCap ? "var(--input-disabled-bg)" : "var(--input-bg)",
            }}
          />
          <button
            type="submit"
            disabled={atCap || pending || !newName.trim()}
            className={atCap ? 'portfolio-create-btn is-disabled' : 'portfolio-create-btn'}
          >
            {atCap ? 'Upgrade to add more' : 'Create'}
          </button>
        </form>
        {atCap && tier !== 'elite' && (
          <div style={{ padding: '0 16px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
            Need more portfolios?{' '}
            <a href="/upgrade" style={{ color: 'var(--accent)' }}>
              Upgrade to {tier === 'free' ? 'Premium (3) or Elite (∞)' : 'Elite (∞)'}
            </a>
            .
          </div>
        )}
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  // Explicit 36px height + border-box so the button matches the
  // sibling input pixel-for-pixel in the Create-a-portfolio form
  // — without this they had a 1-2px height mismatch from differing
  // font-size + padding combinations.
  height: 36,
  padding: '0 14px',
  background: 'var(--btn-primary-bg)',
  color: 'var(--btn-primary-text)',
  border: '1px solid var(--btn-primary-bg)',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  boxSizing: 'border-box',
  whiteSpace: 'nowrap',
};

const btnGhost: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--surface)',
  color: 'var(--text)',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  fontSize: 12,
  cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  ...btnGhost,
  color: 'var(--danger)',
  borderColor: 'var(--border-strong)',
};

const btnDisabled: React.CSSProperties = {
  ...btnPrimary,
  background: 'var(--border-strong)',
  borderColor: 'var(--border-strong)',
  color: 'var(--text-muted)',
  cursor: 'not-allowed',
};

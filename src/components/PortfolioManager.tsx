'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm, useToast } from './DialogProvider';
import type { Tier } from '@/lib/tiers';

interface PortfolioRow {
  id: string;
  name: string;
  created_at: string;
  owned: boolean;
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
  const [expandedShareId, setExpandedShareId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const ownedCount = portfolios.filter((p) => p.owned).length;
  const atCap = ownedCount >= cap;

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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  borderTop: i === 0 ? 'none' : '1px solid #ececec',
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
                        border: '1px solid #d2d2d7',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#1d1d1f',
                      }}
                    />
                  ) : (
                    <>
                      <div style={{ fontWeight: 500, color: '#1d1d1f' }}>
                        {p.name}
                        {p.id === activeId && (
                          <span style={{ marginLeft: 8, fontSize: 11, color: '#0070f3' }}>active</span>
                        )}
                        {!p.owned && (
                          <span style={{ marginLeft: 8, fontSize: 11, color: '#6e6e73' }}>shared with you</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#86868b' }}>
                        Created {new Date(p.created_at).toLocaleDateString('en', { month: 'short', day: '2-digit', year: 'numeric' })}
                      </div>
                    </>
                  )}
                </div>
                {p.owned && (
                  <div style={{ display: 'flex', gap: 8 }}>
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
                        {tier === 'elite' && (
                          <button
                            type="button"
                            onClick={() => setExpandedShareId(expandedShareId === p.id ? null : p.id)}
                            style={btnGhost}
                            disabled={pending}
                          >
                            Share
                          </button>
                        )}
                        <button type="button" onClick={() => beginRename(p.id, p.name)} style={btnGhost} disabled={pending}>
                          Rename
                        </button>
                        <button type="button" onClick={() => remove(p.id, p.name)} style={btnDanger} disabled={pending}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {expandedShareId === p.id && tier === 'elite' && p.owned && (
                <ShareManager portfolioId={p.id} />
              )}
            </div>
          ))}
          {portfolios.length === 0 && (
            <div style={{ padding: 24, color: '#6e6e73', textAlign: 'center' }}>
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
          style={{ display: 'flex', gap: 8, padding: 16 }}
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={atCap ? `Plan limit reached (${cap})` : 'e.g. Retirement IRA'}
            maxLength={80}
            disabled={atCap || pending}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #d2d2d7',
              borderRadius: 8,
              fontSize: 14,
              background: atCap ? '#f5f5f7' : '#fff',
            }}
          />
          <button
            type="submit"
            disabled={atCap || pending || !newName.trim()}
            style={atCap ? btnDisabled : btnPrimary}
          >
            {atCap ? 'Upgrade to add more' : 'Create'}
          </button>
        </form>
        {atCap && tier !== 'elite' && (
          <div style={{ padding: '0 16px 16px', fontSize: 13, color: '#6e6e73' }}>
            Need more portfolios?{' '}
            <a href="/upgrade" style={{ color: '#0070f3' }}>
              Upgrade to {tier === 'free' ? 'Premium (3) or Elite (∞)' : 'Elite (∞)'}
            </a>
            .
          </div>
        )}
      </div>
    </div>
  );
}

interface ShareRow {
  id: string;
  shared_with_user_id: string;
  email: string | null;
  created_at: string;
}

function ShareManager({ portfolioId }: { portfolioId: string }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shares, setShares] = useState<ShareRow[] | null>(null);
  const [email, setEmail] = useState('');
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    setLoaded(true);
    fetch(`/api/portfolios/${portfolioId}/shares`)
      .then((r) => r.json())
      .then((j) => setShares(j.data ?? []))
      .catch(() => setShares([]));
  }

  function addShare(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    start(async () => {
      const res = await fetch(`/api/portfolios/${portfolioId}/shares`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          j.error === 'user_not_found' ? 'No Cadence user with that email.'
          : j.error === 'already_shared' ? 'Already shared with this user.'
          : j.error === 'cannot_share_with_self' ? "You can't share with yourself."
          : `Could not share: ${j.error ?? res.statusText}`;
        toast(msg, 'error');
        return;
      }
      toast('Shared.');
      setShares((s) => [...(s ?? []), j.data]);
      setEmail('');
      router.refresh();
    });
  }

  function removeShare(shareId: string) {
    start(async () => {
      const res = await fetch(`/api/portfolios/${portfolioId}/shares/${shareId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        toast('Could not remove.', 'error');
        return;
      }
      setShares((s) => (s ?? []).filter((sh) => sh.id !== shareId));
      router.refresh();
    });
  }

  return (
    <div style={{ background: '#fafafa', padding: 16, borderTop: '1px solid #ececec' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 8 }}>
        SHARED WITH (read-only)
      </div>
      {shares === null && <div style={{ fontSize: 13, color: '#86868b' }}>Loading…</div>}
      {shares !== null && shares.length === 0 && (
        <div style={{ fontSize: 13, color: '#86868b', marginBottom: 12 }}>
          No-one yet. Add a recipient below.
        </div>
      )}
      {shares !== null && shares.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {shares.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ flex: 1, color: '#1d1d1f' }}>{s.email ?? s.shared_with_user_id}</span>
              <button type="button" onClick={() => removeShare(s.id)} disabled={pending} style={btnGhost}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={addShare} style={{ display: 'flex', gap: 8 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          disabled={pending}
          style={{
            flex: 1,
            padding: '6px 10px',
            border: '1px solid #d2d2d7',
            borderRadius: 6,
            fontSize: 13,
          }}
        />
        <button type="submit" disabled={pending || !email.trim()} style={btnPrimary}>
          Share
        </button>
      </form>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 14px',
  background: '#1d1d1f',
  color: '#fff',
  border: '1px solid #1d1d1f',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  padding: '6px 10px',
  background: '#fff',
  color: '#1d1d1f',
  border: '1px solid #d2d2d7',
  borderRadius: 6,
  fontSize: 12,
  cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  ...btnGhost,
  color: '#d70015',
  borderColor: '#f5c2c7',
};

const btnDisabled: React.CSSProperties = {
  ...btnPrimary,
  background: '#d2d2d7',
  borderColor: '#d2d2d7',
  cursor: 'not-allowed',
};

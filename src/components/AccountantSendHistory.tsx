'use client';

import { useState } from 'react';

export interface AccountantSend {
  recipient: string;
  fiscal_year: number;
  attached_pack: boolean;
  all_years: boolean;
  created_at: string;
}

function fmtSentDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * "Send to accountant" history. The server renders the latest few inline
 * (`initial`); `total` is the full row count so we only offer "Show all" when
 * there's more to load. The rest is fetched lazily on click — never on first
 * paint — so a long history costs nothing until the user asks for it.
 */
export function AccountantSendHistory({
  initial,
  total,
}: {
  initial: AccountantSend[];
  total: number;
}) {
  const [sends, setSends] = useState<AccountantSend[]>(initial);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (sends.length === 0) return null;

  const hasMore = !expanded && total > sends.length;

  async function showAll() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/tax/accountant-sends');
      if (!res.ok) throw new Error(String(res.status));
      const data: { sends?: AccountantSend[] } = await res.json();
      setSends(data.sends ?? sends);
      setExpanded(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <div
        style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
        }}
      >
        Send history
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sends.map((s, i) => (
          <div
            key={`${s.created_at}-${i}`}
            style={{
              fontSize: 12, lineHeight: 1.5,
              color: i === 0 ? 'var(--text)' : 'var(--text-dim)',
              display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline',
            }}
          >
            <span
              className="num"
              style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)', minWidth: 92 }}
            >
              {fmtSentDate(s.created_at)}
            </span>
            <span>
              {i === 0 ? 'Last sent to ' : 'Sent to '}
              <b style={{ color: 'var(--text)' }}>{s.recipient}</b>
              {' '}· {s.all_years ? 'all years' : s.fiscal_year} summary
              {s.attached_pack ? ' with tax pack' : ''}
            </span>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={showAll}
          disabled={loading}
          style={{
            marginTop: 10, padding: 0, background: 'none', border: 0,
            color: 'var(--text-muted)', fontSize: 12, fontWeight: 500,
            cursor: loading ? 'default' : 'pointer', textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          {loading ? 'Loading…' : `Show all ${total} sends`}
        </button>
      )}
      {error && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: 'oklch(0.55 0.18 25)' }}>
          Couldn’t load the full history — try again.
        </div>
      )}
    </div>
  );
}

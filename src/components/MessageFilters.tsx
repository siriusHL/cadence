'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  basePath: string;
  /** Current query params to preserve (status, from, to, since, q). */
  params: Record<string, string | undefined>;
  /** Show the name/email search box (support board only). */
  showSearch?: boolean;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Date-range (+ optional name/email search) filter bar with quick presets.
 * Writes to the URL query string so the server page does the filtering;
 * preserves any other params already present (e.g. the status folder).
 */
export function MessageFilters({ basePath, params, showSearch }: Props) {
  const router = useRouter();

  function update(patch: Record<string, string | null>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  // Computed once on mount (kept out of the render body to stay pure).
  const [{ today, yesterday }] = useState(() => ({
    today: ymd(new Date()),
    yesterday: ymd(new Date(Date.now() - 864e5)),
  }));

  // Preset definitions + whether the current params match them (for active styling).
  const presets: { label: string; active: boolean; apply: () => void }[] = [
    {
      label: 'Today',
      active: params.from === today && params.to === today && !params.since,
      apply: () => update({ from: today, to: today, since: null }),
    },
    {
      label: 'Last 4h',
      active: Boolean(params.since),
      apply: () => update({ since: new Date(Date.now() - 4 * 3600e3).toISOString(), from: null, to: null }),
    },
    {
      label: 'Yesterday',
      active: params.from === yesterday && params.to === yesterday && !params.since,
      apply: () => update({ from: yesterday, to: yesterday, since: null }),
    },
  ];

  const hasFilters = Boolean(params.from || params.to || params.since || params.q);

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      {showSearch && (
        <input
          type="search"
          defaultValue={params.q ?? ''}
          placeholder="Search name or email…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') update({ q: (e.target as HTMLInputElement).value.trim() || null });
          }}
          onBlur={(e) => {
            const v = e.target.value.trim() || null;
            if (v !== (params.q ?? null)) update({ q: v });
          }}
          style={{ ...inputStyle, minWidth: 200 }}
        />
      )}

      {/* Quick presets */}
      <div style={{ display: 'inline-flex', gap: 6 }}>
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={p.apply}
            style={{
              ...chipStyle,
              fontWeight: p.active ? 600 : 500,
              color: p.active ? 'var(--btn-primary-text, #fff)' : 'var(--text-muted)',
              background: p.active ? 'var(--btn-primary-bg, #000)' : '#fff',
              borderColor: p.active ? 'var(--btn-primary-bg, #000)' : 'var(--border)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label style={labelStyle}>
        From
        <input
          type="date"
          value={params.from ?? ''}
          max={params.to || undefined}
          onChange={(e) => update({ from: e.target.value || null, since: null })}
          style={inputStyle}
        />
      </label>
      <label style={labelStyle}>
        To
        <input
          type="date"
          value={params.to ?? ''}
          min={params.from || undefined}
          onChange={(e) => update({ to: e.target.value || null, since: null })}
          style={inputStyle}
        />
      </label>

      {hasFilters && (
        <button
          type="button"
          onClick={() => update({ from: null, to: null, since: null, q: null })}
          style={{
            background: 'none', border: 'none', padding: 0,
            fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontSize: 12, color: 'var(--text-muted)',
};

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  color: 'var(--text)',
  background: '#fff',
  border: '1px solid var(--border-strong)',
  borderRadius: 8,
  outline: 'none',
  fontFamily: 'inherit',
};

const chipStyle: React.CSSProperties = {
  padding: '6px 11px',
  fontSize: 13,
  borderRadius: 999,
  background: '#fff',
  border: '1px solid var(--border)',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

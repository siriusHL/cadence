'use client';

import { useEffect, useState } from 'react';

interface Counts {
  total: number;
  negative: number;
}

/**
 * Tiny nav badge that fetches the user's active-alert count once on mount and
 * renders nothing while loading or when there are zero alerts. Coloured red
 * when any alert is negative/warning, neutral grey otherwise.
 *
 * Lives outside the server-rendered layout so it never blocks initial paint.
 */
export function AlertsBadge() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/alerts/count', { cache: 'no-store' });
        if (!r.ok) return;
        const json = (await r.json()) as Counts;
        if (!cancelled) setCounts(json);
      } catch {
        // Silent — the badge is non-essential UI; on failure it just stays
        // hidden so the user isn't bothered with an error in the nav.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!counts || counts.total === 0) return null;

  const tone: 'negative' | 'neutral' = counts.negative > 0 ? 'negative' : 'neutral';
  // Display a 9+ cap so the pill stays compact for portfolios with many alerts.
  const label = counts.total > 9 ? '9+' : String(counts.total);

  return (
    <span
      className={`cdn-tab-badge cdn-tab-badge--${tone}`}
      aria-label={`${counts.total} active alert${counts.total === 1 ? '' : 's'}`}
    >
      {label}
    </span>
  );
}

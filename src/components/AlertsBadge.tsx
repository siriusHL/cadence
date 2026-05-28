'use client';

import { useEffect, useState } from 'react';

interface Counts {
  total: number;
  negative: number;
}

/**
 * Tiny nav badge that fetches the user's active-alert count once on mount and
 * renders nothing while loading or when there are zero alerts. Always coloured
 * red so it reads as "needs attention" the moment any alert exists, regardless
 * of whether individual alerts inside are negative or informational — the nav
 * surface is a notification cue, not a triage summary.
 *
 * Lives outside the server-rendered layout so it never blocks initial paint.
 */
/**
 * Event the badge listens for to re-fetch its count. AlertRow dispatches it
 * after a successful snooze / mute / dismiss / restore so the nav stays in
 * sync with the list without a full page reload.
 */
export const ALERTS_CHANGED_EVENT = 'cadence:alerts-changed';

export function AlertsBadge() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch('/api/alerts/count', { cache: 'no-store' });
        if (!r.ok) return;
        const json = (await r.json()) as Counts;
        if (!cancelled) setCounts(json);
      } catch {
        // Silent — the badge is non-essential UI; on failure it just stays
        // hidden so the user isn't bothered with an error in the nav.
      }
    }

    load();
    window.addEventListener(ALERTS_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(ALERTS_CHANGED_EVENT, load);
    };
  }, []);

  if (!counts || counts.total === 0) return null;

  // Display a 9+ cap so the pill stays compact for portfolios with many alerts.
  const label = counts.total > 9 ? '9+' : String(counts.total);

  return (
    <span
      className="cdn-tab-badge cdn-tab-badge--negative"
      aria-label={`${counts.total} active alert${counts.total === 1 ? '' : 's'}`}
    >
      {label}
    </span>
  );
}

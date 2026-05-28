'use client';

import { useEffect, useState } from 'react';

/**
 * Event the unread-count subscribers listen for to re-fetch. The thread view
 * and composer dispatch it after marking messages read / posting, so every
 * badge stays in sync without a full reload. Mirrors ALERTS_CHANGED_EVENT.
 */
export const MESSAGES_CHANGED_EVENT = 'cadence:messages-changed';

/**
 * Shared hook backing every "unread support replies" badge (nav mail icon and
 * the avatar-dropdown entry). Fetches once on mount and again on the
 * changed-event. Fails silently — the badge is non-essential nav UI.
 */
export function useUnreadMessages(): number {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('/api/messages/unread-count', { cache: 'no-store' });
        if (!r.ok) return;
        const json = (await r.json()) as { total: number };
        if (!cancelled) setTotal(json.total);
      } catch {
        // Silent.
      }
    }
    load();
    window.addEventListener(MESSAGES_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(MESSAGES_CHANGED_EVENT, load);
    };
  }, []);

  return total;
}

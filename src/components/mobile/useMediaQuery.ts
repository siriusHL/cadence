'use client';

import { useSyncExternalStore } from 'react';

/**
 * Client-side media-query hook built on useSyncExternalStore. Returns the
 * server snapshot (false) during SSR and the live `matches` value on the
 * client. Avoids the react-hooks/set-state-in-effect lint rule that fires
 * on the older useState + useEffect pattern for subscribing to external
 * stores.
 *
 * Use case: rendering different JSX trees with shared stateful children
 * where you can't use the .cdn-mobile-only / .cdn-desktop-only CSS pattern
 * (because the children own non-trivial local state that you don't want
 * duplicated in two parallel trees).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Convenience hook matching the same ≤ 640px breakpoint as .cdn-mobile-only. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 640px)');
}

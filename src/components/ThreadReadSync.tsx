'use client';

import { useEffect } from 'react';
import { MESSAGES_CHANGED_EVENT } from './useUnreadMessages';

/**
 * Opening a thread marks its support replies read on the server. This pings the
 * nav badge to re-fetch so its count clears without a full reload.
 */
export function ThreadReadSync() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(MESSAGES_CHANGED_EVENT));
  }, []);
  return null;
}

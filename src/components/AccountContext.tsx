'use client';

// Shared user/account context published by the app layout so leaf
// components (notably the mobile shell's avatar dropdown) can pull
// email + tier without prop-drilling through every page → wrapper →
// MobileShell chain.
//
// The layout is a server component, so it stamps the values into the
// provider once and forgets — there's no client-side fetching, no
// `useEffect`, no flash of empty state.

import { createContext, useContext } from 'react';
import type { Tier } from '@/lib/tiers';

export interface AccountInfo {
  email: string;
  initials: string;
  tier: Tier;
}

const AccountCtx = createContext<AccountInfo | null>(null);

export function AccountProvider({
  value,
  children,
}: {
  value: AccountInfo;
  children: React.ReactNode;
}) {
  return <AccountCtx.Provider value={value}>{children}</AccountCtx.Provider>;
}

/** Returns the current account info, or null if rendered outside a
 *  provider (e.g. logged-out pages). Consumers must handle null. */
export function useAccount(): AccountInfo | null {
  return useContext(AccountCtx);
}

// Mobile Account shell — V2b chassis.
// Wraps the existing ProfileForm / SettingsForm / PortfolioManager client
// components in a mobile shell with the V2b pro-hero-mob header. Reusing the
// existing forms keeps mutation logic (state, API calls, dialogs) identical
// to desktop — only the surrounding chrome changes.
//
// The existing forms already render their content inside .pcard / .pcard-h
// elements, which pick up the .mob.v2b styling automatically. Layouts inside
// the form may not match templates/account-pages.jsx pixel-for-pixel, but
// the chrome (top bar, hero, tabs, drawer) does, and all mutations work.

import { MobileShell } from '@/components/mobile/MobileShell';

export interface AccountMobileProps {
  /** Hero h1. */
  title: string;
  /** Sub-paragraph under the h1. */
  sub: string;
  /** Which bottom tab to highlight. Account pages share the "more" tab. */
  currentTab?: 'more' | 'dashboard' | 'holdings' | 'dividends' | 'perf';
  portfolioName: string;
  avatarInitials: string;
  /** The page-specific content — usually one of the existing form components. */
  children: React.ReactNode;
}

export function AccountMobile({
  title,
  sub,
  currentTab = 'more',
  portfolioName,
  avatarInitials,
  children,
}: AccountMobileProps) {
  return (
    <MobileShell
      currentTab={currentTab}
      portfolioName={portfolioName}
      avatarInitials={avatarInitials}
      chassis="v2b"
    >
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 } as React.CSSProperties}>
        <div className="eyebrow">Account</div>
        <h1>{title}</h1>
        <div className="sub">{sub}</div>
      </div>

      {/* Slot — existing form components render here. Their .pcard /
          .pcard-h classes inherit the V2b chassis styling. */}
      <div className="cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
        {children}
      </div>

      <div style={{ height: 80 }} />
    </MobileShell>
  );
}

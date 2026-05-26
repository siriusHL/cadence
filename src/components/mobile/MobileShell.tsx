'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon, type MobileIconName } from '@/components/mobile/Icon';
import { AlertsBadge } from '@/components/AlertsBadge';
import { useAccount } from '@/components/AccountContext';
import { useToast } from '@/components/DialogProvider';

/**
 * Shared mobile chrome — wraps every page rendered inside `.cdn-mobile-only`.
 * Three parts:
 *   - TopBar with portfolio chip + alerts + avatar + hamburger
 *   - The scrollable content area (children)
 *   - BottomTabBar with 5 primary destinations
 *   - Single left-side Drawer that opens from EITHER the hamburger OR
 *     the avatar — one menu for navigation + account actions. Drawer
 *     contents: email/plan header (when account is available), nav
 *     groups (Premium/Elite/Account), then Billing/Feedback/Log out.
 *
 * All state lives here so individual pages just pass content + a `current`
 * tab key.
 */

interface BottomTab {
  id: string;
  label: string;
  icon: MobileIconName;
  href?: string;
}

/** Pro/Elite tier tab set — paid screens at the bottom. */
const PRO_BOTTOM_TABS: BottomTab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/app/dashboard' },
  { id: 'holdings',  label: 'Holdings',  icon: 'holdings',  href: '/app/holdings' },
  { id: 'dividends', label: 'Dividends', icon: 'dividends', href: '/app/dividends' },
  { id: 'perf',      label: 'Perf',      icon: 'perf',      href: '/app/performance' },
  { id: 'more',      label: 'More',      icon: 'more' /* opens drawer */ },
];

/** Free tier tab set — beginner-friendly destinations. */
const FREE_BOTTOM_TABS: BottomTab[] = [
  { id: 'home',   label: 'Home',      icon: 'dashboard', href: '/app/home' },
  { id: 'next',   label: 'Coming up', icon: 'dividends', href: '/app/next' },
  { id: 'stocks', label: 'Stocks',    icon: 'holdings',  href: '/app/stocks' },
  { id: 'year',   label: 'Year',      icon: 'perf',      href: '/app/year' },
  { id: 'more',   label: 'More',      icon: 'more' /* opens drawer */ },
];

interface DrawerGroup {
  h: string;
  items: { id: string; label: string; icon: MobileIconName; href: string }[];
}

const DRAWER_GROUPS: DrawerGroup[] = [
  {
    h: 'Premium',
    items: [
      { id: 'dashboard', label: 'Dashboard',       icon: 'dashboard',       href: '/app/dashboard' },
      { id: 'holdings',  label: 'Holdings',        icon: 'holdings',        href: '/app/holdings' },
      { id: 'dividends', label: 'Dividends',       icon: 'dividends',       href: '/app/dividends' },
      { id: 'perf',      label: 'Performance',     icon: 'perf',            href: '/app/performance' },
      { id: 'div',       label: 'Diversification', icon: 'diversification', href: '/app/diversification' },
    ],
  },
  {
    h: 'Elite',
    items: [
      { id: 'tax',    label: 'Tax',    icon: 'tax',    href: '/app/tax' },
      { id: 'alerts', label: 'Alerts', icon: 'alerts', href: '/app/alerts' },
    ],
  },
  {
    h: 'Account',
    items: [
      { id: 'portfolios', label: 'Portfolios', icon: 'holdings', href: '/app/portfolios' },
      { id: 'profile',    label: 'Profile',    icon: 'user',     href: '/app/profile' },
      { id: 'settings',   label: 'Settings',   icon: 'settings', href: '/app/settings' },
    ],
  },
];

export interface MobileShellProps {
  /** Which bottom tab is active. Falls back to nearest pathname match. */
  currentTab?: BottomTab['id'];
  /** Portfolio name shown in the top-bar chip. */
  portfolioName?: string;
  /** Initials for the avatar (defaults to "U"). */
  avatarInitials?: string;
  /** "compact" | "regular" | "comfy" — passed to `data-density` on `.mob`. */
  density?: 'compact' | 'regular' | 'comfy';
  /** Chassis variant. "v2b" = breathing layout used by every tier. */
  chassis?: 'default' | 'v2b';
  /** Which set of bottom tabs to render — Pro (default) or Free tier. */
  tabSet?: 'pro' | 'free';
  children: React.ReactNode;
}

export function MobileShell({
  currentTab,
  portfolioName = 'Main portfolio',
  avatarInitials = 'U',
  density = 'regular',
  chassis = 'default',
  tabSet = 'pro',
  children,
}: MobileShellProps) {
  const BOTTOM_TABS = tabSet === 'free' ? FREE_BOTTOM_TABS : PRO_BOTTOM_TABS;
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  // Account info comes from the app-layout-level provider. Drives the
  // email/plan header at the top of the drawer plus the Billing/Log out
  // items at the bottom. When missing, those sections are simply omitted
  // (the nav groups still render).
  const account = useAccount();
  const [billingBusy, setBillingBusy] = useState(false);

  // Drawer state is keyed to the pathname so navigation auto-closes it
  // without a setState-in-effect. Same derive-don't-synchronize pattern as
  // NavTabs — opening records the pathname; if pathname changes, the
  // derived `drawerOpen` flips to false on the next render.
  const [drawerState, setDrawerState] = useState<{ open: boolean; at: string }>(
    { open: false, at: '' },
  );
  const drawerOpen = drawerState.open && drawerState.at === pathname;
  const openDrawer = () => setDrawerState({ open: true, at: pathname });
  const closeDrawer = () => setDrawerState({ open: false, at: '' });

  // Stripe customer portal — same logic as the desktop UserMenu's billing
  // button. Free users go to the upgrade page instead.
  async function onBilling() {
    closeDrawer();
    if (!account || account.tier === 'free') {
      router.push('/upgrade');
      return;
    }
    setBillingBusy(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; redirect?: string };
        if (j.redirect) { router.push(j.redirect); return; }
        toast(`Couldn't open billing portal: ${j.error ?? res.statusText}`, 'error');
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url; // full nav — Stripe-hosted page
    } finally {
      setBillingBusy(false);
    }
  }

  const planLabel = !account
    ? ''
    : account.tier === 'free' ? 'Free plan'
    : account.tier === 'premium' ? '✦ Premium'
    : '✦ Elite';

  // Derive active tab from pathname if caller didn't provide one
  const activeTab = currentTab ?? (
    tabSet === 'free'
      ? (pathname.startsWith('/app/home')   ? 'home'
        : pathname.startsWith('/app/next')   ? 'next'
        : pathname.startsWith('/app/stocks') ? 'stocks'
        : pathname.startsWith('/app/year')   ? 'year'
        : 'more')
      : (pathname.startsWith('/app/dashboard')   ? 'dashboard'
        : pathname.startsWith('/app/holdings')   ? 'holdings'
        : pathname.startsWith('/app/dividends')  ? 'dividends'
        : pathname.startsWith('/app/performance') ? 'perf'
        : 'more')
  );

  return (
    <div
      className={'mob' + (chassis === 'v2b' ? ' v2b' : '')}
      data-density={density === 'regular' ? undefined : density}
    >
      {/* Top bar */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="icon-btn no-bg"
            onClick={openDrawer}
            aria-label="Menu"
          >
            <Icon name="menu" size={20} />
          </button>
          <Link href="/app/portfolios" className="portfolio-chip">
            <span className="dot" /> {portfolioName}
            <svg className="chev" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
          </Link>
        </div>
        <div className="actions">
          <Link
            href="/app/alerts"
            className="icon-btn no-bg"
            aria-label="Alerts"
            style={{ position: 'relative' }}
            onClick={() => router.refresh()}
          >
            <Icon name="bell" size={18} />
            <span
              style={{
                position: 'absolute', top: 4, right: 4,
                display: 'inline-flex',
              }}
            >
              <AlertsBadge />
            </span>
          </Link>
          {/* Avatar opens the same drawer as the hamburger — one menu for
              navigation + account actions, no left-vs-right split. */}
          {account ? (
            <button
              type="button"
              className="avatar"
              onClick={openDrawer}
              aria-label="Account menu"
              aria-expanded={drawerOpen}
              title={account.email || 'Account'}
              style={{ border: 0, padding: 0, cursor: 'pointer' }}
            >
              {account.initials || avatarInitials}
            </button>
          ) : (
            <Link href="/app/profile" className="avatar" title="Profile">{avatarInitials}</Link>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="scroll">{children}</div>

      {/* Bottom tab bar */}
      <nav className="tabbar" aria-label="Primary">
        {BOTTOM_TABS.map((t) => {
          const isActive = activeTab === t.id;
          const className = 'tab' + (isActive ? ' is-active' : '');
          const body = (
            <>
              <span className="ico"><Icon name={t.icon} size={22} /></span>
              <span>{t.label}</span>
            </>
          );
          if (t.id === 'more') {
            return (
              <button
                key={t.id}
                type="button"
                className={className}
                onClick={openDrawer}
                aria-label="Open menu"
                style={{ background: 'transparent', border: 0, font: 'inherit' }}
              >
                {body}
              </button>
            );
          }
          return (
            <Link
              key={t.id}
              href={t.href!}
              className={className}
              aria-current={isActive ? 'page' : undefined}
            >
              {body}
            </Link>
          );
        })}
      </nav>

      {/* Drawer — single menu, opens from the left for both the hamburger
          and the avatar. Combines navigation + account actions. */}
      <div
        className={'drawer-scrim' + (drawerOpen ? ' open' : '')}
        onClick={closeDrawer}
        aria-hidden
      />
      <aside
        className={'drawer' + (drawerOpen ? ' open' : '')}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="brand"><span className="dot" /> Cadence</div>

        {/* Account header — shown when the layout provider has user info. */}
        {account && (
          <div className="acct-head">
            <div className="email">{account.email || 'Account'}</div>
            <div
              className={
                'plan' +
                (account.tier === 'premium' ? ' pro' : account.tier === 'elite' ? ' elite' : '')
              }
            >
              {planLabel}
            </div>
          </div>
        )}

        {DRAWER_GROUPS.map((g) => (
          <div key={g.h}>
            <div className="group-h">{g.h}</div>
            {g.items.map((it) => {
              const isActive = pathname === it.href || pathname.startsWith(it.href + '/');
              return (
                <Link
                  key={it.id}
                  href={it.href}
                  className={'navitem' + (isActive ? ' is-active' : '')}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={closeDrawer}
                >
                  <span className="ico"><Icon name={it.icon} size={18} /></span>
                  {it.label}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Account actions — only when we have a logged-in user. Sits below
            the nav groups so the navigation is the primary hierarchy. */}
        {account && (
          <>
            <button
              type="button"
              className="navitem"
              onClick={onBilling}
              disabled={billingBusy}
              style={{
                background: 'transparent',
                border: 0,
                width: '100%',
                textAlign: 'left',
                font: 'inherit',
              }}
            >
              <span className="ico"><Icon name="card" size={18} /></span>
              {account.tier === 'free' ? 'Upgrade plan' : 'Billing'}
            </button>
            <a
              href="mailto:feedback@cadence.app?subject=Cadence%20feedback"
              className="navitem"
              onClick={closeDrawer}
            >
              <span className="ico"><Icon name="feedback" size={18} /></span>
              Send feedback
            </a>

            {/* Log out — real form POST so the cookie clear lands before nav. */}
            <form action="/api/auth/logout" method="post" style={{ marginTop: 'auto' }}>
              <button
                type="submit"
                className="navitem danger"
                style={{
                  background: 'transparent',
                  border: 0,
                  width: '100%',
                  textAlign: 'left',
                  font: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <span className="ico"><Icon name="logout" size={18} /></span>
                Log out
              </button>
            </form>
          </>
        )}
      </aside>
    </div>
  );
}

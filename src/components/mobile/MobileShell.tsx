'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon, type MobileIconName } from '@/components/mobile/Icon';
import { AlertsBadge } from '@/components/AlertsBadge';

/**
 * Shared mobile chrome — wraps every page rendered inside `.cdn-mobile-only`.
 * Three parts:
 *   - TopBar with portfolio chip + alerts + avatar + hamburger
 *   - The scrollable content area (children)
 *   - BottomTabBar with 5 primary destinations
 *   - Drawer that opens from the hamburger
 *
 * All state lives here so individual pages just pass content + a `current`
 * tab key. The pattern matches templates/dashboard-mobile.jsx V1Standard.
 */

interface BottomTab {
  id: string;
  label: string;
  icon: MobileIconName;
  href?: string;
}

const BOTTOM_TABS: BottomTab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/app/dashboard' },
  { id: 'holdings',  label: 'Holdings',  icon: 'holdings',  href: '/app/holdings' },
  { id: 'dividends', label: 'Dividends', icon: 'dividends', href: '/app/dividends' },
  { id: 'perf',      label: 'Perf',      icon: 'perf',      href: '/app/performance' },
  { id: 'more',      label: 'More',      icon: 'more' /* opens drawer */ },
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
  children: React.ReactNode;
}

export function MobileShell({
  currentTab,
  portfolioName = 'Main portfolio',
  avatarInitials = 'U',
  density = 'regular',
  chassis = 'default',
  children,
}: MobileShellProps) {
  const pathname = usePathname();
  const router = useRouter();

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

  // Derive active tab from pathname if caller didn't provide one
  const activeTab = currentTab ?? (
    pathname.startsWith('/app/dashboard') ? 'dashboard'
    : pathname.startsWith('/app/holdings') ? 'holdings'
    : pathname.startsWith('/app/dividends') ? 'dividends'
    : pathname.startsWith('/app/performance') ? 'perf'
    : 'more'
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
          <Link href="/app/profile" className="avatar" title="Profile">{avatarInitials}</Link>
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

      {/* Drawer */}
      <div
        className={'drawer-scrim' + (drawerOpen ? ' open' : '')}
        onClick={closeDrawer}
        aria-hidden
      />
      <aside
        className={'drawer' + (drawerOpen ? ' open' : '')}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <div className="brand"><span className="dot" /> Cadence</div>
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
                >
                  <span className="ico"><Icon name={it.icon} size={18} /></span>
                  {it.label}
                </Link>
              );
            })}
          </div>
        ))}
        <div className="plan-foot">
          <Link
            href="/app/profile"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Account</div>
            <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>View profile →</div>
          </Link>
        </div>
      </aside>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertsBadge } from '@/components/AlertsBadge';

export interface NavTab {
  label: string;
  href: string;
}

interface Props {
  tabs: NavTab[];
}

export function NavTabs({ tabs }: Props) {
  const pathname = usePathname();

  return (
    <nav className="cdn-tabs">
      {tabs.map((t) => {
        const active = isActive(pathname, t.href);
        const isAlerts = t.href === '/app/alerts';
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              'cdn-tab'
              + (active ? ' is-active' : '')
              + (isAlerts ? ' has-badge' : '')
            }
            aria-current={active ? 'page' : undefined}
          >
            <span className="label">{t.label}</span>
            {isAlerts && <AlertsBadge />}
          </Link>
        );
      })}
    </nav>
  );
}

/** Active if the path matches exactly OR is a descendant of the tab's href. */
function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(href + '/');
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/subscriptions', label: 'Subscriptions' },
  { href: '/admin/instruments', label: 'Instruments' },
  { href: '/admin/insights', label: 'Insights' },
  { href: '/admin/settings', label: 'Site settings' },
  { href: '/admin/audit', label: 'Audit log' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="adm-nav">
      {LINKS.map((l) => {
        const active =
          l.href === '/admin'
            ? pathname === '/admin'
            : pathname === l.href || pathname.startsWith(l.href + '/');
        return (
          <Link key={l.href} href={l.href} className={active ? 'is-active' : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

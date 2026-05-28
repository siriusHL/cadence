'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUnreadMessages } from './useUnreadMessages';

/**
 * Standalone envelope icon in the top nav (right cluster, beside the avatar)
 * that links to the support inbox and overlays a red count of unread support
 * replies — same notification cue as the Alerts badge.
 */
export function MailNavIcon() {
  const router = useRouter();
  const pathname = usePathname();
  const total = useUnreadMessages();
  const active = pathname === '/app/messages' || pathname.startsWith('/app/messages/');

  const label = total > 9 ? '9+' : String(total);

  return (
    <Link
      href="/app/messages"
      aria-label={total > 0 ? `Messages — ${total} unread` : 'Messages'}
      title="Messages"
      // Invalidate the router cache so the inbox re-renders fresh on click.
      onClick={() => router.refresh()}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 8,
        color: active ? 'var(--text)' : 'var(--text-muted)',
        transition: 'color 120ms, background 120ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = active ? 'var(--text)' : 'var(--text-muted)'; }}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3.5 7l8.5 6 8.5-6" />
      </svg>
      {total > 0 && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            background: 'var(--danger, oklch(0.50 0.16 25))',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            boxShadow: '0 0 0 2px var(--surface)',
          }}
        >
          {label}
        </span>
      )}
    </Link>
  );
}

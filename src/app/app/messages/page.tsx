import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { getSupabaseServer } from '@/lib/supabase/server';
import { NewMessagePanel } from '@/components/NewMessagePanel';
import { StatusBadge } from '@/components/StatusBadge';
import { MessageFilters } from '@/components/MessageFilters';
import { inDateRange, buildListHref } from '@/lib/threadFilters';

interface ThreadRow {
  id: string;
  subject: string;
  status: 'open' | 'closed';
  last_message_at: string;
  last_sender: 'user' | 'support';
  created_at: string;
}

type Filter = 'all' | 'open' | 'closed';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'open',   label: 'Open' },
  { key: 'closed', label: 'Closed' },
];

export default async function MessagesScreen({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string; since?: string }>;
}) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { status, from, to, since } = await searchParams;
  const active: Filter = FILTERS.some((f) => f.key === status) ? (status as Filter) : 'all';

  const { data: threads } = await supabase
    .from('message_threads')
    .select('id, subject, status, last_message_at, last_sender, created_at')
    .eq('user_id', user!.id)
    .order('last_message_at', { ascending: false });
  const rawAll = (threads ?? []) as ThreadRow[];
  // Date range narrows the working set; counts + list both reflect it.
  const all = rawAll.filter((t) => inDateRange(t.last_message_at, { from, to, since }));

  // Unread support replies → bold row + dot.
  const { data: unreadRows } = await supabase
    .from('messages')
    .select('thread_id')
    .eq('sender', 'support')
    .is('read_by_user_at', null);
  const unreadThreadIds = new Set((unreadRows ?? []).map((r) => r.thread_id as string));

  // Latest message body per thread → inbox preview snippet.
  const preview = new Map<string, { body: string; sender: 'user' | 'support' }>();
  if (all.length) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('thread_id, body, sender, created_at')
      .in('thread_id', all.map((t) => t.id))
      .order('created_at', { ascending: false });
    for (const m of msgs ?? []) {
      if (!preview.has(m.thread_id as string)) {
        preview.set(m.thread_id as string, {
          body: m.body as string,
          sender: m.sender as 'user' | 'support',
        });
      }
    }
  }

  const counts: Record<Filter, number> = {
    all:    all.length,
    open:   all.filter((t) => t.status === 'open').length,
    closed: all.filter((t) => t.status === 'closed').length,
  };
  const list = all.filter((t) => (active === 'all' ? true : t.status === active));

  return (
    <div className="cdn-pro">
      <div className="pro-hero" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div className="eyebrow">Support</div>
          <h1>Messages</h1>
          <div className="sub">
            Reach out to the Cadence team — questions, bug reports, anything.
            Replies land here and in your email.
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <NewMessagePanel />

        {rawAll.length > 0 && (
          <MessageFilters
            basePath="/app/messages"
            params={{ status: active === 'all' ? undefined : active, from, to, since }}
          />
        )}

        {/* Folders */}
        {rawAll.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => {
              const isActive = f.key === active;
              return (
                <Link
                  key={f.key}
                  href={buildListHref('/app/messages', { status: f.key === 'all' ? undefined : f.key, from, to, since })}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 11px', borderRadius: 999, fontSize: 13,
                    fontWeight: isActive ? 600 : 500, textDecoration: 'none',
                    color: isActive ? 'var(--text)' : 'var(--text-muted)',
                    background: isActive ? 'var(--surface)' : 'transparent',
                    border: '1px solid ' + (isActive ? 'var(--border-strong)' : 'var(--border)'),
                  }}
                >
                  {f.label}
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {counts[f.key]}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Inbox */}
        {rawAll.length === 0 ? (
          <div style={emptyStyle}>No conversations yet. Start one with “New message”.</div>
        ) : list.length === 0 ? (
          <div style={emptyStyle}>No conversations match your filters.</div>
        ) : (
          <div style={{
            background: 'var(--surface)',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,.03), 0 1px 3px rgba(0,0,0,.02)',
          }}>
            {list.map((t, i) => {
              const unread = unreadThreadIds.has(t.id);
              const snip = preview.get(t.id);
              const snippet = snip
                ? (snip.sender === 'user' ? 'You: ' : '') + snip.body.replace(/\s+/g, ' ').trim()
                : '';
              return (
                <Link
                  key={t.id}
                  href={`/app/messages/${t.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '13px 16px',
                    textDecoration: 'none',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    background: unread ? 'var(--surface-2)' : 'transparent',
                  }}
                >
                  {/* Cadence support avatar — brand dot mark (matches the nav logo) */}
                  <span
                    aria-label="Cadence support"
                    title="Cadence support"
                    style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: 'oklch(0.92 0.05 175)',
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'oklch(0.55 0.10 175)' }} />
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: unread ? 700 : 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {t.subject}
                    </div>
                    <div style={{
                      fontSize: 12.5,
                      color: unread ? 'var(--text)' : 'var(--text-muted)',
                      marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {snippet || (t.last_sender === 'support' ? 'Support replied' : 'You')}
                    </div>
                  </div>

                  {/* Right rail: timestamp over status badge, right-aligned */}
                  <div style={{
                    flexShrink: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-end', gap: 6,
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {unread && (
                        <span aria-label="Unread" style={{
                          width: 8, height: 8, borderRadius: '50%', background: 'oklch(0.50 0.16 25)',
                        }} />
                      )}
                      {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                    </span>
                    <StatusBadge kind={t.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const emptyStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-muted)',
  padding: '16px 4px',
};

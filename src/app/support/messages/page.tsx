import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { requireSupportPage } from '@/lib/roles';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { StatusBadge } from '@/components/StatusBadge';
import { TierBadge } from '@/components/TierBadge';
import { MessageFilters } from '@/components/MessageFilters';
import { inDateRange, buildListHref } from '@/lib/threadFilters';
import { type Tier } from '@/lib/tiers';

// Higher = higher support priority. Elite customers float to the top of the board.
const TIER_RANK: Record<Tier, number> = { elite: 3, premium: 2, free: 1 };

export const dynamic = 'force-dynamic';

interface ThreadRow {
  id: string;
  user_id: string;
  subject: string;
  status: 'open' | 'closed';
  last_message_at: string;
  last_sender: 'user' | 'support';
}

type Filter = 'all' | 'open' | 'awaiting' | 'closed';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'open',     label: 'Open' },
  { key: 'awaiting', label: 'Awaiting reply' },
  { key: 'closed',   label: 'Closed' },
];

export default async function SupportMessagesScreen({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string; since?: string; q?: string }>;
}) {
  await requireSupportPage();
  const { status, from, to, since, q: rawQ } = await searchParams;
  const active: Filter = FILTERS.some((f) => f.key === status) ? (status as Filter) : 'all';
  const q = (rawQ ?? '').trim();
  const admin = supabaseAdmin();

  const { data: threads } = await admin
    .from('message_threads')
    .select('id, user_id, subject, status, last_message_at, last_sender')
    .order('last_message_at', { ascending: false });
  const all = (threads ?? []) as ThreadRow[];

  // Threads awaiting a support reply: an unread user message exists.
  const { data: unreadRows } = await admin
    .from('messages')
    .select('thread_id')
    .eq('sender', 'user')
    .is('read_by_support_at', null);
  const awaitingIds = new Set((unreadRows ?? []).map((r) => r.thread_id as string));

  // Resolve each owner's display name + email. Both are needed: the name (or
  // email) is shown, and the search box matches against either.
  const userIds = [...new Set(all.map((t) => t.user_id))];
  const labels = new Map<string, string>();
  const searchText = new Map<string, string>();
  const tiers = new Map<string, Tier>();
  if (userIds.length) {
    const { data: subs } = await admin
      .from('subscriptions')
      .select('user_id, tier')
      .in('user_id', userIds);
    for (const s of subs ?? []) tiers.set(s.user_id as string, (s.tier ?? 'free') as Tier);

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);
    const names = new Map<string, string>();
    for (const p of profiles ?? []) {
      if (p.display_name) names.set(p.id as string, p.display_name as string);
    }
    const emails = new Map<string, string>();
    await Promise.all(
      userIds.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        if (data?.user?.email) emails.set(id, data.user.email);
      }),
    );
    for (const id of userIds) {
      const name = names.get(id);
      const email = emails.get(id);
      labels.set(id, name ?? email ?? 'Unknown user');
      searchText.set(id, `${name ?? ''} ${email ?? ''}`.toLowerCase());
    }
  }

  // Date range + name/email search narrow the working set; counts + list reflect it.
  const qLower = q.toLowerCase();
  const scoped = all.filter(
    (t) =>
      inDateRange(t.last_message_at, { from, to, since }) &&
      (!qLower || (searchText.get(t.user_id) ?? '').includes(qLower)),
  );

  const counts: Record<Filter, number> = {
    all:      scoped.length,
    open:     scoped.filter((t) => t.status === 'open').length,
    awaiting: scoped.filter((t) => awaitingIds.has(t.id)).length,
    closed:   scoped.filter((t) => t.status === 'closed').length,
  };

  const tierOf = (id: string): Tier => tiers.get(id) ?? 'free';
  const visible = scoped
    .filter((t) => {
      if (active === 'open')     return t.status === 'open';
      if (active === 'closed')   return t.status === 'closed';
      if (active === 'awaiting') return awaitingIds.has(t.id);
      return true;
    })
    // Prioritise by plan (Elite → Premium → Free), then most-recent first.
    .sort((a, b) => {
      const rankDiff = TIER_RANK[tierOf(b.user_id)] - TIER_RANK[tierOf(a.user_id)];
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Support board</div>
          <h1>Customer messages</h1>
          <div className="sub">
            {all.length === 0
              ? 'No conversations yet.'
              : `${scoped.length} of ${all.length} conversation${all.length === 1 ? '' : 's'} · ${counts.awaiting} awaiting reply`}
          </div>
        </div>
      </div>

      {/* Date range + name/email search */}
      <div style={{ marginBottom: 14 }}>
        <MessageFilters
          basePath="/support/messages"
          params={{ status: active === 'all' ? undefined : active, from, to, since, q: q || undefined }}
          showSearch
        />
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {FILTERS.map((f) => {
          const isActive = f.key === active;
          return (
            <Link
              key={f.key}
              href={buildListHref('/support/messages', { status: f.key === 'all' ? undefined : f.key, from, to, since, q: q || undefined })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none',
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                background: isActive ? 'var(--surface)' : 'transparent',
                border: '1px solid ' + (isActive ? 'var(--border-strong)' : 'var(--border)'),
              }}
            >
              {f.label}
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {counts[f.key]}
              </span>
            </Link>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 820 }}>
        {visible.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 4px' }}>
            No conversations in this view.
          </div>
        )}
        {visible.map((t) => {
          const awaiting = awaitingIds.has(t.id);
          return (
            <Link
              key={t.id}
              href={`/support/messages/${t.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                background: 'var(--surface)',
                borderRadius: 12,
                textDecoration: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,.03), 0 1px 3px rgba(0,0,0,.02)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: awaiting ? 700 : 600,
                  color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {t.subject}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {labels.get(t.user_id) ?? 'Unknown user'} ·{' '}
                  {t.last_sender === 'support' ? 'You replied' : 'Customer'} ·{' '}
                  {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <TierBadge tier={tierOf(t.user_id)} />
                <StatusBadge kind={awaiting ? 'awaiting' : t.status} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

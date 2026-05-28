import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { getSupabaseServer } from '@/lib/supabase/server';
import { MessageComposer } from '@/components/MessageComposer';

interface ThreadRow {
  id: string;
  subject: string;
  status: 'open' | 'closed';
  last_message_at: string;
  last_sender: 'user' | 'support';
  created_at: string;
}

export default async function MessagesScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: threads } = await supabase
    .from('message_threads')
    .select('id, subject, status, last_message_at, last_sender, created_at')
    .eq('user_id', user!.id)
    .order('last_message_at', { ascending: false });

  // Which threads have an unread support reply — for the per-row dot.
  const { data: unreadRows } = await supabase
    .from('messages')
    .select('thread_id')
    .eq('sender', 'support')
    .is('read_by_user_at', null);
  const unreadThreadIds = new Set((unreadRows ?? []).map((r) => r.thread_id as string));

  const list = (threads ?? []) as ThreadRow[];

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Support</div>
          <h1>Messages</h1>
          <div className="sub">
            Reach out to the Cadence team — questions, bug reports, anything.
            Replies land here and in your email.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
        <section>
          <h2 style={sectionTitle}>New message</h2>
          <MessageComposer mode="new" />
        </section>

        <section>
          <h2 style={sectionTitle}>Your conversations</h2>
          {list.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--text-muted)', padding: '8px 2px' }}>
              No conversations yet. Send your first message above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.map((t) => {
                const unread = unreadThreadIds.has(t.id);
                return (
                  <Link
                    key={t.id}
                    href={`/app/messages/${t.id}`}
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
                    <span
                      aria-hidden
                      style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: unread ? 'oklch(0.50 0.16 25)' : 'transparent',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: unread ? 700 : 600,
                        color: 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {t.subject}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {t.last_sender === 'support' ? 'Support replied' : 'You'} ·{' '}
                        {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                      </div>
                    </div>
                    {t.status === 'closed' && (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Closed</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  margin: '0 0 10px',
};

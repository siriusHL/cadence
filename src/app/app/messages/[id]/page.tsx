import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getSupabaseServer } from '@/lib/supabase/server';
import { MessageComposer } from '@/components/MessageComposer';
import { ThreadReadSync } from '@/components/ThreadReadSync';

interface MessageRow {
  id: string;
  sender: 'user' | 'support';
  body: string;
  created_at: string;
}

export default async function ThreadScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServer();

  const { data: thread } = await supabase
    .from('message_threads')
    .select('id, subject, status, created_at')
    .eq('id', id)
    .maybeSingle();
  if (!thread) notFound();

  const { data: messages } = await supabase
    .from('messages')
    .select('id, sender, body, created_at')
    .eq('thread_id', id)
    .order('created_at', { ascending: true });

  // Mark support replies read now that the thread is open.
  await supabase
    .from('messages')
    .update({ read_by_user_at: new Date().toISOString() })
    .eq('thread_id', id)
    .eq('sender', 'support')
    .is('read_by_user_at', null);

  const list = (messages ?? []) as MessageRow[];

  return (
    <div className="cdn-pro">
      <ThreadReadSync />
      <div className="pro-hero">
        <div>
          <div className="eyebrow">
            <Link href="/app/messages" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              ← Messages
            </Link>
          </div>
          <h1>{thread.subject}</h1>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((m) => {
            const fromSupport = m.sender === 'support';
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: fromSupport ? 'flex-start' : 'flex-end',
                  maxWidth: '80%',
                  background: fromSupport ? 'var(--surface)' : 'oklch(0.94 0.04 175)',
                  color: 'var(--text)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  boxShadow: '0 1px 2px rgba(0,0,0,.03)',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {fromSupport ? 'Support' : 'You'} · {format(new Date(m.created_at), 'd MMM, HH:mm')}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {m.body}
                </div>
              </div>
            );
          })}
        </div>

        {thread.status === 'closed' ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>
            This conversation is closed. Start a new message if you need more help.
          </div>
        ) : (
          <MessageComposer mode="reply" threadId={id} />
        )}
      </div>
    </div>
  );
}

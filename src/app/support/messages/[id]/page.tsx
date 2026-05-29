import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { requireSupportPage } from '@/lib/roles';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SupportReplyComposer } from '@/components/SupportReplyComposer';

export const dynamic = 'force-dynamic';

interface MessageRow {
  id: string;
  sender: 'user' | 'support';
  body: string;
  created_at: string;
}

export default async function SupportThreadScreen({ params }: { params: Promise<{ id: string }> }) {
  await requireSupportPage();
  const { id } = await params;
  const admin = supabaseAdmin();

  const { data: thread } = await admin
    .from('message_threads')
    .select('id, user_id, subject, status, created_at')
    .eq('id', id)
    .maybeSingle();
  if (!thread) notFound();

  const { data: messages } = await admin
    .from('messages')
    .select('id, sender, body, created_at')
    .eq('thread_id', id)
    .order('created_at', { ascending: true });
  const list = (messages ?? []) as MessageRow[];

  // Mark the customer's messages as seen by support now that we've opened it.
  await admin
    .from('messages')
    .update({ read_by_support_at: new Date().toISOString() })
    .eq('thread_id', id)
    .eq('sender', 'user')
    .is('read_by_support_at', null);

  // Owner label: display_name, else auth email.
  const { data: profile } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', thread.user_id)
    .maybeSingle();
  let owner = profile?.display_name as string | undefined;
  if (!owner) {
    const { data } = await admin.auth.admin.getUserById(thread.user_id);
    owner = data?.user?.email ?? 'Unknown user';
  }

  const closed = thread.status === 'closed';

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">
            <Link href="/support/messages" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              ← Support board
            </Link>
          </div>
          <h1>{thread.subject}</h1>
          <div className="sub">{owner}</div>
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
                  alignSelf: fromSupport ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  background: fromSupport ? 'oklch(0.94 0.04 175)' : 'var(--surface)',
                  color: 'var(--text)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  boxShadow: '0 1px 2px rgba(0,0,0,.03)',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {fromSupport ? 'You (Support)' : owner} · {format(new Date(m.created_at), 'd MMM, HH:mm')}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {m.body}
                </div>
              </div>
            );
          })}
        </div>

        <SupportReplyComposer threadId={id} closed={closed} />
      </div>
    </div>
  );
}

import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

/**
 * GET /api/messages/:id
 * Returns a single thread with its full message history (oldest first) and
 * marks any unread support replies as read by the user.
 */
export const GET = withAuth<{ id: string }>({}, async ({ params }) => {
  const supabase = await getSupabaseServer();

  const { data: thread } = await supabase
    .from('message_threads')
    .select('id, subject, status, last_message_at, last_sender, created_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!thread) return json({ error: 'not_found' }, 404);

  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, sender, body, created_at, read_by_user_at')
    .eq('thread_id', params.id)
    .order('created_at', { ascending: true });
  if (error) return json({ error: error.message }, 500);

  // Mark support replies read now that the user is viewing the thread.
  await supabase
    .from('messages')
    .update({ read_by_user_at: new Date().toISOString() })
    .eq('thread_id', params.id)
    .eq('sender', 'support')
    .is('read_by_user_at', null);

  return json({ thread, messages: messages ?? [] });
});

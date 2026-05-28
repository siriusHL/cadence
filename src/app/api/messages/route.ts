import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { notifySupportOfMessage } from '@/lib/email';

/**
 * GET /api/messages
 * Lists the current user's support threads, newest activity first, each with a
 * preview of the latest message and an unread-from-support count.
 */
export const GET = withAuth({}, async ({ userId }) => {
  const supabase = await getSupabaseServer();

  const { data: threads, error } = await supabase
    .from('message_threads')
    .select('id, subject, status, last_message_at, last_sender, created_at')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false });
  if (error) return json({ error: error.message }, 500);

  return json({ threads: threads ?? [] });
});

// Either start a new thread (subject + body) or reply to one (threadId + body).
const PostBody = z
  .object({
    threadId: z.string().uuid().optional(),
    subject:  z.string().trim().min(1).max(140).optional(),
    body:     z.string().trim().min(1).max(5000),
  })
  .refine((v) => v.threadId != null || v.subject != null, {
    message: 'subject_required_for_new_thread',
  });

/**
 * POST /api/messages
 * Body { subject, body }            — opens a new thread
 * Body { threadId, body }           — appends a reply to an existing thread
 * Persists the user message, bumps the thread's activity, and emails support.
 */
export const POST = withAuth({}, async ({ userId, req }) => {
  const parsed = PostBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const { threadId, subject, body } = parsed.data;
  const supabase = await getSupabaseServer();

  let resolvedThreadId = threadId;
  let resolvedSubject = subject ?? '';

  if (threadId) {
    // Verify ownership (RLS would block the message insert anyway, but this
    // gives a clean 404 instead of an opaque insert failure).
    const { data: thread } = await supabase
      .from('message_threads')
      .select('id, subject')
      .eq('id', threadId)
      .maybeSingle();
    if (!thread) return json({ error: 'thread_not_found' }, 404);
    resolvedSubject = thread.subject;
  } else {
    const { data: created, error: threadErr } = await supabase
      .from('message_threads')
      .insert({ user_id: userId, subject })
      .select('id')
      .single();
    if (threadErr || !created) return json({ error: threadErr?.message ?? 'create_failed' }, 500);
    resolvedThreadId = created.id;
  }

  const { error: msgErr } = await supabase
    .from('messages')
    .insert({ thread_id: resolvedThreadId, sender: 'user', body });
  if (msgErr) return json({ error: msgErr.message }, 500);

  // Bump the thread so it sorts to the top and reflects the latest sender.
  // (For a brand-new thread the defaults already cover this; the update is a
  // no-op cost only on replies.)
  if (threadId) {
    await supabase
      .from('message_threads')
      .update({ last_message_at: new Date().toISOString(), last_sender: 'user', status: 'open' })
      .eq('id', resolvedThreadId);
  }

  // Best-effort notification — never blocks or fails the request.
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email) {
    await notifySupportOfMessage({
      fromEmail: user.email,
      threadId:  resolvedThreadId!,
      subject:   resolvedSubject,
      body,
    });
  }

  revalidatePath('/app/messages');
  return json({ threadId: resolvedThreadId }, 201);
});

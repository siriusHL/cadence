import { z } from 'zod';
import { requireSupportApi } from '@/lib/roles';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notifyUserOfReply } from '@/lib/email';
import { json } from '@/lib/auth';

/**
 * POST /api/support/messages/:id/reply — staff reply from the support board.
 *
 * Session-authenticated counterpart to the bearer-token /api/messages/:id/reply
 * endpoint. Gated on the caller's 'support'/'admin' role, then writes with the
 * service-role client (also needed to look up the customer's email for the
 * notification), reopening the thread.
 */
export const runtime = 'nodejs';

const Body = z.object({ body: z.string().trim().min(1).max(5000) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSupportApi();
  if ('error' in gate) return gate.error;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  const { id: threadId } = await ctx.params;
  const admin = supabaseAdmin();

  const { data: thread } = await admin
    .from('message_threads')
    .select('id, user_id, subject')
    .eq('id', threadId)
    .maybeSingle();
  if (!thread) return json({ error: 'thread_not_found' }, 404);

  const { error: msgErr } = await admin
    .from('messages')
    .insert({ thread_id: threadId, sender: 'support', body: parsed.data.body });
  if (msgErr) return json({ error: msgErr.message }, 500);

  await admin
    .from('message_threads')
    .update({ last_message_at: new Date().toISOString(), last_sender: 'support', status: 'open' })
    .eq('id', threadId);

  const { data: userRes } = await admin.auth.admin.getUserById(thread.user_id);
  if (userRes?.user?.email) {
    await notifyUserOfReply({
      toEmail: userRes.user.email,
      subject: thread.subject,
      body:    parsed.data.body,
    });
  }

  return json({ ok: true });
}

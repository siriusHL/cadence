import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notifyUserOfReply } from '@/lib/email';

/**
 * POST /api/messages/:id/reply  — support-side reply (Option A: admin endpoint).
 *
 * Not a user-facing route: authenticated with `Authorization: Bearer
 * <SUPPORT_ADMIN_SECRET>` and writes with the service-role client so it can
 * insert sender='support' (which RLS forbids for normal users). A support agent
 * calls this from a script/tool; the user then sees the reply in their inbox
 * and gets an email.
 *
 * Body: { body: string }
 */
export const runtime = 'nodejs';

const Body = z.object({ body: z.string().trim().min(1).max(5000) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const expected = process.env.SUPPORT_ADMIN_SECRET;
  if (!expected) {
    return Response.json({ error: 'SUPPORT_ADMIN_SECRET not configured' }, { status: 500 });
  }
  if ((req.headers.get('authorization') ?? '') !== `Bearer ${expected}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  }

  const { id: threadId } = await ctx.params;
  const admin = supabaseAdmin();

  const { data: thread } = await admin
    .from('message_threads')
    .select('id, user_id, subject')
    .eq('id', threadId)
    .maybeSingle();
  if (!thread) return Response.json({ error: 'thread_not_found' }, { status: 404 });

  const { error: msgErr } = await admin
    .from('messages')
    .insert({ thread_id: threadId, sender: 'support', body: parsed.data.body });
  if (msgErr) return Response.json({ error: msgErr.message }, { status: 500 });

  await admin
    .from('message_threads')
    .update({ last_message_at: new Date().toISOString(), last_sender: 'support', status: 'open' })
    .eq('id', threadId);

  // Notify the user by email (best-effort).
  const { data: userRes } = await admin.auth.admin.getUserById(thread.user_id);
  if (userRes?.user?.email) {
    await notifyUserOfReply({
      toEmail: userRes.user.email,
      subject: thread.subject,
      body:    parsed.data.body,
    });
  }

  return Response.json({ ok: true });
}

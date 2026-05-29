import { z } from 'zod';
import { requireSupportApi } from '@/lib/roles';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { json } from '@/lib/auth';

/**
 * PATCH /api/support/messages/:id — staff updates a thread's status (open/closed).
 * Service-role write, gated on the caller's 'support'/'admin' role.
 */
export const runtime = 'nodejs';

const Body = z.object({ status: z.enum(['open', 'closed']) });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSupportApi();
  if ('error' in gate) return gate.error;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  const { id: threadId } = await ctx.params;
  const admin = supabaseAdmin();

  const { error } = await admin
    .from('message_threads')
    .update({ status: parsed.data.status })
    .eq('id', threadId);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
}

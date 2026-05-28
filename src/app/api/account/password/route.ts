import { z } from 'zod';
import { withAuth, json, verifyPassword } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

const Body = z.object({
  current_password: z.string().min(1),
  new_password:     z.string().min(8).max(72),
});

// Change the account password. Requires the current password; the new one
// takes effect immediately and the active session stays valid.
export const POST = withAuth({}, async ({ req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body', detail: parsed.error.format() }, 400);

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return json({ error: 'unauthenticated' }, 401);

  if (parsed.data.new_password === parsed.data.current_password) {
    return json({ error: 'same_password' }, 400);
  }
  if (!(await verifyPassword(user.email, parsed.data.current_password))) {
    return json({ error: 'wrong_password' }, 403);
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.new_password });
  if (error) return json({ error: error.message }, 400);

  return json({ ok: true });
});

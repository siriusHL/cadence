import { z } from 'zod';
import { withAuth, json, verifyPassword } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUserRole, isSupportRole } from '@/lib/roles';

const Body = z.object({
  current_password: z.string().min(1),
});

// GDPR right to erasure: permanently delete the account. Requires the current
// password. Deleting the auth user cascades to profiles, subscriptions,
// portfolios, holdings, transactions and alerts via "on delete cascade".
export const DELETE = withAuth({}, async ({ userId, req }) => {
  // Staff accounts can't be self-deleted — managed out-of-band.
  const { role } = await getUserRole();
  if (isSupportRole(role)) return json({ error: 'forbidden' }, 403);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body', detail: parsed.error.format() }, 400);

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return json({ error: 'unauthenticated' }, 401);

  if (!(await verifyPassword(user.email, parsed.data.current_password))) {
    return json({ error: 'wrong_password' }, 403);
  }

  const { error } = await supabaseAdmin().auth.admin.deleteUser(userId);
  if (error) return json({ error: error.message }, 500);

  // Clear the now-orphaned session cookies on this response.
  await supabase.auth.signOut();

  return json({ ok: true });
});

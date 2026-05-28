import { z } from 'zod';
import { withAuth, json, verifyPassword } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

const Body = z.object({
  new_email:        z.string().trim().email(),
  current_password: z.string().min(1),
});

// Change the account email. Requires the current password, then Supabase
// sends a confirmation link to the new address — the change only takes
// effect once that link is clicked.
export const POST = withAuth({}, async ({ req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body', detail: parsed.error.format() }, 400);

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return json({ error: 'unauthenticated' }, 401);

  const newEmail = parsed.data.new_email.toLowerCase();
  if (newEmail === user.email.toLowerCase()) {
    return json({ error: 'same_email' }, 400);
  }

  if (!(await verifyPassword(user.email, parsed.data.current_password))) {
    return json({ error: 'wrong_password' }, 403);
  }

  const origin = new URL(req.url).origin;
  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${origin}/app/account` },
  );
  if (error) return json({ error: error.message }, 400);

  return json({ ok: true });
});

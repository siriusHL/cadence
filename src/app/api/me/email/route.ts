import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

// Triggers the Supabase email-change flow. The address is NOT applied
// immediately — Supabase sends a confirmation link to the new inbox; the
// change only lands once that link is clicked. Until then the user keeps
// their current session under the old email, and `auth.getUser()` exposes
// `new_email` so the UI can show "pending change to …".
//
// The redirectTo passed to updateUser is where Supabase sends the user
// after they click the confirmation; we route them back to the profile
// page so they see the new email reflected immediately.

const Body = z.object({
  email: z.string().email().max(254),
});

export const POST = withAuth({}, async ({ req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_email' }, 400);

  const supabase = await getSupabaseServer();
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL!;

  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: `${origin}/app/profile` },
  );
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true, pending: parsed.data.email });
});

import Stripe from 'stripe';
import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Permanent account deletion. Requires the caller's current password as
// a re-auth step — without it any session-hijack would also be an instant
// account wipe. Flow:
//   1. Verify password by attempting signInWithPassword on the user's email.
//   2. Best-effort cancel an active Stripe subscription so billing stops.
//      Cancellation failures don't block deletion — the user explicitly
//      asked to leave; a stale Stripe sub is recoverable, a stuck account
//      isn't.
//   3. Call auth.admin.deleteUser. The cascade on profiles.id → auth.users
//      removes profiles, subscriptions, portfolios, holdings, transactions,
//      and per-user alerts in one shot.
// The client signs out after a 200 and redirects to "/".

const Body = z.object({
  password: z.string().min(1),
});

export const POST = withAuth({}, async ({ userId, req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'password_required' }, 400);

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return json({ error: 'unknown_email' }, 400);

  // Re-auth: signInWithPassword returns an error if the password is wrong.
  // The successful path returns the same session we already have, so the
  // user's cookies aren't disturbed.
  const reauth = await supabase.auth.signInWithPassword({
    email:    user.email,
    password: parsed.data.password,
  });
  if (reauth.error) return json({ error: 'wrong_password' }, 401);

  // Best-effort Stripe cancellation. Read the customer's active subscription
  // ID first, then ask Stripe to end it immediately.
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (sub?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    } catch {
      // Swallow — we still want the account gone even if Stripe is unreachable.
    }
  }

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return json({ error: error.message }, 500);

  // Drop the local session cookies so the client lands signed-out.
  await supabase.auth.signOut();
  return json({ ok: true });
});

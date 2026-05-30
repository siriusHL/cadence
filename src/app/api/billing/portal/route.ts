import Stripe from 'stripe';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

// Open the Stripe customer billing portal for the current user.
// Handles cancellation, payment-method updates, invoice history,
// and tier swaps via the price-update UI Stripe hosts. We just hand
// the user a one-shot session URL.
export const POST = withAuth({}, async ({ userId, req }) => {
  const supabase = await getSupabaseServer();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    // Free users have no Stripe customer yet — send them to the upgrade
    // page instead of generating an empty portal.
    return json({ error: 'no_customer', redirect: '/upgrade' }, 404);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL!;
  const session = await stripe.billingPortal.sessions.create({
    customer:   sub.stripe_customer_id,
    return_url: `${origin}/app?billing=1`,
  });
  return json({ url: session.url });
});

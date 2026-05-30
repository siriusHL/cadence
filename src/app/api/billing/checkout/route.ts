import Stripe from 'stripe';
import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

const Body = z.object({ tier: z.enum(['premium', 'elite']) });

const PRICE_IDS: Record<'premium' | 'elite', string | undefined> = {
  premium: process.env.STRIPE_PRICE_PREMIUM,
  elite: process.env.STRIPE_PRICE_ELITE,
};

export const POST = withAuth({}, async ({ userId, req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body' }, 400);

  const targetTier = parsed.data.tier;
  const priceId = PRICE_IDS[targetTier];
  if (!priceId) return json({ error: 'price_not_configured' }, 500);

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = await getSupabaseServer();
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL!;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, status')
    .eq('user_id', userId)
    .single();

  // Existing active subscriber → never start a second subscription. Send them
  // into the billing portal's plan-switch confirmation for the requested tier
  // (Stripe prorates; the webhook syncs the new tier back).
  const hasLiveSub =
    sub?.stripe_subscription_id &&
    ['active', 'trialing', 'past_due'].includes(sub.status ?? '');

  if (hasLiveSub && sub?.stripe_customer_id) {
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id!);
    const item = stripeSub.items.data[0];
    if (item.price.id === priceId) return json({ error: 'already_on_tier' }, 409);

    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/app?billing=1`,
      flow_data: {
        type: 'subscription_update_confirm',
        subscription_update_confirm: {
          subscription: sub.stripe_subscription_id!,
          items: [{ id: item.id, price: priceId }],
        },
      },
    });
    return json({ url: portal.url });
  }

  // First-time subscriber (free → paid): hosted Checkout creates the subscription.
  let customerId = sub?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const { data: { user } } = await supabase.auth.getUser();
    const customer = await stripe.customers.create({
      email: user?.email,
      metadata: { user_id: userId },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/app?billing=1`,
    cancel_url: `${origin}/upgrade`,
    metadata: { user_id: userId, tier: targetTier },
  });

  return json({ url: session.url });
});

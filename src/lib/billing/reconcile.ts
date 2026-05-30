import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Tier } from '@/lib/tiers';

const PRICE_TO_TIER: Record<string, Tier> = {
  [process.env.STRIPE_PRICE_PREMIUM ?? '']: 'premium',
  [process.env.STRIPE_PRICE_ELITE ?? '']: 'elite',
};

// Pull the user's live subscription from Stripe and sync tier/status into the
// DB. Mirrors the webhook so the result is identical — used as a belt-and-
// braces sync when a user returns from Stripe-hosted billing (checkout/portal),
// so the app reflects a plan change immediately even if the webhook is delayed
// or, in local dev, never received. Service-role; never throws to the caller.
export async function reconcileSubscriptionFromStripe(userId: string): Promise<void> {
  const admin = supabaseAdmin();
  const { data: row } = await admin
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!row?.stripe_customer_id && !row?.stripe_subscription_id) return;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let sub: Stripe.Subscription | null = null;
  if (row.stripe_subscription_id) {
    sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
  } else if (row.stripe_customer_id) {
    // Checkout just created a subscription the DB doesn't know about yet.
    const list = await stripe.subscriptions.list({ customer: row.stripe_customer_id, status: 'all', limit: 10 });
    sub = list.data.find((s) => ['active', 'trialing', 'past_due'].includes(s.status)) ?? list.data[0] ?? null;
  }
  if (!sub) return;

  const item = sub.items.data[0];
  const priceId = item?.price.id ?? '';
  const isActive = ['active', 'trialing'].includes(sub.status);
  const tier: Tier = isActive ? (PRICE_TO_TIER[priceId] ?? 'free') : 'free';
  const periodEnd = item?.current_period_end ?? null;

  await admin
    .from('subscriptions')
    .update({
      tier,
      status: sub.status,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

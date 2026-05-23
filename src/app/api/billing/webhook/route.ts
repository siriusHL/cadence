import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Tier } from '@/lib/tiers';

export const runtime = 'nodejs';

const PRICE_TO_TIER: Record<string, Tier> = {
  [process.env.STRIPE_PRICE_PREMIUM ?? '']: 'premium',
  [process.env.STRIPE_PRICE_ELITE ?? '']: 'elite',
};

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('missing signature', { status: 400 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e) {
    return new Response(`bad signature: ${(e as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = (sub.metadata?.user_id) ?? await resolveUserIdByCustomer(sub.customer as string);
      if (!userId) break;

      const item = sub.items.data[0];
      const priceId = item?.price.id ?? '';
      const isActive = ['active', 'trialing'].includes(sub.status);
      const tier: Tier = isActive ? (PRICE_TO_TIER[priceId] ?? 'free') : 'free';
      const periodEnd = item?.current_period_end ?? null;

      await supabaseAdmin()
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
      break;
    }
  }

  return new Response('ok');
}

async function resolveUserIdByCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

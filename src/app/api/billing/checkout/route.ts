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

  const priceId = PRICE_IDS[parsed.data.tier];
  if (!priceId) return json({ error: 'price_not_configured' }, 500);

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = await getSupabaseServer();

  // Find or create Stripe customer
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  let customerId = sub?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const { data: { user } } = await supabase.auth.getUser();
    const customer = await stripe.customers.create({
      email: user?.email,
      metadata: { user_id: userId },
    });
    customerId = customer.id;
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL!;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/app?upgraded=1`,
    cancel_url: `${origin}/upgrade`,
    metadata: { user_id: userId, tier: parsed.data.tier },
  });

  return json({ url: session.url });
});

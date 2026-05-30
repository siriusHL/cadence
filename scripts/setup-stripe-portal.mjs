// Configure the Stripe Customer Portal so customers can self-serve upgrade /
// downgrade between Premium and Elite (with proration), in addition to
// cancelling, updating their card, and viewing invoices.
//
// Run once per Stripe account (test and live):
//   node scripts/setup-stripe-portal.mjs
//
// Reads STRIPE_SECRET_KEY / STRIPE_PRICE_PREMIUM / STRIPE_PRICE_ELITE from the
// environment, falling back to .env.local for local runs. Idempotent — it
// updates the account's default portal configuration in place.
import { readFileSync } from 'node:fs';
import Stripe from 'stripe';

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)=(.*)$/);
      if (m && m[1] === name) return m[2].trim();
    }
  } catch { /* no .env.local — rely on process.env */ }
  return undefined;
}

const STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY');
const PRICE_PREMIUM = env('STRIPE_PRICE_PREMIUM');
const PRICE_ELITE = env('STRIPE_PRICE_ELITE');
if (!STRIPE_SECRET_KEY || !PRICE_PREMIUM || !PRICE_ELITE) {
  console.error('Missing STRIPE_SECRET_KEY / STRIPE_PRICE_PREMIUM / STRIPE_PRICE_ELITE');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const premiumPrice = await stripe.prices.retrieve(PRICE_PREMIUM);
const elitePrice = await stripe.prices.retrieve(PRICE_ELITE);
const premiumProduct = typeof premiumPrice.product === 'string' ? premiumPrice.product : premiumPrice.product.id;
const eliteProduct = typeof elitePrice.product === 'string' ? elitePrice.product : elitePrice.product.id;

const features = {
  subscription_update: {
    enabled: true,
    default_allowed_updates: ['price'],
    proration_behavior: 'create_prorations',
    products: [
      { product: premiumProduct, prices: [PRICE_PREMIUM] },
      { product: eliteProduct, prices: [PRICE_ELITE] },
    ],
  },
  subscription_cancel: { enabled: true, mode: 'at_period_end' },
  payment_method_update: { enabled: true },
  invoice_history: { enabled: true },
  customer_update: { enabled: true, allowed_updates: ['email', 'name', 'address'] },
};

const list = await stripe.billingPortal.configurations.list({ limit: 100 });
const existing = list.data.find((c) => c.is_default) ?? list.data[0];

const cfg = existing
  ? await stripe.billingPortal.configurations.update(existing.id, { features })
  : await stripe.billingPortal.configurations.create({
      business_profile: { headline: 'Cadence — manage your subscription' },
      features,
    });

console.log(`Portal configured: ${cfg.id} (default=${cfg.is_default})`);
console.log(`  plan switching: ${cfg.features.subscription_update.enabled} between Premium/Elite`);

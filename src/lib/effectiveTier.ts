import { type Tier } from '@/lib/tiers';

export interface TierSource {
  tier?: Tier | null;
  admin_tier_override?: Tier | null;
}

// Effective tier = admin override (if set) else the Stripe tier else 'free'.
export function effectiveTier(sub: TierSource | null | undefined): Tier {
  return (sub?.admin_tier_override ?? sub?.tier ?? 'free') as Tier;
}

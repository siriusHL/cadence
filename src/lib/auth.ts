import { type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServer } from '@/lib/supabase/server';
import { TIERS, type Tier, type Feature, can } from '@/lib/tiers';

export interface AuthCtx<P = Record<string, string>> {
  userId: string;
  tier: Tier;
  params: P;
  req: NextRequest;
}

type Handler<P> = (ctx: AuthCtx<P>) => Promise<Response> | Response;

interface RouteContext<P> {
  params: Promise<P>;
}

export interface GateOptions {
  minTier?: Tier;
  feature?: Feature;
}

const TIER_RANK: Record<Tier, number> = { free: 0, premium: 1, elite: 2 };

export function withAuth<P = Record<string, string>>(
  opts: GateOptions,
  handler: Handler<P>,
) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<Response> => {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthenticated' }, 401);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .single();

    const tier = (sub?.tier ?? 'free') as Tier;

    if (opts.minTier && TIER_RANK[tier] < TIER_RANK[opts.minTier]) {
      return json(
        { error: 'upgrade_required', requires: opts.minTier },
        402,
      );
    }
    if (opts.feature && !can(tier, opts.feature)) {
      return json(
        { error: 'upgrade_required', feature: opts.feature },
        402,
      );
    }

    const params = await ctx.params;
    return handler({ userId: user.id, tier, params, req });
  };
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

// Re-verify a user's current password before sensitive account changes
// (email/password change, account deletion). Uses a throwaway non-persisting
// client so the active session's cookies are never touched.
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const probe = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}

export function tierLimits(tier: Tier) {
  const cfg = TIERS[tier];
  return {
    maxPortfolios: cfg.maxPortfolios,
    maxHoldings: cfg.maxHoldings,
    maxAlerts: cfg.maxAlerts,
  };
}

import { z } from 'zod';
import { json } from '@/lib/auth';
import { withAdmin, logAdminAction } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { type Tier } from '@/lib/tiers';

const Body = z.object({
  override: z.enum(['free', 'premium', 'elite']).nullable(),
});

// Set or clear the manual tier override for a user. Stripe stays the sole
// writer of subscriptions.tier; this only touches admin_tier_override.
export const PATCH = withAdmin<{ id: string }>(async ({ email, params, req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body', detail: parsed.error.format() }, 400);
  const { override } = parsed.data;

  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from('subscriptions')
    .select('tier, admin_tier_override')
    .eq('user_id', params.id)
    .maybeSingle();
  if (!existing) return json({ error: 'not_found' }, 404);

  const { error } = await admin
    .from('subscriptions')
    .update({ admin_tier_override: override })
    .eq('user_id', params.id);
  if (error) return json({ error: error.message }, 500);

  await logAdminAction(email, override ? 'set_tier_override' : 'clear_tier_override', {
    targetType: 'user',
    targetId: params.id,
    meta: {
      from: (existing.admin_tier_override ?? null) as Tier | null,
      to: override,
      baseTier: (existing.tier ?? 'free') as Tier,
    },
  });

  return json({ ok: true, override });
});

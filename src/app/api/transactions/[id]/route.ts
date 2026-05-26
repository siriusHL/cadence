import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

/**
 * DELETE /api/transactions/:id
 * Removes one transaction (lot). RLS scopes to portfolios the caller owns.
 */
export const DELETE = withAuth<{ id: string }>({}, async ({ params }) => {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('transactions').delete().eq('id', params.id);
  if (error) return json({ error: error.message }, 500);

  revalidatePath('/app/home');
  revalidatePath('/app/stocks');
  revalidatePath('/app/year');
  revalidatePath('/app/tax');

  return json({ deleted: params.id });
});

const Patch = z.object({
  quantity:    z.coerce.number().positive().optional(),
  price_local: z.coerce.number().nonnegative().optional(),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fee_local:   z.coerce.number().nonnegative().optional(),
}).strict();

/**
 * PATCH /api/transactions/:id
 * Edit qty / price / date / fee of an existing lot. RLS scopes to the caller.
 */
export const PATCH = withAuth<{ id: string }>({}, async ({ params, req }) => {
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  if (Object.keys(parsed.data).length === 0) {
    return json({ error: 'no_changes' }, 400);
  }

  const supabase = await getSupabaseServer();
  const { error, data } = await supabase
    .from('transactions')
    .update(parsed.data)
    .eq('id', params.id)
    .select('id')
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: 'not_found' }, 404);

  revalidatePath('/app/home');
  revalidatePath('/app/stocks');
  revalidatePath('/app/year');
  revalidatePath('/app/tax');

  return json({ updated: params.id });
});

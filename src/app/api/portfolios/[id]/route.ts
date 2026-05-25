import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

const PatchBody = z.object({ name: z.string().min(1).max(80) });

export const PATCH = withAuth<{ id: string }>({}, async ({ userId, params, req }) => {
  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body', issues: parsed.error.issues }, 400);

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('portfolios')
    .update({ name: parsed.data.name })
    .eq('id', params.id)
    .eq('user_id', userId)
    .select('id, name, created_at')
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: 'not_found' }, 404);

  revalidatePath('/app', 'layout');
  return json({ data });
});

export const DELETE = withAuth<{ id: string }>({}, async ({ userId, params }) => {
  const supabase = await getSupabaseServer();

  // Refuse to delete the last owned portfolio — users always need at least one.
  const { count } = await supabase
    .from('portfolios')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if ((count ?? 0) <= 1) return json({ error: 'last_portfolio' }, 409);

  const { error } = await supabase
    .from('portfolios')
    .delete()
    .eq('id', params.id)
    .eq('user_id', userId);
  if (error) return json({ error: error.message }, 500);

  revalidatePath('/app', 'layout');
  return json({ deleted: params.id });
});

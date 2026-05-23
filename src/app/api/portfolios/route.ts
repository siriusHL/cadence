import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

const CreateBody = z.object({ name: z.string().min(1).max(80) });

export const GET = withAuth({}, async ({ userId }) => {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('portfolios')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) return json({ error: error.message }, 500);
  return json({ data });
});

export const POST = withAuth({}, async ({ userId, req }) => {
  const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body', issues: parsed.error.issues }, 400);

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('portfolios')
    .insert({ user_id: userId, name: parsed.data.name })
    .select('id, name, created_at')
    .single();

  // RLS cap violation surfaces as PostgREST error 42501 / RLS denial
  if (error) {
    const isCapHit = error.code === '42501' || /row-level security/i.test(error.message);
    return json(
      isCapHit
        ? { error: 'upgrade_required', reason: 'portfolio_cap_reached' }
        : { error: error.message },
      isCapHit ? 402 : 500,
    );
  }
  return json({ data }, 201);
});

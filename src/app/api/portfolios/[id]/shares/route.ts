import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const PostBody = z.object({ email: z.string().email() });

/** GET /api/portfolios/:id/shares — owner-only list of recipients. */
export const GET = withAuth<{ id: string }>({}, async ({ userId, params }) => {
  const supabase = await getSupabaseServer();

  // Ownership check (RLS would also enforce, but we want a clean 403 vs []).
  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('id, user_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!portfolio || portfolio.user_id !== userId) return json({ error: 'forbidden' }, 403);

  const { data: shares, error } = await supabase
    .from('portfolio_shares')
    .select('id, shared_with_user_id, created_at')
    .eq('portfolio_id', params.id)
    .order('created_at', { ascending: true });
  if (error) return json({ error: error.message }, 500);

  // Resolve recipient emails via the admin client (auth.users isn't readable
  // through the anon-key API).
  const admin = supabaseAdmin();
  const enriched = await Promise.all(
    (shares ?? []).map(async (s) => {
      const { data } = await admin.auth.admin.getUserById(s.shared_with_user_id);
      return { ...s, email: data?.user?.email ?? null };
    }),
  );
  return json({ data: enriched });
});

/**
 * POST /api/portfolios/:id/shares
 * Body: { email }. Looks up the recipient by email and creates a share row.
 * RLS additionally enforces: caller owns the portfolio AND is on Elite.
 */
export const POST = withAuth<{ id: string }>(
  { minTier: 'elite' },
  async ({ userId, params, req }) => {
    const parsed = PostBody.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: 'invalid_body' }, 400);

    const supabase = await getSupabaseServer();
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('id, user_id')
      .eq('id', params.id)
      .maybeSingle();
    if (!portfolio || portfolio.user_id !== userId) return json({ error: 'forbidden' }, 403);

    // Look up recipient by email (admin only — anon API can't enumerate users).
    const admin = supabaseAdmin();
    // Supabase Admin listUsers paginates; emails are unique so the first page
    // hit is enough for our scale.
    const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr) return json({ error: listErr.message }, 500);
    const target = usersPage.users.find(
      (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase(),
    );
    if (!target) return json({ error: 'user_not_found' }, 404);
    if (target.id === userId) return json({ error: 'cannot_share_with_self' }, 400);

    const { data, error } = await supabase
      .from('portfolio_shares')
      .insert({ portfolio_id: params.id, shared_with_user_id: target.id })
      .select('id, shared_with_user_id, created_at')
      .single();
    if (error) {
      if (error.code === '23505') return json({ error: 'already_shared' }, 409);
      return json({ error: error.message }, 500);
    }

    revalidatePath('/app/portfolios');
    return json({ data: { ...data, email: target.email } }, 201);
  },
);

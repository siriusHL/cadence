import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { ACTIVE_PORTFOLIO_COOKIE } from '@/lib/activePortfolio';

const Body = z.object({ portfolioId: z.string().uuid() });

export const POST = withAuth({}, async ({ req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body' }, 400);

  // RLS confirms the caller owns this portfolio.
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('portfolios')
    .select('id')
    .eq('id', parsed.data.portfolioId)
    .maybeSingle();
  if (!data) return json({ error: 'no_access' }, 403);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PORTFOLIO_COOKIE, parsed.data.portfolioId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath('/app', 'layout');
  return json({ ok: true });
});

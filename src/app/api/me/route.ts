import { cookies } from 'next/headers';
import { z } from 'zod';
import { withAuth, json, tierLimits } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

const ALLOWED_SCREENS = [
  'home', 'next', 'stocks', 'year', 'dashboard', 'holdings',
  'calendar', 'forecast', 'performance', 'diversification', 'tax', 'alerts',
] as const;

const PatchBody = z.object({
  display_name:    z.string().trim().max(60).nullable().optional(),
  base_currency:   z.enum(['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK']).optional(),
  // Stored as ISO-2 uppercase; null means "unset".
  tax_country:     z.string().trim().length(2).regex(/^[A-Z]{2}$/i).nullable().optional(),
  theme:           z.enum(['light', 'dark', 'system']).optional(),
  default_screen:  z.enum(ALLOWED_SCREENS).nullable().optional(),
});

export const PATCH = withAuth({}, async ({ userId, req }) => {
  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body', detail: parsed.error.format() }, 400);

  // Normalise — store country code uppercase, empty strings collapsed to null.
  const patch: Record<string, unknown> = {};
  if ('display_name'   in parsed.data) patch.display_name   = parsed.data.display_name?.trim() || null;
  if ('base_currency'  in parsed.data) patch.base_currency  = parsed.data.base_currency;
  if ('tax_country'    in parsed.data) patch.tax_country    = parsed.data.tax_country
    ? parsed.data.tax_country.toUpperCase()
    : null;
  if ('theme'          in parsed.data) patch.theme          = parsed.data.theme;
  if ('default_screen' in parsed.data) patch.default_screen = parsed.data.default_screen;
  if (Object.keys(patch).length === 0) return json({ ok: true });

  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) return json({ error: error.message }, 500);

  // Mirror the theme into a cookie so the no-flash boot script in root layout
  // can pick it up before React hydrates on next reload.
  if (typeof patch.theme === 'string') {
    const cookieStore = await cookies();
    cookieStore.set('theme', patch.theme, {
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return json({ ok: true });
});

export const GET = withAuth({}, async ({ userId, tier }) => {
  const supabase = await getSupabaseServer();

  const [
    { data: profile },
    { count: portfolioCount },
    { data: holdingRows },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name, base_currency, tax_country, theme, default_screen').eq('id', userId).single(),
    supabase.from('portfolios').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    // RLS already scopes to caller's portfolios; selecting holdings.id is enough to count.
    supabase.from('holdings').select('id'),
  ]);

  return json({
    tier,
    profile: profile ?? null,
    usage: {
      portfolios: portfolioCount ?? 0,
      holdings: holdingRows?.length ?? 0,
    },
    limits: tierLimits(tier),
  });
});

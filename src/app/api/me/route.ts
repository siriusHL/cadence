import { cookies } from 'next/headers';
import { z } from 'zod';
import { withAuth, json, tierLimits } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

const ALLOWED_SCREENS = [
  'home', 'next', 'stocks', 'year', 'dashboard', 'holdings',
  'dividends', 'performance', 'diversification', 'tax', 'alerts',
] as const;

const PatchBody = z.object({
  display_name:    z.string().trim().max(60).nullable().optional(),
  base_currency:   z.enum(['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK']).optional(),
  // Stored as ISO-2 uppercase; null means "unset".
  tax_country:     z.string().trim().length(2).regex(/^[A-Z]{2}$/i).nullable().optional(),
  contrast:        z.enum(['soft', 'standard', 'sharp']).optional(),
  bg_tone:         z.enum(['cream', 'neutral', 'cool']).optional(),
  default_screen:  z.enum(ALLOWED_SCREENS).nullable().optional(),
  income_target:   z.coerce.number().positive().max(10_000_000).optional(),

  // Accountant's email — destination for the "Send to accountant" action on
  // the Tax page. Optional; null clears it.
  accountant_email: z.string().trim().email().max(254).nullable().optional(),

  // IE income-tax band for the dividend tax estimate. null = use model default.
  dividend_tax_band: z.enum(['standard', 'higher']).nullable().optional(),

  // Personal details (Profile page). All nullable — never required.
  first_name:          z.string().trim().max(60).nullable().optional(),
  last_name:           z.string().trim().max(60).nullable().optional(),
  birth_date:          z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  phone:               z.string().trim().max(32).regex(/^[+\d][\d\s()./-]{3,}$/).nullable().optional(),
  sex:                 z.enum(['female', 'male']).nullable().optional(),
  address_line1:       z.string().trim().max(120).nullable().optional(),
  address_line2:       z.string().trim().max(120).nullable().optional(),
  address_city:        z.string().trim().max(80).nullable().optional(),
  address_postal_code: z.string().trim().max(20).nullable().optional(),
  address_country:     z.string().trim().length(2).regex(/^[A-Z]{2}$/i).nullable().optional(),
});

// Free-text personal fields: empty string collapses to null, otherwise trimmed.
const TEXT_FIELDS = [
  'first_name', 'last_name', 'birth_date', 'phone',
  'address_line1', 'address_line2', 'address_city', 'address_postal_code',
] as const;

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
  if ('contrast'       in parsed.data) patch.contrast       = parsed.data.contrast;
  if ('bg_tone'        in parsed.data) patch.bg_tone        = parsed.data.bg_tone;
  if ('default_screen' in parsed.data) patch.default_screen = parsed.data.default_screen;
  if ('income_target'  in parsed.data) patch.income_target  = parsed.data.income_target;
  if ('accountant_email' in parsed.data) patch.accountant_email = parsed.data.accountant_email
    ? parsed.data.accountant_email.toLowerCase()
    : null;
  if ('dividend_tax_band' in parsed.data) patch.dividend_tax_band = parsed.data.dividend_tax_band ?? null;

  for (const f of TEXT_FIELDS) {
    if (f in parsed.data) patch[f] = parsed.data[f]?.trim() || null;
  }
  if ('sex'             in parsed.data) patch.sex             = parsed.data.sex ?? null;
  if ('address_country' in parsed.data) patch.address_country = parsed.data.address_country
    ? parsed.data.address_country.toUpperCase()
    : null;

  if (Object.keys(patch).length === 0) return json({ ok: true });

  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) return json({ error: error.message }, 500);

  // Mirror visual prefs into cookies so the no-flash boot script in root layout
  // can read them before React hydrates on the next reload.
  if (typeof patch.contrast === 'string' || typeof patch.bg_tone === 'string') {
    const cookieStore = await cookies();
    const opts = { sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 365 };
    if (typeof patch.contrast === 'string') cookieStore.set('contrast', patch.contrast, opts);
    if (typeof patch.bg_tone  === 'string') cookieStore.set('bg_tone',  patch.bg_tone,  opts);
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
    supabase.from('profiles').select('display_name, base_currency, tax_country, contrast, bg_tone, default_screen, income_target, accountant_email, dividend_tax_band, first_name, last_name, birth_date, phone, sex, address_line1, address_line2, address_city, address_postal_code, address_country').eq('id', userId).single(),
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

import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { buildTaxPackXlsx } from '@/lib/export';
import { sendTaxSummaryToAccountant } from '@/lib/email';
import { DEFAULT_RESIDENCE, type TaxResidence } from '@/lib/tax';

// The user previews (and may edit) the email before sending, so we accept the
// recipient, subject and body from the client and validate them here. When
// `attach` is set we also bundle the year's tax-pack workbook — same artefact
// the Export section downloads — so the email is self-contained.
const Body = z.object({
  to:      z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(200),
  body:    z.string().trim().min(1).max(20_000),
  year:    z.coerce.number().int().min(1900).max(2999).optional(),
  attach:  z.boolean().optional(),
});

export const POST = withAuth({}, async ({ userId, tier, req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body', detail: parsed.error.format() }, 400);

  const { to, subject, body, year, attach } = parsed.data;

  // Optionally attach the tax-pack workbook. It's the same elite-only artefact
  // as /api/export/tax-pack, so gate it the same way rather than leaking a
  // paid export through the email path.
  let attachment: { filename: string; content: Buffer } | undefined;
  if (attach) {
    if (year == null) return json({ error: 'year_required_for_attachment' }, 400);
    if (tier !== 'elite') return json({ error: 'upgrade_required', requires: 'elite' }, 402);

    const supabase = await getSupabaseServer();
    const portfolio = await getActivePortfolio(supabase, userId);
    if (!portfolio) return json({ error: 'no_portfolio' }, 404);

    const { data: profile } = await supabase
      .from('profiles')
      .select('tax_country')
      .eq('id', userId)
      .maybeSingle();
    const residence = (profile?.tax_country as TaxResidence | null) ?? DEFAULT_RESIDENCE;

    const buf = await buildTaxPackXlsx(supabase, portfolio.id, year, residence);
    attachment = { filename: `tax-pack-${year}.xlsx`, content: buf };
  }

  const sent = await sendTaxSummaryToAccountant({
    to: to.toLowerCase(),
    subject,
    body,
    attachment,
  });

  if (!sent) return json({ error: 'email_unavailable' }, 502);
  return json({ ok: true });
});

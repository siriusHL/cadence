import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

// Records the user's portfolio value on 1 January of a fiscal year, used by the
// NL Box 3 estimate on the Tax page. Upsert keyed on (user, year); a null/empty
// value clears the entry so the page falls back to its "needs your value" prompt.
const Body = z.object({
  year:  z.coerce.number().int().min(1900).max(2999),
  value: z.coerce.number().min(0).max(1_000_000_000).nullable(),
});

export const POST = withAuth({}, async ({ userId, req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body', detail: parsed.error.format() }, 400);

  const { year, value } = parsed.data;
  const supabase = await getSupabaseServer();

  if (value == null) {
    const { error } = await supabase
      .from('box3_values')
      .delete()
      .eq('user_id', userId)
      .eq('fiscal_year', year);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, cleared: true });
  }

  const { error } = await supabase
    .from('box3_values')
    .upsert(
      { user_id: userId, fiscal_year: year, value_eur: value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,fiscal_year' },
    );
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});

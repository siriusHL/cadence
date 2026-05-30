import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

/**
 * GET /api/tax/accountant-sends
 * Full "Send to accountant" history for the caller, newest first. The Tax page
 * server-renders the latest few inline; this backs the "Show all" expander so
 * the rest is only fetched when the user actually asks for it. RLS scopes the
 * read to the caller's own rows. Capped so a pathological history can't return
 * an unbounded payload.
 */
export const GET = withAuth({}, async ({ userId }) => {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('accountant_sends')
    .select('recipient, fiscal_year, attached_pack, all_years, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return json({ error: error.message }, 500);
  return json({ sends: data ?? [] });
});

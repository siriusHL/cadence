import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export const GET = withAuth({ feature: 'googleCalendarSync' }, async ({ userId }) => {
  // Read through the user-scoped client so RLS confirms ownership.
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('google_calendar_connections')
    .select('email, calendar_id, connected_at, last_sync_at, last_sync_status, last_sync_error, last_sync_count')
    .eq('user_id', userId)
    .maybeSingle();
  return json({ connected: Boolean(data), connection: data ?? null });
});

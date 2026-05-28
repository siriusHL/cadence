import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

/**
 * GET /api/messages/unread-count
 * Drives the nav badge. Counts support messages the user hasn't read yet.
 * RLS restricts the visible rows to the user's own threads, so a plain count
 * is enough. Returns 0 (not an error) for signed-out callers so the badge
 * simply stays hidden.
 */
export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ total: 0 });

  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender', 'support')
    .is('read_by_user_at', null);

  return NextResponse.json({ total: count ?? 0 });
}

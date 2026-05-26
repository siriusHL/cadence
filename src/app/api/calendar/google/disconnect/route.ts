import { withAuth, json } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { openToken } from '@/lib/crypto';
import { revokeRefreshToken } from '@/lib/googleCalendar';

export const runtime = 'nodejs';

export const POST = withAuth({ feature: 'googleCalendarSync' }, async ({ userId }) => {
  const admin = supabaseAdmin();
  const { data: conn } = await admin
    .from('google_calendar_connections')
    .select('refresh_token_enc, refresh_token_iv, refresh_token_tag')
    .eq('user_id', userId)
    .maybeSingle();

  if (conn) {
    try {
      const refreshToken = openToken({
        ciphertext: Buffer.from(conn.refresh_token_enc),
        iv: Buffer.from(conn.refresh_token_iv),
        tag: Buffer.from(conn.refresh_token_tag),
      });
      await revokeRefreshToken(refreshToken);
    } catch {
      // Decryption or revoke can fail (e.g. token already revoked at Google).
      // Either way we still delete the row below — the user's intent is to
      // disconnect.
    }
  }

  await admin.from('google_calendar_connections').delete().eq('user_id', userId);
  return json({ ok: true });
});

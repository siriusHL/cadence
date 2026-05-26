import { type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { exchangeCode, decodeIdToken } from '@/lib/googleCalendar';
import { verifyState } from '@/lib/oauthState';
import { sealToken } from '@/lib/crypto';

export const runtime = 'nodejs';

function redirect(path: string, base: string): Response {
  return Response.redirect(new URL(path, base).toString(), 302);
}

export async function GET(req: NextRequest): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const url = new URL(req.url);
  const error = url.searchParams.get('error');
  if (error) {
    return redirect(`/app/settings?gcal=denied&reason=${encodeURIComponent(error)}`, base);
  }
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    return redirect('/app/settings?gcal=error&reason=missing_params', base);
  }

  const payload = verifyState(state);
  if (!payload) {
    return redirect('/app/settings?gcal=error&reason=bad_state', base);
  }

  // Cross-check: the signed state must match the currently logged-in user.
  // Without this, an attacker could trick a victim into completing OAuth with
  // the attacker's Google account, then attach that connection to the victim.
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== payload.userId) {
    return redirect('/app/settings?gcal=error&reason=session_mismatch', base);
  }

  let tokens;
  try {
    tokens = await exchangeCode(code);
  } catch {
    return redirect('/app/settings?gcal=error&reason=exchange_failed', base);
  }

  const info = tokens.id_token ? decodeIdToken(tokens.id_token) : { sub: 'unknown', email: undefined };
  const sealed = sealToken(tokens.refresh_token);

  const admin = supabaseAdmin();
  const { error: upsertErr } = await admin
    .from('google_calendar_connections')
    .upsert({
      user_id: user.id,
      google_sub: info.sub,
      email: info.email,
      refresh_token_enc: sealed.ciphertext,
      refresh_token_iv: sealed.iv,
      refresh_token_tag: sealed.tag,
      scope: tokens.scope,
      calendar_id: 'primary',
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (upsertErr) {
    return redirect('/app/settings?gcal=error&reason=store_failed', base);
  }

  return redirect('/app/settings?gcal=connected', base);
}

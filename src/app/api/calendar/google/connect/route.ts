import { withAuth } from '@/lib/auth';
import { buildAuthorizeUrl } from '@/lib/googleCalendar';
import { signState } from '@/lib/oauthState';

export const runtime = 'nodejs';

export const GET = withAuth({ feature: 'googleCalendarSync' }, ({ userId }) => {
  const state = signState(userId);
  const url = buildAuthorizeUrl(state);
  return Response.redirect(url, 302);
});

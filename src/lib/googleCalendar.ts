// Thin Google Calendar / OAuth adapter. Plain fetch — no SDK dependency.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

function clientId(): string {
  const v = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!v) throw new Error('GOOGLE_OAUTH_CLIENT_ID not configured');
  return v;
}
function clientSecret(): string {
  const v = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!v) throw new Error('GOOGLE_OAUTH_CLIENT_SECRET not configured');
  return v;
}
function redirectUri(): string {
  const v = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!v) throw new Error('GOOGLE_OAUTH_REDIRECT_URI not configured');
  return v;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: GCAL_SCOPE,
    access_type: 'offline',
    // Force the consent screen so Google always issues a fresh refresh_token.
    // Without this, a returning user who already consented gets no refresh_token.
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface TokenExchangeResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

export async function exchangeCode(code: string): Promise<TokenExchangeResult> {
  const body = new URLSearchParams({
    code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(`google token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json() as TokenExchangeResult & { refresh_token?: string };
  if (!json.refresh_token) {
    throw new Error('google did not return a refresh_token — ensure prompt=consent and access_type=offline');
  }
  return json as TokenExchangeResult;
}

export interface AccessTokenResult {
  access_token: string;
  expires_in: number;
  scope: string;
}

export async function refreshAccessToken(refreshToken: string): Promise<AccessTokenResult> {
  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(`google token refresh failed: ${res.status} ${await res.text()}`);
  }
  return await res.json() as AccessTokenResult;
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await fetch(REVOKE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refreshToken }),
  }).catch(() => { /* best effort */ });
}

export interface GoogleUserInfo {
  sub: string;
  email?: string;
}

// id_token is a JWT; we only need `sub` and `email`. No signature verification
// is needed because we received it directly over TLS from Google's token endpoint.
export function decodeIdToken(idToken: string): GoogleUserInfo {
  const [, payload] = idToken.split('.');
  if (!payload) throw new Error('malformed id_token');
  const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  return { sub: String(json.sub), email: json.email ? String(json.email) : undefined };
}

// ---------------------------------------------------------------------------
// Calendar events

export interface CalendarEventInput {
  iCalUID: string;
  summary: string;
  description?: string;
  /** YYYY-MM-DD — all-day event. */
  startDate: string;
  /** YYYY-MM-DD, exclusive end (Google convention for all-day). */
  endDate: string;
  extendedPrivate?: Record<string, string>;
}

export interface ImportEventResult {
  ok: boolean;
  status: number;
  eventId?: string;
  error?: string;
}

export async function importEvent(
  accessToken: string,
  calendarId: string,
  ev: CalendarEventInput,
): Promise<ImportEventResult> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/import`;
  const body = {
    iCalUID: ev.iCalUID,
    summary: ev.summary,
    description: ev.description,
    start: { date: ev.startDate },
    end: { date: ev.endDate },
    transparency: 'transparent', // dividends don't block your schedule
    reminders: { useDefault: false },
    extendedProperties: ev.extendedPrivate ? { private: ev.extendedPrivate } : undefined,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { ok: false, status: res.status, error: await res.text() };
  }
  const json = await res.json();
  return { ok: true, status: res.status, eventId: String(json.id) };
}

export interface ListedEvent {
  id: string;
  iCalUID: string;
  status: string;
  extendedProperties?: { private?: Record<string, string> };
}

export async function listCadenceEvents(
  accessToken: string,
  calendarId: string,
): Promise<ListedEvent[]> {
  // Filter to events tagged by us so we never touch the user's own events.
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set('privateExtendedProperty', 'source=cadence');
  url.searchParams.set('maxResults', '2500');
  url.searchParams.set('showDeleted', 'false');
  const res = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`google list events failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json() as { items?: ListedEvent[] };
  return json.items ?? [];
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  await fetch(url, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${accessToken}` },
  }).catch(() => { /* best effort */ });
}

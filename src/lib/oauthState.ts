import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// Signed, opaque OAuth state. Carries the Cadence user_id plus a random nonce,
// HMAC'd with a server secret. Validated on callback to prevent CSRF and
// session fixation. We use base64url so it's URL-safe without escaping.

const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface StatePayload {
  userId: string;
  nonce: string;
  exp: number;
}

function secret(): Buffer {
  const v = process.env.GOOGLE_OAUTH_STATE_SECRET;
  if (!v || v.length < 16) throw new Error('GOOGLE_OAUTH_STATE_SECRET missing or too short');
  return Buffer.from(v, 'utf8');
}

function b64url(b: Buffer): string {
  return b.toString('base64url');
}

export function signState(userId: string): string {
  const payload: StatePayload = {
    userId,
    nonce: randomBytes(12).toString('base64url'),
    exp: Date.now() + TTL_MS,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = b64url(createHmac('sha256', secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyState(state: string): StatePayload | null {
  const dot = state.indexOf('.');
  if (dot < 0) return null;
  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = b64url(createHmac('sha256', secret()).update(body).digest());
  const a = Buffer.from(sig, 'base64url');
  const b = Buffer.from(expected, 'base64url');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as StatePayload;
  } catch {
    return null;
  }
  if (typeof payload.userId !== 'string' || typeof payload.exp !== 'number') return null;
  if (Date.now() > payload.exp) return null;
  return payload;
}

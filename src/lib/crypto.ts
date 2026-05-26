import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// AES-256-GCM for refresh tokens at rest. Key comes from a server-only env
// var (GOOGLE_TOKEN_ENC_KEY) — separate from the Supabase service role key,
// so a leak of one isn't enough to read the other.

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function key(): Buffer {
  const raw = process.env.GOOGLE_TOKEN_ENC_KEY;
  if (!raw) throw new Error('GOOGLE_TOKEN_ENC_KEY not configured');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error('GOOGLE_TOKEN_ENC_KEY must decode to 32 bytes (base64 of 32 random bytes)');
  }
  return buf;
}

export interface SealedToken {
  ciphertext: Buffer;
  iv: Buffer;
  tag: Buffer;
}

export function sealToken(plaintext: string): SealedToken {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag };
}

export function openToken(sealed: SealedToken): string {
  if (sealed.tag.length !== TAG_LEN) throw new Error('invalid auth tag length');
  const decipher = createDecipheriv(ALGO, key(), sealed.iv);
  decipher.setAuthTag(sealed.tag);
  const plaintext = Buffer.concat([decipher.update(sealed.ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

#!/usr/bin/env node
/**
 * Seed (or refresh) the three E2E test users — free / premium / elite —
 * and write their credentials to tests/e2e/test-users.json so the suite
 * can log in as them.
 *
 *   node scripts/seed-e2e-users.mjs
 *   (or: npm run seed:e2e-users)
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from env.txt
 * / .env.local at the repo root.
 *
 * Idempotent: re-running resets each user's password + tier instead of
 * erroring on an existing account.
 *
 * Schema note: an `on_auth_user_created` trigger runs handle_new_user(),
 * which inserts the profiles + subscriptions rows automatically
 * (subscriptions defaults to tier='free'). So we only create the auth
 * user and then upsert the target tier.
 *
 * NOTE: this creates real rows in whatever Supabase project env.txt
 * points at. Prefer pointing it at a dedicated *test* project, not prod.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Simple, stable credentials — these are throwaway test accounts.
const USERS = [
  { tier: 'free',    email: 'e2e-free@example.com',    password: 'e2e-free-pass' },
  { tier: 'premium', email: 'e2e-premium@example.com', password: 'e2e-premium-pass' },
  { tier: 'elite',   email: 'e2e-elite@example.com',   password: 'e2e-elite-pass' },
];

function loadEnv() {
  for (const name of ['env.txt', '.env.local', '.env']) {
    const f = join(ROOT, name);
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const val = m[2].replace(/^['"]|['"]$/g, '');
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
    break;
  }
}

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.txt / .env.local.');
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findByEmail(email) {
  // Small dev project → page 1 (200 users) is plenty.
  const { data, error } = await sb.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function upsertUser({ tier, email, password }) {
  let id;
  const existing = await findByEmail(email);
  if (existing) {
    const { error } = await sb.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    id = existing.id;
    console.log(`  ↻ updated ${email}`);
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    id = data.user.id;
    console.log(`  ✓ created ${email}`);
  }

  // The signup trigger created the subscription row (tier=free). Upsert
  // the target tier — upsert (not update) is belt-and-braces in case the
  // trigger ever changes.
  const { error: subErr } = await sb
    .from('subscriptions')
    .upsert(
      { user_id: id, tier, status: 'active', updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (subErr) throw subErr;
  console.log(`      tier → ${tier}`);
  return id;
}

console.log(`Seeding 3 E2E users → ${url.replace(/(https:\/\/)([^.]+)/, '$1***')}\n`);

const out = {};
for (const u of USERS) {
  try {
    await upsertUser(u);
    out[u.tier] = { email: u.email, password: u.password, tier: u.tier };
  } catch (e) {
    console.error(`  ✗ ${u.email}: ${e.message ?? e}`);
    process.exitCode = 1;
  }
}

const destDir = join(ROOT, 'tests', 'e2e');
mkdirSync(destDir, { recursive: true });
const dest = join(destDir, 'test-users.json');
writeFileSync(dest, JSON.stringify(out, null, 2) + '\n', 'utf8');

console.log(`\nWrote ${Object.keys(out).length} users → tests/e2e/test-users.json (gitignored)`);
console.log('Log in with:');
for (const t of ['free', 'premium', 'elite']) {
  if (out[t]) console.log(`  ${t.padEnd(8)} ${out[t].email}  /  ${out[t].password}`);
}

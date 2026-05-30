#!/usr/bin/env node
/**
 * Set staff roles on the E2E test users.
 *
 *   node scripts/seed-e2e-roles.mjs   (run after npm run seed:e2e-users)
 *
 * REQUIRES migration 0014_user_roles.sql to be applied first (it adds the
 * profiles.role column). Without it this script fails on the role update.
 *
 *   free / premium / elite  -> role 'user'    (ordinary customers)
 *   e2e-admin    (created)  -> role 'admin'   + elite tier
 *   e2e-support  (created)  -> role 'support' + elite tier
 *
 * profiles.role is service-role-only writable (a trigger blocks the
 * authenticated/anon API roles from self-promoting), so this uses
 * SUPABASE_SERVICE_ROLE_KEY from env.txt / .env.local — the same client as
 * seed-e2e-users.mjs. Idempotent: re-running just re-asserts roles.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = [
  { email: 'e2e-free@example.com', role: 'user' },
  { email: 'e2e-premium@example.com', role: 'user' },
  { email: 'e2e-elite@example.com', role: 'user' },
  { email: 'e2e-admin@example.com', role: 'admin', password: 'e2e-admin-pass', tier: 'elite', create: true },
  { email: 'e2e-support@example.com', role: 'support', password: 'e2e-support-pass', tier: 'elite', create: true },
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

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function findId(email) {
  const { data, error } = await sb.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())?.id ?? null;
}

console.log(`Setting roles on ${url.replace(/(https:\/\/)([^.]+)/, '$1***')}\n`);

const seedOut = {};
for (const t of TARGETS) {
  try {
    let id = await findId(t.email);
    if (!id) {
      if (!t.create) {
        console.log(`  ✗ ${t.email}: no auth user — run \`npm run seed:e2e-users\` first`);
        continue;
      }
      const { data, error } = await sb.auth.admin.createUser({
        email: t.email,
        password: t.password,
        email_confirm: true,
      });
      if (error) throw error;
      id = data.user.id;
      console.log(`  ✓ created ${t.email}`);
    }
    if (t.tier) {
      const { error: subErr } = await sb
        .from('subscriptions')
        .upsert(
          { user_id: id, tier: t.tier, status: 'active', updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );
      if (subErr) throw subErr;
    }
    const { error: roleErr } = await sb.from('profiles').update({ role: t.role }).eq('id', id);
    if (roleErr) throw roleErr; // e.g. "column profiles.role does not exist" → apply 0014 first
    console.log(`      ${t.email} -> role '${t.role}'${t.tier ? ` / tier ${t.tier}` : ''}`);
    if (t.create) seedOut[t.role] = { email: t.email, password: t.password, tier: t.tier, role: t.role };
  } catch (e) {
    console.error(`  ✗ ${t.email}: ${e.message ?? e}`);
    process.exitCode = 1;
  }
}

// Merge the new staff users into tests/e2e/test-users.json (alongside tiers).
if (Object.keys(seedOut).length) {
  const dest = join(ROOT, 'tests', 'e2e', 'test-users.json');
  let users = {};
  try {
    users = JSON.parse(readFileSync(dest, 'utf8'));
  } catch {
    /* start fresh */
  }
  Object.assign(users, seedOut);
  writeFileSync(dest, JSON.stringify(users, null, 2) + '\n', 'utf8');
  console.log(`\nWrote ${Object.keys(seedOut).join(', ')} → tests/e2e/test-users.json`);
}
console.log('\nDone (requires migration 0014_user_roles.sql applied).');

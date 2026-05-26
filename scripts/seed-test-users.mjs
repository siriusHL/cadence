#!/usr/bin/env node
// Seed two test users — one Free, one Premium — for local development.
//
// Usage:
//   node scripts/seed-test-users.mjs
//
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from env.txt (or env vars).
// Uses the service-role client to:
//   1) create auth users with email_confirm: true so they can log in immediately
//   2) upsert a row in `subscriptions` with the correct tier
//
// Safe to re-run — if a user already exists, we update the password + tier
// instead of erroring out.

import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ─── Test users ──────────────────────────────────────────────────────────
const USERS = [
  { email: 'free@test.local',    password: 'free1234',    tier: 'free' },
  { email: 'premium@test.local', password: 'premium1234', tier: 'premium' },
  { email: 'elite@test.local',   password: 'elite1234',   tier: 'elite' },
];

// ─── Env loading ─────────────────────────────────────────────────────────
// Try a few common filenames before giving up. Lines look like KEY=value.
function loadEnvFromFile() {
  const candidates = ['env.txt', '.env.local', '.env'];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, key, rawVal] = m;
      const val = rawVal.replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
    return file;
  }
  return null;
}

const envFile = loadEnvFromFile();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error(envFile
    ? `Loaded ${envFile} but the keys weren't there.`
    : 'No env.txt / .env.local / .env file found in the project root.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Helpers ─────────────────────────────────────────────────────────────
async function findUserByEmail(email) {
  // listUsers is paginated; for a tiny dev project page 1 is plenty.
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  return data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function upsertUser({ email, password, tier }) {
  let userId;
  const existing = await findUserByEmail(email);

  if (existing) {
    // Reset the password so the documented credentials always work, even
    // if a previous run used a different password.
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = existing.id;
    console.log(`  ↻ updated ${email} (${userId})`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`  ✓ created ${email} (${userId})`);
  }

  // Upsert subscription tier. Some projects have a trigger that auto-creates
  // a `subscriptions` row on signup; either way, this upsert sets the tier.
  const { error: subErr } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        tier,
        status: tier === 'free' ? 'inactive' : 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  if (subErr) throw subErr;
  console.log(`    tier → ${tier}`);
}

// ─── Run ─────────────────────────────────────────────────────────────────
console.log(`Seeding ${USERS.length} test users → ${url}\n`);
for (const u of USERS) {
  try {
    await upsertUser(u);
  } catch (err) {
    console.error(`  ✗ ${u.email}: ${err.message ?? err}`);
    process.exitCode = 1;
  }
}
console.log('\nDone. Log in with:');
for (const u of USERS) {
  console.log(`  ${u.tier.padEnd(8)} ${u.email}  /  ${u.password}`);
}

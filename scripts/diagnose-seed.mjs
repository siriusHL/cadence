#!/usr/bin/env node
// Read-only diagnostic for the seed script. Verifies env loading, the
// Supabase admin connection, lists any test users that were created, and
// inspects the subscriptions row for each. No writes — just reports.

import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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
    console.log(`✓ env loaded from ${file}`);
    return file;
  }
  console.log('✗ no env file found (looked for env.txt, .env.local, .env)');
  return null;
}

loadEnvFromFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${url ? url.replace(/(https?:\/\/)([^.]+)/, '$1***') : '(missing)'}`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${key ? `(${key.length} chars)` : '(missing)'}`);

if (!url || !key) {
  console.error('\nMissing env vars. Stopping.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 1) Can we list users at all? Confirms the service role key works.
console.log('\nListing test users …');
let users;
try {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  users = data.users.filter((u) => /@test\.local$/i.test(u.email ?? ''));
  console.log(`  found ${users.length} test users in auth.users`);
  for (const u of users) {
    console.log(`    - ${u.email}  id=${u.id.slice(0, 8)}…  confirmed=${u.email_confirmed_at ? 'yes' : 'NO'}  banned=${u.banned_until ? 'yes' : 'no'}`);
  }
} catch (err) {
  console.error(`  ✗ listUsers failed: ${err.message ?? err}`);
  process.exit(1);
}

// 2) Inspect the subscriptions table schema — try inserting nothing to
//    see what columns are required.
console.log('\nChecking subscriptions table …');
try {
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) {
    console.log('  no test users to look up subscriptions for');
  } else {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('user_id, tier, status')
      .in('user_id', userIds);
    if (error) {
      console.error(`  ✗ select failed: ${error.message}`);
    } else {
      console.log(`  found ${data.length} subscription rows for test users`);
      for (const row of data) {
        const u = users.find((x) => x.id === row.user_id);
        console.log(`    - ${u?.email ?? row.user_id}  tier=${row.tier}  status=${row.status}`);
      }
      // Highlight users with NO subscription row
      for (const u of users) {
        if (!data.find((r) => r.user_id === u.id)) {
          console.log(`    ! ${u.email} has no subscriptions row — tier defaults to "free"`);
        }
      }
    }
  }
} catch (err) {
  console.error(`  ✗ ${err.message ?? err}`);
}

// 3) Try a no-op test login as one user to see the actual auth error.
if (users.length > 0) {
  const probe = users[0];
  console.log(`\nTrying to sign in as ${probe.email} with the expected password …`);
  const pw = probe.email.startsWith('free@')    ? 'free1234'
           : probe.email.startsWith('premium@') ? 'premium1234'
           : probe.email.startsWith('elite@')   ? 'elite1234'
           : null;
  if (!pw) {
    console.log('  skipped — unknown user');
  } else {
    const probeClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    // Use the ANON-style flow via signInWithPassword. We still pass the
    // service-role key as the apikey, but Supabase will validate the
    // password against the user.
    const { data, error } = await probeClient.auth.signInWithPassword({
      email: probe.email,
      password: pw,
    });
    if (error) {
      console.error(`  ✗ ${error.message}`);
    } else {
      console.log(`  ✓ login works — user.id=${data.user?.id.slice(0, 8)}…`);
    }
  }
}

console.log('\nDone.');

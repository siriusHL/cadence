#!/usr/bin/env node
// Read-only — lists every auth user in the project + their subscription tier.

import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const file of ['env.txt', '.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const v = m[2].replace(/^['"]|['"]$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
  break;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing env vars'); process.exit(1); }

const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: { users }, error } = await sb.auth.admin.listUsers({ perPage: 200 });
if (error) { console.error(error.message); process.exit(1); }

const ids = users.map((u) => u.id);
const { data: subs } = await sb.from('subscriptions').select('user_id, tier, status').in('user_id', ids);
const subByUser = new Map((subs ?? []).map((s) => [s.user_id, s]));

console.log(`\n${users.length} user(s) in auth.users:\n`);
console.log('  ' + 'email'.padEnd(38) + 'tier'.padEnd(10) + 'status'.padEnd(12) + 'confirmed');
console.log('  ' + '-'.repeat(75));
for (const u of users.sort((a, b) => (a.email ?? '').localeCompare(b.email ?? ''))) {
  const sub = subByUser.get(u.id);
  console.log(
    '  ' +
    (u.email ?? '(no email)').padEnd(38) +
    (sub?.tier ?? '(no row)').padEnd(10) +
    (sub?.status ?? '—').padEnd(12) +
    (u.email_confirmed_at ? 'yes' : 'no')
  );
}
console.log();

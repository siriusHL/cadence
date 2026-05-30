#!/usr/bin/env node
/**
 * Seed (or refresh) a single DRAFT Insights article used as an e2e/demo
 * fixture — so the admin moderation board has something to review and the
 * publish/unpublish flow has a safe, dedicated target (never the real
 * published articles).
 *
 *   node scripts/seed-e2e-insights.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from env.txt /
 * .env.local. Idempotent: upserts on the slug and always resets status back
 * to 'draft', so a prior publish-then-fail test run can't leave it published.
 *
 * This is TEST/DEMO data and intentionally NOT part of migration 0017 (prod
 * shouldn't carry a fake draft). The content is original prose.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SLUG = 'e2e-draft-sample';
const CATEGORY_SLUG = 'personal-finance';

const BODY = `Dollar-cost averaging (DCA) is the simple habit of investing a fixed amount of money on a regular schedule — say, the same sum every month — regardless of what the market is doing that week.

## How it works

Instead of trying to pick the perfect moment to invest a lump sum, you split your contributions over time. When prices are high your fixed amount buys fewer shares; when prices are low it buys more. Over many purchases your average cost per share smooths out.

## Why people use it

The main benefit is behavioural. DCA removes the pressure to time the market and turns investing into a routine you can stick to. It also limits the regret of investing everything just before a downturn.

## The trade-off

DCA is not guaranteed to beat investing a lump sum. Because markets rise more often than they fall, a lump sum invested earlier is in the market longer and frequently ends up ahead on average. DCA trades some of that expected return for a smoother, lower-stress path — a trade many investors are happy to make.

## The bottom line

Dollar-cost averaging is less about maximising returns and more about building a durable habit. For most people, investing steadily and automatically beats waiting for a perfect entry point that never quite arrives.`;

const FAQ = [
  { q: 'Is dollar-cost averaging better than investing a lump sum?', a: 'Not usually in pure return terms — because markets tend to rise over time, a lump sum invested earlier is often ahead on average. DCA trades some expected return for a smoother, lower-stress experience.' },
  { q: 'How often should I invest with DCA?', a: 'Any regular cadence works — monthly is common because it lines up with most people’s income. Consistency matters more than the exact interval.' },
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

const { data: cat, error: catErr } = await sb
  .from('insights_categories')
  .select('id')
  .eq('slug', CATEGORY_SLUG)
  .maybeSingle();
if (catErr) { console.error(`category lookup failed: ${catErr.message}`); process.exit(1); }
if (!cat) { console.error(`category '${CATEGORY_SLUG}' not found — apply migration 0017 first.`); process.exit(1); }

const row = {
  slug: SLUG,
  category_id: cat.id,
  title: 'Dollar-Cost Averaging: Investing on a Fixed Schedule',
  summary: 'Dollar-cost averaging means investing a fixed amount on a regular schedule. Here is how it works, why people use it, and the trade-off against investing a lump sum.',
  body_md: BODY,
  author_name: 'Cadence Editorial',
  status: 'draft',
  published_at: null,
  reading_time_min: 4,
  seo_title: 'Dollar-Cost Averaging Explained | Cadence',
  meta_description: 'What dollar-cost averaging is, why investors use it, and how it compares to investing a lump sum.',
  keywords: ['dollar-cost averaging', 'DCA', 'investing habit', 'lump sum'],
  faq: FAQ,
  sources: [{ label: 'General investing concepts (dollar-cost averaging) — public domain' }],
};

const { error } = await sb
  .from('insights_articles')
  .upsert(row, { onConflict: 'slug' });
if (error) { console.error(`upsert failed: ${error.message}`); process.exit(1); }

console.log(`✓ seeded DRAFT fixture '${SLUG}' (status=draft) → ${url.replace(/(https:\/\/)([^.]+)/, '$1***')}`);

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Branch naming

Always create branches with one of these prefixes:

- `feature/` — new functionality
- `bugfix/` — fixes to existing behavior
- `migration/` — schema or data migrations
- `refacto/` — refactors with no behavior change

Don't use `claude/`, `chore/`, `wip/`, or anything else.

# Committing — only on request, only when e2e is green

1. **Never commit until the operator explicitly asks.** Keep all changes
   local in the working tree until then — no commits, no pushes on your own
   initiative.
2. **When asked to commit, run the full e2e suite locally first**
   (`pytest -c tests/e2e/pytest.ini tests/e2e`). If anything fails, fix the
   code or the test (whichever is wrong) and re-run until the **whole suite
   is green** — then commit. Never commit on a red or unrun suite.

# E2E tests are part of "done" — write them, run them, keep them green

Whenever you add or change a user-facing feature, page, route, or behaviour,
do all of this in the **same change, without being asked**:

1. **Write or extend** the matching Selenium e2e test(s) under `tests/e2e/`.
2. **Run the suite locally and watch it actually pass** — never assume.
3. **If anything fails, fix it** (the code or the test, whichever is wrong)
   and re-run. **Do not commit until the whole suite is green.**
4. **Update `tests/e2e/TEST_PLAN.md`** with the new/changed case (its risk +
   test-design technique) so the plan stays in sync with the suite.

(Pure refactors with no behaviour change and internal-only `src/lib` changes
with no UI/API effect are exempt — use judgment.)

**Structure** — one folder per category, one file per sub-category:
`cross_cutting/` (markers `smoke`/`auth`/`tier`/`caps`/`nfr`/`visual`),
`financial/` (`data`/`charts`), `mutations/` (`flows`), `public/`,
`free_tier/`, `acceptance/`. Markers are `--strict-markers`, so use one
registered in `pytest.ini`. New route → the list in
`cross_cutting/test_reachability.py`; new chart → `financial/`; new mutation
guard → `mutations/` (assert via the API on **rejected/safe paths only** —
never mutate real data so the suite stays repeatable).

**Conventions:** import shared helpers from `helpers` (never
`from conftest import ...`); **always wait before asserting or screenshotting**
(`goto`/`screenshot`/`wait_*`, never `time.sleep`, never a fast screenshot);
use the tier fixtures (`authed`/`as_free`/`as_premium`/`as_elite`) and the
in-browser `api()` helper for API-contract checks; `present_or_skip(...)` /
`pytest.skip(...)` when a precondition (seeded data, tier, holdings) is missing
— skip cleanly, don't fail; decorate with `@allure.feature/@allure.story` +
the right `@pytest.mark.*`; start files with `from __future__ import annotations`.

**Run it** (app on `http://localhost:3000`; prefer a prod build —
`npm run build && npm run start` — it's faster and matches CI):

```
pytest -c tests/e2e/pytest.ini tests/e2e            # whole suite
pytest -c tests/e2e/pytest.ini tests/e2e/financial  # one category
pytest -c tests/e2e/pytest.ini tests/e2e -m tier    # one marker
```

See `tests/e2e/README.md` for setup (seeding users + portfolio, headed mode,
reports).

# Performance: optimize code, never regress it

Write efficient code by default and prefer the cheapest correct approach.
New features and changes **must not degrade app performance**.

- Default to React Server Components; add `"use client"` only when a
  component genuinely needs interactivity or browser APIs — client
  components ship JS and grow the bundle.
- Fetch on the server where possible and avoid client request waterfalls.
  Use the existing React Query setup for client caching and the cache
  helpers in `src/lib/cache.ts` for server-side reuse — don't refetch what's
  already cached.
- Query only what you need: `select` specific columns (never `*`), filter
  and paginate in Supabase, and avoid N+1 round-trips.
- Keep the client bundle lean: `dynamic()`-import heavy or rarely-used code
  (e.g. `xlsx`, large chart views) so it stays out of the initial load.
- Avoid expensive work in render; memoize derived values and stabilize
  props/callbacks so charts and lists don't re-render needlessly.
- No blocking or unbounded work on the request path; stream or paginate
  large data sets.

When a change touches a hot path, sanity-check the cost (bundle size, query
count, re-renders) instead of assuming it's fine.

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

# E2E tests are part of "done" (do this automatically)

Whenever you add or change a user-facing feature, page, route, or behavior
in the app, **add or update the matching Selenium e2e test(s) in
`tests/e2e/` as part of the same change — without being asked.** A feature
is not complete until its e2e coverage exists. (Pure refactors with no
behavior change and internal-only `src/lib` changes with no UI effect are
exempt — use judgment.)

Pick the layer that fits (markers are `--strict-markers`, so use one of these):

- New/changed **route or page** → add it to the parametrized list in
  `test_smoke.py` (`PUBLIC_ROUTES` or `APP_ROUTES`). Marker `smoke`.
- New/changed **data rendering** (tables, totals, counts) → `test_data.py`. Marker `data`.
- New/changed **chart** → `test_charts.py`. Marker `charts`.
- New **mutation flow** (create / delete / switch portfolio, form submit) →
  `test_flows.py` (create the file when first needed; marker `flows` is
  already registered). Marker `flows`.

Follow the existing conventions:

- Start files with `from __future__ import annotations`.
- Use the `authed` fixture for `/app/*` routes, `driver` for public pages.
- Use **explicit** `WebDriverWait` waits (never `time.sleep`); the suite sets `implicitly_wait(0)`.
- Call `drain_console(driver)` before navigating and assert
  `severe_console_errors(driver)` is empty; embed `attach_screenshot(...)`.
- Decorate with `@allure.feature/@allure.story` and the right `@pytest.mark.*`.
- `pytest.skip(...)` cleanly when prerequisites (creds, holdings) are missing.

Then run the suite and make sure it passes before calling the task done
(app must be running on `http://localhost:3000`):

```
pytest -c tests/e2e/pytest.ini tests/e2e            # whole suite
pytest -c tests/e2e/pytest.ini tests/e2e -m smoke   # one layer
```

See `tests/e2e/README.md` for setup (seeding test users, headed mode, reports).

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

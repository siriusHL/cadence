# Cadence E2E suite (Selenium + pytest + Allure)

A single browser-driven suite that walks every page, checks the data and
charts rendered, and produces an Allure HTML report. Runs locally and as a
required check on pull requests.

## Structure

Organised by **category folder**, with a **file per sub-category**, tracing
the risk-based design in [`TEST_PLAN.md`](./TEST_PLAN.md). Shared,
dependency-light helpers live in `helpers/` — every helper **waits for the
page to settle before asserting or screenshotting** (explicit waits only, no
`time.sleep`, no fast screenshots).

| Folder | Markers | Covers |
|--------|---------|--------|
| `cross_cutting/` | `smoke` `auth` `tier` `caps` `nfr` | Reachability crawl, authentication, tier-gating (tier × screen), capacity caps, perf/secret spot-checks — tested once, parametrised. |
| `financial/` | `data` `charts` `visual` | Dashboard, holdings, dividends, performance, diversification, tax — data consistency + chart structure + geometry sanity. |
| `mutations/` | `flows` | Add-holding, portfolios, account — input-validation & guard rejections via the API (non-destructive: rejected paths only). |
| `public/` | `public` | Landing + pricing marketing pages (logged-out). |
| `free_tier/` | `free` | Free-tier screens render for a free user. |
| `acceptance/` | `acceptance` | Cross-page use-case journeys (read-only subset). |

The `data` / `charts` / `visual` cases and the acceptance journey need the
elite account to hold a portfolio — they `skip` cleanly otherwise (see
seeding below). Destructive journeys (signup, checkout, delete-account) stay
manual per the plan.

## Run it locally

1. Have the app running. For a fast, stable run prefer a **production build**
   (pre-compiled, matches CI): `npm run build && npm run start`
   (→ http://localhost:3000). `npm run dev` works too, but first-hit route
   compiles are slow.
2. Install deps (once):
   ```
   python -m pip install -r tests/e2e/requirements.txt
   ```
3. Get a test account. Seed the three tiered users once (creates them in
   the Supabase project from `env.txt` and writes their credentials to
   `tests/e2e/test-users.json`, which is gitignored):
   ```
   npm run seed:e2e-users
   ```
   The suite then auto-logs-in as the **elite** user (full screen access).
   Override the tier with `E2E_TIER=free|premium|elite`. Or set creds
   explicitly (these win over the file, and are what CI uses via secrets):
   ```
   E2E_EMAIL=you@example.com
   E2E_PASSWORD=••••••••
   ```
   Finally, give the **elite** user a portfolio so the data / chart / tax
   tests assert instead of skipping (idempotent — safe to re-run):
   ```
   E2E_BASE_URL=http://localhost:3000 python tests/e2e/_seed_portfolio.py
   ```
4. Run:
   ```
   pytest -c tests/e2e/pytest.ini tests/e2e --alluredir=tests/e2e/.allure-results
   ```
5. View the report. Two options:
   - **Simple (double-click):** add `--html=tests/e2e/report.html
     --self-contained-html` to the pytest command above — produces one
     self-contained `report.html` you open directly. CI uploads this as
     the `report-html` artifact.
   - **Rich (Allure):** `allure serve tests/e2e/.allure-results`
     (needs the Allure CLI — `scoop install allure`). The Allure
     `index.html` is a fetch-based SPA, so it shows "Failed to fetch" if
     you open it from disk — serve it over HTTP (`allure serve`, or
     `python -m http.server` in the report folder) or open the
     `complete.html` that CI inlines.

### Watch the browser

Set `E2E_HEADLESS=0` to run headed locally.

### Run a single category or marker

```
pytest -c tests/e2e/pytest.ini tests/e2e/financial   # one category folder
pytest -c tests/e2e/pytest.ini tests/e2e -m tier      # one marker
```

## Configuration

| Env var        | Default                  | Purpose |
|----------------|--------------------------|---------|
| `E2E_BASE_URL` | `http://localhost:3000`  | App under test. In CI this points at the preview/seeded deploy. |
| `E2E_EMAIL`    | —                        | Test-user login. Authed tests skip if unset. |
| `E2E_PASSWORD` | —                        | Test-user password. |
| `E2E_HEADLESS` | `1`                      | `0` to watch the browser. |
| `E2E_TIER`     | `elite`                  | Which seeded tier `authed` logs in as (`free`/`premium`/`elite`). |

Credentials come from CI secrets in GitHub Actions; never commit them.
Selenium 4.6+ auto-provisions chromedriver, so no driver install is needed.

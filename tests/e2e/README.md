# Cadence E2E suite (Selenium + pytest + Allure)

A single browser-driven suite that walks every page, checks the data and
charts rendered, and produces an Allure HTML report. Runs locally and as a
required check on pull requests.

## Layers

| File | Marker | What it does |
|------|--------|--------------|
| `test_smoke.py`  | `smoke`  | Crawls every public + app route — asserts it mounts and the console has no errors. |
| `test_data.py`   | `data`   | Clock-independent data integrity — holdings table renders real rows, "N of N" count matches, totals are numeric, dashboard value parses positive. |
| `test_charts.py` | `charts` | Chart structure (rhythm bar count + Now marker + ticks, forecast bars + cumulative dots, donut segments) + embedded chart screenshots. |
| `test_flows.py`  | `flows`  | (next phase) Drives create / delete / switch-portfolio mutations. |

The `data` and `charts` layers require the test account to have a
portfolio with holdings — they `skip` cleanly on an empty account. Seed a
fixture portfolio (next phase) to make them run in CI.

## Run it locally

1. Have the app running (`npm run dev` → http://localhost:3000).
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

### Run a single layer

```
pytest -c tests/e2e/pytest.ini tests/e2e -m smoke
```

## Configuration

| Env var        | Default                  | Purpose |
|----------------|--------------------------|---------|
| `E2E_BASE_URL` | `http://localhost:3000`  | App under test. In CI this points at the preview/seeded deploy. |
| `E2E_EMAIL`    | —                        | Test-user login. Authed tests skip if unset. |
| `E2E_PASSWORD` | —                        | Test-user password. |
| `E2E_HEADLESS` | `1`                      | `0` to watch the browser. |

Credentials come from CI secrets in GitHub Actions; never commit them.
Selenium 4.6+ auto-provisions chromedriver, so no driver install is needed.

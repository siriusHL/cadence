"""Shared pytest fixtures + self-contained HTML reporting for the Cadence
Selenium E2E suite.

Configuration is read from environment variables (CI) with a local fallback
to env.txt / .env.local at the repo root and the seeded
`tests/e2e/test-users.json` (free / premium / elite). Selenium 4.6+
auto-provisions chromedriver via Selenium Manager, so no driver binary is
needed.

    E2E_BASE_URL   base URL of the running app  (default http://localhost:3000)
    E2E_EMAIL      login email (CI; overrides the seed file for E2E_TIER)
    E2E_PASSWORD   login password (CI)
    E2E_TIER       which tier `authed` logs in as (default elite)
    E2E_HEADLESS   "0" to watch the browser locally (default headless)
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path

import allure
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

# Make the sibling `_report` module and `helpers` package importable
# regardless of pytest's import-mode / rootdir.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _report import render as render_report, render_markdown  # noqa: E402
from helpers.waits import DEFAULT_TIMEOUT  # noqa: E402

# Re-exported so the legacy flat tests still import cleanly during migration.
from helpers.console import drain_console, severe_console_errors  # noqa: E402,F401

REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_env_files() -> None:
    """Populate os.environ from env.txt / .env.local without overriding
    values already set (so CI-provided secrets always win)."""
    for name in ("env.txt", ".env.local", ".env"):
        f = REPO_ROOT / name
        if not f.exists():
            continue
        for raw in f.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))
        break


_load_env_files()


def _seeded_users() -> dict:
    """All seeded tier users from tests/e2e/test-users.json (gitignored)."""
    f = Path(__file__).resolve().parent / "test-users.json"
    if not f.exists():
        return {}
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return {}


SEEDED = _seeded_users()
BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:3000").rstrip("/")
DEFAULT_TIER = os.environ.get("E2E_TIER", "elite")
_ENV_EMAIL = os.environ.get("E2E_EMAIL", "")
_ENV_PASSWORD = os.environ.get("E2E_PASSWORD", "")


def creds_for(tier: str) -> tuple[str, str]:
    """(email, password) for a tier. Explicit env creds win for the default
    tier (the CI path); otherwise fall back to the seeded users file."""
    if _ENV_EMAIL and tier == DEFAULT_TIER:
        return _ENV_EMAIL, _ENV_PASSWORD
    u = SEEDED.get(tier) or {}
    return u.get("email", ""), u.get("password", "")


@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


@pytest.fixture(scope="session")
def driver():
    opts = Options()
    if os.environ.get("E2E_HEADLESS", "1") != "0":
        opts.add_argument("--headless=new")
    opts.add_argument("--window-size=1440,900")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    # Capture the browser console so we can assert "no SEVERE errors".
    opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})

    drv = webdriver.Chrome(options=opts)
    # Against a pre-compiled prod build pages are fast; keep timeouts tight
    # so a genuinely hung route fails quickly rather than stalling the run.
    drv.set_page_load_timeout(60)
    drv.set_script_timeout(10)  # execute_async_script (paint-settle on screenshots)
    drv.implicitly_wait(0)  # explicit waits everywhere
    yield drv
    drv.quit()


def _login(driver, base_url: str, email: str, password: str) -> None:
    driver.get(f"{base_url}/login")
    w = WebDriverWait(driver, DEFAULT_TIMEOUT)
    email_in = w.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type=email]"))
    )
    email_in.clear()
    email_in.send_keys(email)
    pw_in = driver.find_element(By.CSS_SELECTOR, "input[type=password]")
    pw_in.clear()
    pw_in.send_keys(password)
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    # Login redirects to /app, which dispatches to /app/home or /app/dashboard
    # by tier. Wait until we've left /login and reached /app.
    w.until(lambda d: "/login" not in d.current_url and "/app" in d.current_url)


def ensure_tier(driver, base_url: str, tier: str):
    """Log the session driver in as `tier`, switching users only when it
    differs from the current one (keeps the suite fast). Skips cleanly when
    that tier has no seeded credentials."""
    email, password = creds_for(tier)
    if not email or not password:
        pytest.skip(f"no credentials for '{tier}' — seed via `npm run seed:e2e-users`")
    if getattr(driver, "_tier", None) == tier:
        return driver
    driver.delete_all_cookies()
    with allure.step(f"Log in as {tier} ({email})"):
        _login(driver, base_url, email, password)
    driver._tier = tier
    return driver


@pytest.fixture
def authed(driver, base_url):
    """Driver logged in as the default tier (elite locally / E2E_TIER in CI)."""
    return ensure_tier(driver, base_url, DEFAULT_TIER)


@pytest.fixture
def as_free(driver, base_url):
    return ensure_tier(driver, base_url, "free")


@pytest.fixture
def as_premium(driver, base_url):
    return ensure_tier(driver, base_url, "premium")


@pytest.fixture
def as_elite(driver, base_url):
    return ensure_tier(driver, base_url, "elite")


@pytest.fixture
def creds():
    """Expose the creds_for(tier) lookup so tests can fetch a tier's login
    (e.g. to drive a wrong-password attempt)."""
    return creds_for


def attach_screenshot(driver, name: str) -> None:
    """Legacy shim kept for the pre-migration flat tests. New tests use
    `helpers.screenshot`, which waits for the page to settle first."""
    from helpers.ui import screenshot

    screenshot(driver, name)


# --------------------------------------------------------------------------
# Custom self-contained HTML report  ->  tests/e2e/report.html
#
# One flat result record per test, rendered into a single dependency-free
# report at session end (CSS inlined, no fetch/external assets). Each test's
# end-state screenshot is embedded (base64) behind a per-row "click to
# reveal" toggle. Renderer lives in _report.py.
# --------------------------------------------------------------------------

_RESULTS: dict[str, dict] = {}
_SHOTS: dict[str, str] = {}  # nodeid -> base64 PNG of the test's end state
_RUN_META: dict = {}
REPORT_PATH = Path(__file__).resolve().parent / "report.html"

# Fixtures that hand back a live WebDriver, in priority order, so the report
# hook can grab an end-of-test screenshot whichever one a test used.
_DRIVER_FIXTURES = ("authed", "as_elite", "as_premium", "as_free", "driver")


def pytest_sessionstart(session):  # noqa: ARG001
    _RUN_META["start"] = datetime.now()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):  # noqa: ARG001
    """Grab the live driver's screenshot at the end of each test body."""
    outcome = yield
    report = outcome.get_result()
    if report.when != "call":
        return
    drv = next((item.funcargs[n] for n in _DRIVER_FIXTURES if n in item.funcargs), None)
    if drv is None:
        return
    try:
        _SHOTS[item.nodeid] = drv.get_screenshot_as_base64()
    except Exception:  # noqa: BLE001 — screenshotting must never break a run
        pass


def _skip_reason(report) -> str:
    lr = report.longrepr
    if isinstance(lr, tuple) and len(lr) == 3:
        reason = str(lr[2])
        return reason.removeprefix("Skipped: ").strip() or reason
    return str(lr)


def pytest_runtest_logreport(report):
    rec = _RESULTS.setdefault(
        report.nodeid,
        {"nodeid": report.nodeid, "status": None, "dur": 0.0, "error": None},
    )
    rec["dur"] += report.duration or 0.0
    if report.failed:
        rec["status"] = "failed"
        rec["error"] = str(report.longrepr)
    elif report.skipped and rec["status"] != "failed":
        rec["status"] = "skipped"
        rec["error"] = _skip_reason(report)
    elif report.when == "call" and report.passed and rec["status"] is None:
        rec["status"] = "passed"


def pytest_sessionfinish(session, exitstatus):  # noqa: ARG001
    try:
        meta = {
            "start": _RUN_META.get("start", datetime.now()),
            "end": datetime.now(),
            "base_url": BASE_URL,
            "browser": "Chrome (headless)"
            if os.environ.get("E2E_HEADLESS", "1") != "0"
            else "Chrome",
            "account": f"{DEFAULT_TIER} tier",
        }
        records = [r for r in _RESULTS.values() if r["status"]]
        for r in records:
            r["shot"] = _SHOTS.get(r["nodeid"])
        REPORT_PATH.write_text(render_report(records, meta), encoding="utf-8")
        summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary_path:
            with open(summary_path, "a", encoding="utf-8") as fh:
                fh.write(render_markdown(records, meta))
    except Exception:  # noqa: BLE001 — reporting must never break the run
        pass

"""Shared pytest fixtures for the Cadence Selenium E2E suite.

Configuration is read from environment variables (CI) falling back to a
local `env.txt` / `.env.local` at the repo root so the suite runs the same
way locally and in GitHub Actions:

    E2E_BASE_URL    base URL of the running app   (default http://localhost:3000)
    E2E_EMAIL       login email for the test user
    E2E_PASSWORD    login password for the test user
    E2E_HEADLESS    "0" to watch the browser locally (default headless)

Selenium 4.6+ auto-provisions chromedriver via Selenium Manager, so no
driver binary needs to be on PATH.
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

# Make the sibling `_report` module importable regardless of pytest's
# rootdir / import-mode, then pull in the standalone HTML report renderer.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _report import render as render_report, render_markdown  # noqa: E402

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


def _creds_from_seed_file() -> dict | None:
    """Fall back to the seeded credentials in tests/e2e/test-users.json
    (written by scripts/seed-e2e-users.mjs) when E2E_EMAIL isn't set.

    Defaults to the `elite` user so the authed + chart tests can reach
    every screen; override with E2E_TIER=free|premium|elite.
    """
    f = Path(__file__).resolve().parent / "test-users.json"
    if not f.exists():
        return None
    try:
        users = json.loads(f.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return None
    tier = os.environ.get("E2E_TIER", "elite")
    return users.get(tier) or next(iter(users.values()), None)


BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:3000").rstrip("/")
E2E_EMAIL = os.environ.get("E2E_EMAIL", "")
E2E_PASSWORD = os.environ.get("E2E_PASSWORD", "")

# Local convenience: if no creds in the environment, use the seeded
# users file. CI always provides E2E_EMAIL/PASSWORD via secrets, which
# take precedence.
if not E2E_EMAIL:
    _seeded = _creds_from_seed_file()
    if _seeded:
        E2E_EMAIL = _seeded["email"]
        E2E_PASSWORD = _seeded["password"]


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
    # Capture the browser console so smoke tests can assert "no errors".
    opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})

    drv = webdriver.Chrome(options=opts)
    # Generous page-load timeout: against a dev server (`npm run dev`),
    # the first hit to each route triggers an on-demand Turbopack compile
    # that can take tens of seconds. A production `next start` (CI) is
    # pre-compiled and fast, so this only bites local dev runs.
    drv.set_page_load_timeout(90)
    drv.implicitly_wait(0)  # we use explicit waits everywhere
    yield drv
    drv.quit()


@pytest.fixture(scope="session")
def authed(driver, base_url):
    """Log the test user in once for the whole session and return the driver.

    Skips (rather than fails) the dependent tests when no credentials are
    configured, so the public-page smoke tests can still run standalone.
    """
    if not E2E_EMAIL or not E2E_PASSWORD:
        pytest.skip("E2E_EMAIL / E2E_PASSWORD not set — skipping authed tests")

    with allure.step(f"Log in as {E2E_EMAIL}"):
        driver.get(f"{base_url}/login")
        wait = WebDriverWait(driver, 60)
        email_in = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type=email]"))
        )
        email_in.clear()
        email_in.send_keys(E2E_EMAIL)
        pw_in = driver.find_element(By.CSS_SELECTOR, "input[type=password]")
        pw_in.clear()
        pw_in.send_keys(E2E_PASSWORD)
        driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
        # Login redirects to /app, which dispatches to /app/home or
        # /app/dashboard depending on tier. Wait until we've left /login.
        wait.until(lambda d: "/login" not in d.current_url and "/app" in d.current_url)

    return driver


def attach_screenshot(driver, name: str) -> None:
    """Embed a PNG screenshot in the Allure report."""
    allure.attach(
        driver.get_screenshot_as_png(),
        name=name,
        attachment_type=allure.attachment_type.PNG,
    )


# Console-noise allowlist — messages that are not real app errors.
_CONSOLE_NOISE = (
    "favicon.ico",
    "Download the React DevTools",
    "Failed to load resource: the server responded with a status of 404",  # missing logos etc.
    "[Fast Refresh]",
)


def drain_console(driver) -> None:
    """Discard any pending browser-console entries.

    The WebDriver console log is session-cumulative and only cleared when
    read. Call this right before navigating so a test's no-errors check
    can't pick up errors bled from the previous test's page.
    """
    try:
        driver.get_log("browser")
    except Exception:  # noqa: BLE001 — some drivers don't expose logs
        pass


def severe_console_errors(driver) -> list[str]:
    """Return SEVERE browser-console messages, minus known benign noise."""
    out: list[str] = []
    try:
        logs = driver.get_log("browser")
    except Exception:  # noqa: BLE001 — some drivers don't expose logs
        return out
    for entry in logs:
        if entry.get("level") != "SEVERE":
            continue
        msg = entry.get("message", "")
        if any(n in msg for n in _CONSOLE_NOISE):
            continue
        out.append(msg)
    return out


# --------------------------------------------------------------------------
# Custom self-contained HTML report  ->  tests/e2e/report.html
#
# Collect one flat result record per test and render a single, dependency-
# free report at session end: all CSS inlined, no fetch()/external assets.
# Each test's end-state screenshot is embedded (base64) behind a per-row
# "click to reveal" toggle, so the file stays portable (no broken links)
# and opens by double-click — no HTTP server, no "Failed to fetch". The
# renderer lives in _report.py.
# --------------------------------------------------------------------------

_RESULTS: dict[str, dict] = {}
_SHOTS: dict[str, str] = {}  # nodeid -> base64 PNG of the test's end state
_RUN_META: dict = {}
REPORT_PATH = Path(__file__).resolve().parent / "report.html"


def pytest_sessionstart(session):  # noqa: ARG001
    _RUN_META["start"] = datetime.now()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):  # noqa: ARG001
    """Grab the live driver's screenshot at the end of each test body, so
    the report can offer a click-to-reveal shot per test."""
    outcome = yield
    report = outcome.get_result()
    if report.when != "call":
        return
    drv = item.funcargs.get("authed") or item.funcargs.get("driver")
    if drv is None:
        return
    try:
        _SHOTS[item.nodeid] = drv.get_screenshot_as_base64()
    except Exception:  # noqa: BLE001 — screenshotting must never break a run
        pass


def _skip_reason(report) -> str:
    """Pull a clean reason string out of a skipped report's longrepr
    (which is a (path, lineno, 'Skipped: <reason>') tuple)."""
    lr = report.longrepr
    if isinstance(lr, tuple) and len(lr) == 3:
        reason = str(lr[2])
        return reason.removeprefix("Skipped: ").strip() or reason
    return str(lr)


def pytest_runtest_logreport(report):
    """Accumulate per-test status across setup/call/teardown phases."""
    rec = _RESULTS.setdefault(
        report.nodeid,
        {"nodeid": report.nodeid, "status": None, "dur": 0.0, "error": None},
    )
    rec["dur"] += report.duration or 0.0
    if report.failed:  # any phase failing wins
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
            "account": f"{os.environ.get('E2E_TIER', 'elite')} tier"
            if E2E_EMAIL
            else "anonymous",
        }
        records = [r for r in _RESULTS.values() if r["status"]]
        for r in records:
            r["shot"] = _SHOTS.get(r["nodeid"])
        REPORT_PATH.write_text(render_report(records, meta), encoding="utf-8")
        # In CI, also render the report inline on the run's Summary page
        # (no artifact download / unzip needed). No-op locally.
        summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary_path:
            with open(summary_path, "a", encoding="utf-8") as fh:
                fh.write(render_markdown(records, meta))
    except Exception:  # noqa: BLE001 — reporting must never break the run
        pass

"""Pillar 1 — page reachability smoke crawl.

For every route we assert:
  * the page mounts (a landmark element appears, or it cleanly redirects
    to a tier-gate / auth page rather than erroring),
  * the browser console has no SEVERE errors (minus known noise),
  * a screenshot is captured into the Allure report.

These tests need no fixture data — they only prove "nothing is on fire".
"""

from __future__ import annotations

import allure
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from conftest import attach_screenshot, drain_console, severe_console_errors

# Landmark that proves a page actually rendered something meaningful.
LANDMARK = (
    By.CSS_SELECTOR,
    "h1, [role=tablist], .cdn-pro, .cdn-free, main, form",
)

PUBLIC_ROUTES = [
    "/",
    "/login",
    "/signup",
    "/pricing",
]

# Authenticated app routes. A route "passes" if it renders a landmark —
# routes the test user's tier can't reach cleanly redirect to /upgrade,
# which still renders, so that's acceptable (not an error).
APP_ROUTES = [
    "/app/dashboard",
    "/app/holdings",
    "/app/dividends",
    "/app/dividends?tab=forecast",
    "/app/dividends?tab=simulator",
    "/app/dividends?tab=year",
    "/app/performance",
    "/app/diversification",
    "/app/tax",
    "/app/alerts",
    "/app/calendar",
    "/app/forecast",
    "/app/portfolios",
    "/app/profile",
    "/app/settings",
    "/app/account",
    "/app/messages",
    # Free-tier screens + utility routes — render for any tier or cleanly
    # redirect, so the landmark check still holds.
    "/app/home",
    "/app/next",
    "/app/stocks",
    "/app/year",
    "/app/add",
]


def _load_and_check(driver, url: str, label: str) -> None:
    with allure.step(f"GET {url}"):
        drain_console(driver)  # isolate console errors to this page
        driver.get(url)
        WebDriverWait(driver, 60).until(
            EC.presence_of_element_located(LANDMARK)
        )
    attach_screenshot(driver, label)
    errors = severe_console_errors(driver)
    assert not errors, f"Console errors on {url}:\n" + "\n".join(errors)


@allure.feature("Smoke")
@allure.story("Public pages")
@pytest.mark.smoke
@pytest.mark.parametrize("route", PUBLIC_ROUTES, ids=lambda r: r)
def test_public_page_loads(driver, base_url, route):
    _load_and_check(driver, f"{base_url}{route}", f"public{route}")


@allure.feature("Smoke")
@allure.story("App pages")
@pytest.mark.smoke
@pytest.mark.parametrize("route", APP_ROUTES, ids=lambda r: r.replace("/app/", "").replace("?", "_"))
def test_app_page_loads(authed, base_url, route):
    _load_and_check(authed, f"{base_url}{route}", f"app{route}")

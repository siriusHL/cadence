"""§6.4 Navigation & reachability (R5) — page-reachability smoke crawl.

Every public + app route mounts a landmark (or cleanly redirects to a page
that does — an under-tier screen redirects to /upgrade, which renders) and
logs no SEVERE browser-console error. Needs no fixture data: it only proves
"nothing is on fire". Cross-cutting, parametrised — not repeated per page.
"""
from __future__ import annotations

import allure
import pytest

from helpers import goto, screenshot, severe_console_errors

PUBLIC_ROUTES = ["/", "/login", "/signup", "/pricing"]

# Crawled as the default (elite) user. Screens a tier can't reach redirect
# to /upgrade, which still renders a landmark, so the check holds either way.
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
    "/app/home",
    "/app/next",
    "/app/stocks",
    "/app/year",
    "/app/add",
]


def _load_and_check(driver, url: str, label: str) -> None:
    goto(driver, url)  # waits for readyState + a landmark
    screenshot(driver, label)  # waits for settle before capturing
    errors = severe_console_errors(driver)
    assert not errors, f"Console errors on {url}:\n" + "\n".join(errors)


@allure.feature("Reachability")
@allure.story("Public pages")
@pytest.mark.smoke
@pytest.mark.parametrize("route", PUBLIC_ROUTES, ids=lambda r: r)
def test_public_page_loads(driver, base_url, route):
    _load_and_check(driver, f"{base_url}{route}", f"public{route}")


@allure.feature("Reachability")
@allure.story("App pages")
@pytest.mark.smoke
@pytest.mark.parametrize(
    "route", APP_ROUTES, ids=lambda r: r.replace("/app/", "").replace("?", "_")
)
def test_app_page_loads(authed, base_url, route):
    _load_and_check(authed, f"{base_url}{route}", f"app{route}")

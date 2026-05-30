"""§6.2 Tier-gating / authorization (R2) — decision table (tier × screen).

Built once and parametrised. Gating is enforced server-side in proxy.ts
(middleware redirect to /upgrade?from=<screen>), so direct-URL access by an
under-tier user is the precise contract under test. All non-destructive.

Tier screen map (src/lib/tiers.ts):
  free    : home, next, stocks, year, add, profile, settings, account, portfolios, messages
  premium : + dashboard, holdings, stock, dividends, performance, diversification
  elite   : + tax, alerts
"""
from __future__ import annotations

import allure
import pytest

from helpers import api, drain_console, goto, wait_url_contains

PAID_SCREENS = ["dashboard", "holdings", "dividends", "performance", "diversification"]
ELITE_SCREENS = ["tax", "alerts"]


def _expect_upgrade(driver, base_url, screen):
    drain_console(driver)
    driver.get(f"{base_url}/app/{screen}")
    wait_url_contains(driver, "/upgrade")
    assert "/upgrade" in driver.current_url, f"{screen}: expected /upgrade, got {driver.current_url}"


def _expect_render(driver, base_url, screen):
    goto(driver, f"{base_url}/app/{screen}")
    assert "/upgrade" not in driver.current_url, f"{screen}: unexpectedly gated → {driver.current_url}"
    assert "/login" not in driver.current_url, f"{screen}: unexpectedly logged out"


@allure.feature("Tier-gating")
@allure.story("free blocked from paid + elite screens by direct URL (TC-TIER-01/02/03)")
@pytest.mark.tier
@pytest.mark.parametrize("screen", PAID_SCREENS + ELITE_SCREENS)
def test_free_blocked_from_locked_screens(as_free, base_url, screen):
    _expect_upgrade(as_free, base_url, screen)


@allure.feature("Tier-gating")
@allure.story("premium blocked from elite-only screens (TC-TIER-03)")
@pytest.mark.tier
@pytest.mark.parametrize("screen", ELITE_SCREENS)
def test_premium_blocked_from_elite_screens(as_premium, base_url, screen):
    _expect_upgrade(as_premium, base_url, screen)


@allure.feature("Tier-gating")
@allure.story("premium reaches premium screens (TC-TIER-04)")
@pytest.mark.tier
@pytest.mark.parametrize("screen", PAID_SCREENS)
def test_premium_reaches_premium_screens(as_premium, base_url, screen):
    _expect_render(as_premium, base_url, screen)


@allure.feature("Tier-gating")
@allure.story("elite reaches every gated screen (TC-TIER-04)")
@pytest.mark.tier
@pytest.mark.parametrize("screen", PAID_SCREENS + ELITE_SCREENS)
def test_elite_reaches_all_screens(as_elite, base_url, screen):
    _expect_render(as_elite, base_url, screen)


@allure.feature("Tier-gating")
@allure.story("Export endpoints require elite → 402 for non-elite (TC-TIER-06)")
@pytest.mark.tier
def test_export_requires_elite(as_premium, base_url):
    res = api(as_premium, "GET", "/api/export/capital-gains-all")
    assert res["status"] == 402, f"expected 402 upgrade_required for premium export, got {res}"


@allure.feature("Tier-gating")
@allure.story("elite bounced from /upgrade — top tier, nothing to buy (TC-TIER-07)")
@pytest.mark.tier
def test_elite_blocked_from_upgrade(as_elite, base_url):
    # /upgrade has its own server-side tier guard (src/app/upgrade/page.tsx):
    # elite is redirected to /app so it can never start a redundant checkout.
    drain_console(as_elite)
    as_elite.get(f"{base_url}/upgrade")
    wait_url_contains(as_elite, "/app")
    assert "/upgrade" not in as_elite.current_url, (
        f"elite should be redirected off /upgrade, got {as_elite.current_url}"
    )


@allure.feature("Tier-gating")
@allure.story("premium reaches /upgrade and sees only the Elite plan (TC-TIER-07)")
@pytest.mark.tier
def test_premium_reaches_upgrade(as_premium, base_url):
    goto(as_premium, f"{base_url}/upgrade")
    assert "/upgrade" in as_premium.current_url, (
        f"premium should see /upgrade, got {as_premium.current_url}"
    )
    assert "/login" not in as_premium.current_url
    # Premium only has Elite left to buy — the redundant Premium card is hidden.
    src = as_premium.page_source
    assert "Upgrade to Elite" in src, "premium should see the Elite option"
    assert "Upgrade to Premium" not in src, "premium should not see a redundant Premium option"

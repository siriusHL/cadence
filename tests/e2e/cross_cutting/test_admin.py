"""§7.6 Admin dashboard (R10) — authz gating + staff operations.

/admin is gated by the ADMIN_EMAILS allowlist (NOT profiles.role). Negative
cases use any non-admin; positive cases use the `admin` fixture, which skips
cleanly when the test admin email isn't allowlisted on the app under test.
Mutating cases (tier override) target e2e-support — a user no other test
depends on for its tier — and always restore it.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse

import allure
import pytest
from selenium.webdriver.common.by import By

from helpers import api, drain_console, goto, screenshot, severe_console_errors, text_of, wait_url_contains

DUMMY_UUID = "00000000-0000-0000-0000-000000000000"
_UID_RE = re.compile(r"/admin/users/([0-9a-fA-F-]{36})")


@pytest.fixture
def admin(as_admin, base_url):
    """as_admin, verified to actually reach /admin; skip if not allowlisted."""
    goto(as_admin, f"{base_url}/admin")
    if "/admin" not in urlparse(as_admin.current_url).path:
        pytest.skip("test admin email not in ADMIN_EMAILS on this app — /admin unreachable")
    return as_admin


def _find_user_id(driver, base_url, query):
    goto(driver, f"{base_url}/admin/users?q={query}")
    for a in driver.find_elements(By.CSS_SELECTOR, "a[href*='/admin/users/']"):
        m = _UID_RE.search(a.get_attribute("href") or "")
        if m:
            return m.group(1)
    return None


@allure.feature("Admin")
@allure.story("Non-admin customer redirected away from /admin (TC-ADM-01)")
@pytest.mark.admin
def test_non_admin_blocked_from_admin(as_elite, base_url):
    drain_console(as_elite)
    as_elite.get(f"{base_url}/admin")
    wait_url_contains(as_elite, "/app")
    assert not urlparse(as_elite.current_url).path.startswith("/admin"), as_elite.current_url


@allure.feature("Admin")
@allure.story("Unauthenticated /admin → /login?next= (TC-ADM-02)")
@pytest.mark.admin
def test_unauthenticated_admin_redirects_to_login(driver, base_url):
    driver.delete_all_cookies()
    driver._tier = None
    drain_console(driver)
    driver.get(f"{base_url}/admin")
    wait_url_contains(driver, "/login")
    assert "/login" in driver.current_url and "next=" in driver.current_url


@allure.feature("Admin")
@allure.story("Admin blocked from /app → bounced to /admin (TC-ADM-03)")
@pytest.mark.admin
def test_admin_blocked_from_app(admin, base_url):
    goto(admin, f"{base_url}/app/dashboard")
    assert "/admin" in urlparse(admin.current_url).path, f"admin not bounced to /admin: {admin.current_url}"


@allure.feature("Admin")
@allure.story("Non-admin calling /api/admin/* → 403 (TC-ADM-04)")
@pytest.mark.admin
def test_non_admin_api_forbidden(as_elite):
    res = api(as_elite, "PATCH", f"/api/admin/users/{DUMMY_UUID}/tier", {"override": "elite"})
    assert res["status"] == 403, f"non-admin should get 403, got {res}"


@allure.feature("Admin")
@allure.story("Overview renders KPI tiles (TC-ADM-05)")
@pytest.mark.admin
def test_admin_overview_renders(admin, base_url):
    goto(admin, f"{base_url}/admin")
    body = text_of(admin.find_element(By.TAG_NAME, "body")).lower()
    assert any(k in body for k in ("users", "portfolios", "holdings", "tier")), "expected admin KPIs"
    screenshot(admin, "admin-overview")
    assert not severe_console_errors(admin)


@allure.feature("Admin")
@allure.story("User search surfaces the matching user (TC-ADM-06)")
@pytest.mark.admin
def test_admin_user_search(admin, base_url):
    goto(admin, f"{base_url}/admin/users?q=e2e-elite")
    body = text_of(admin.find_element(By.TAG_NAME, "body")).lower()
    assert "e2e-elite@example.com" in body, "search should surface e2e-elite"


@allure.feature("Admin")
@allure.story("Tier override: invalid value → 400, unknown user → 404 (TC-ADM-08)")
@pytest.mark.admin
def test_tier_override_invalid_and_unknown(admin):
    bad = api(admin, "PATCH", f"/api/admin/users/{DUMMY_UUID}/tier", {"override": "godmode"})
    assert bad["status"] == 400, f"invalid override should be 400, got {bad}"
    unknown = api(admin, "PATCH", f"/api/admin/users/{DUMMY_UUID}/tier", {"override": "premium"})
    assert unknown["status"] == 404, f"unknown user should be 404, got {unknown}"


@allure.feature("Admin")
@allure.story("Tier override set then clear on a dedicated user (TC-ADM-07)")
@pytest.mark.admin
def test_tier_override_set_and_clear(admin, base_url):
    uid = _find_user_id(admin, base_url, "e2e-support")
    if not uid:
        pytest.skip("could not resolve e2e-support user id from the admin list")
    try:
        r = api(admin, "PATCH", f"/api/admin/users/{uid}/tier", {"override": "premium"})
        assert r["status"] in (200, 204), f"set override failed: {r}"
        goto(admin, f"{base_url}/admin/users/{uid}")
        assert "premium" in text_of(admin.find_element(By.TAG_NAME, "body")).lower(), "detail should reflect override"
    finally:
        api(admin, "PATCH", f"/api/admin/users/{uid}/tier", {"override": None})


@allure.feature("Admin")
@allure.story("Admin actions are recorded in the audit log (TC-ADM-13)")
@pytest.mark.admin
def test_audit_log_records_actions(admin, base_url):
    uid = _find_user_id(admin, base_url, "e2e-support")
    if uid:  # make one auditable change, then restore
        api(admin, "PATCH", f"/api/admin/users/{uid}/tier", {"override": "elite"})
        api(admin, "PATCH", f"/api/admin/users/{uid}/tier", {"override": None})
    goto(admin, f"{base_url}/admin/audit")
    body = text_of(admin.find_element(By.TAG_NAME, "body")).lower()
    assert "override" in body or "site_settings" in body or "tier" in body, "audit log should list admin actions"
    assert not severe_console_errors(admin)

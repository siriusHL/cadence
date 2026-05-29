"""§6.1 Authentication (R1) — state transition + decision table.

Tested once, centrally, parametrised — not repeated per page. All cases are
non-destructive: we only exercise rejected/blocked paths (no account is
created and no password is changed).
"""
from __future__ import annotations

import allure
import pytest
from selenium.webdriver.common.by import By

from helpers import drain_console, goto, text_of, wait_url_contains, wait_visible

# Representative protected routes (EP) — the redirect is enforced centrally
# in proxy.ts for every /app/* path, so a sample proves the contract.
PROTECTED = [
    "/app/dashboard",
    "/app/holdings",
    "/app/portfolios",
    "/app/account",
    "/app/add",
    "/app/tax",
]


def _logout(driver) -> None:
    """Drop the session and invalidate the cached tier so a later `authed`
    test logs back in cleanly."""
    driver.delete_all_cookies()
    driver._tier = None


@allure.feature("Auth")
@allure.story("Unauthenticated /app/* → /login?next= (TC-AUTH-01)")
@pytest.mark.auth
@pytest.mark.parametrize("route", PROTECTED, ids=lambda r: r.replace("/app/", ""))
def test_unauthenticated_redirects_to_login(driver, base_url, route):
    _logout(driver)
    drain_console(driver)
    driver.get(f"{base_url}{route}")
    wait_url_contains(driver, "/login")
    assert "/login" in driver.current_url
    assert "next=" in driver.current_url, f"missing next= param: {driver.current_url}"


@allure.feature("Auth")
@allure.story("Valid email + correct password → /app (TC-AUTH-02)")
@pytest.mark.auth
def test_login_valid(authed):
    assert "/app" in authed.current_url


@allure.feature("Auth")
@allure.story("Valid email + wrong password → stays, error, no session (TC-AUTH-03)")
@pytest.mark.auth
def test_login_wrong_password(driver, base_url, creds):
    _logout(driver)
    email, _ = creds("elite")
    if not email:
        pytest.skip("no elite seed user")
    goto(driver, f"{base_url}/login")
    e = driver.find_element(By.CSS_SELECTOR, "input[type=email]")
    e.clear()
    e.send_keys(email)
    p = driver.find_element(By.CSS_SELECTOR, "input[type=password]")
    p.clear()
    p.send_keys("wrong-password-zzz-000")
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    err = wait_visible(driver, "p.text-down")
    assert "/login" in driver.current_url, "should stay on /login after bad password"
    assert text_of(err), "expected a visible login error message"


@allure.feature("Auth")
@allure.story("Malformed email blocked client-side (TC-AUTH-04)")
@pytest.mark.auth
def test_login_malformed_email(driver, base_url):
    _logout(driver)
    goto(driver, f"{base_url}/login")
    e = driver.find_element(By.CSS_SELECTOR, "input[type=email]")
    e.clear()
    e.send_keys("notanemail")
    p = driver.find_element(By.CSS_SELECTOR, "input[type=password]")
    p.clear()
    p.send_keys("whatever123")
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    valid = driver.execute_script(
        "return document.querySelector('input[type=email]').checkValidity()"
    )
    assert valid is False, "browser should reject a malformed email"
    assert "/login" in driver.current_url


@allure.feature("Auth")
@allure.story("Session loss re-redirects a protected route (TC-AUTH-05)")
@pytest.mark.auth
def test_session_loss_redirects(authed, base_url):
    authed.delete_all_cookies()
    authed._tier = None
    drain_console(authed)
    authed.get(f"{base_url}/app/dashboard")
    wait_url_contains(authed, "/login")
    assert "/login" in authed.current_url


@allure.feature("Auth")
@allure.story("Signup: minLength=8 enforced; no confirm-password field (TC-AUTH-06)")
@pytest.mark.auth
def test_signup_password_rules(driver, base_url):
    _logout(driver)
    goto(driver, f"{base_url}/signup")
    pws = driver.find_elements(By.CSS_SELECTOR, "input[type=password]")
    assert len(pws) == 1, f"signup should have one password field (no confirm); found {len(pws)}"
    assert pws[0].get_attribute("minlength") == "8", "password minLength should be 8"
    # A 7-char password must be rejected by the browser — no account created.
    e = driver.find_element(By.CSS_SELECTOR, "input[type=email]")
    e.clear()
    e.send_keys("e2e-nobody@example.com")
    pws[0].clear()
    pws[0].send_keys("1234567")
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    valid = driver.execute_script("return arguments[0].checkValidity()", pws[0])
    assert valid is False, "7-char password should fail minLength=8"

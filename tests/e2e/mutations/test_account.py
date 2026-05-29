"""§7.3 Account security — password/email validation (TC-ACC-01..04).

Strictly non-destructive: every API case is rejected (wrong current
password, same password/email, or out-of-range new password), so no
credential ever changes. The confirm-password field is checked in the DOM.
"""
from __future__ import annotations

import allure
import pytest
from selenium.webdriver.common.by import By

from helpers import api, goto


@allure.feature("Mutations · Account")
@allure.story("Wrong current password → 403 wrong_password (TC-ACC-03)")
@pytest.mark.flows
def test_wrong_current_password(authed):
    res = api(
        authed,
        "POST",
        "/api/account/password",
        {"current_password": "definitely-not-it", "new_password": "brandNewPass9"},
    )
    assert res["status"] == 403, f"expected 403, got {res}"
    assert (res["body"] or {}).get("error") == "wrong_password"


@allure.feature("Mutations · Account")
@allure.story("New password length 8..72 enforced (TC-ACC-01)")
@pytest.mark.flows
@pytest.mark.parametrize("pw", ["1234567", "x" * 73])
def test_new_password_length_rejected(authed, pw):
    res = api(
        authed,
        "POST",
        "/api/account/password",
        {"current_password": "whatever1", "new_password": pw},
    )
    assert res["status"] == 400, f"new_password length={len(pw)} should be 400, got {res}"


@allure.feature("Mutations · Account")
@allure.story("Same password rejected, no change (TC-ACC-04)")
@pytest.mark.flows
def test_same_password_rejected(authed, creds):
    _, pw = creds("elite")
    if not pw:
        pytest.skip("no elite seed creds")
    res = api(authed, "POST", "/api/account/password", {"current_password": pw, "new_password": pw})
    assert res["status"] == 400, f"same password should be 400, got {res}"
    assert (res["body"] or {}).get("error") in ("same_password", "invalid_body")


@allure.feature("Mutations · Account")
@allure.story("Same email rejected, no change (TC-ACC-04)")
@pytest.mark.flows
def test_same_email_rejected(authed, creds):
    email, pw = creds("elite")
    if not email:
        pytest.skip("no elite seed creds")
    res = api(authed, "POST", "/api/account/email", {"new_email": email, "current_password": pw})
    assert res["status"] == 400, f"same email should be 400, got {res}"
    assert (res["body"] or {}).get("error") in ("same_email", "invalid_body")


@allure.feature("Mutations · Account")
@allure.story("Password form has a confirm field, unlike signup (TC-ACC-02)")
@pytest.mark.flows
def test_password_form_has_confirm_field(authed, base_url):
    goto(authed, f"{base_url}/app/account")
    new_pw = authed.find_elements(By.CSS_SELECTOR, "input[autocomplete=new-password]")
    assert len(new_pw) >= 2, f"account should have new + confirm password fields, found {len(new_pw)}"

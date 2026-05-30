"""Mutation guards for the accountant-email feature (rejected/safe paths only).

We never drive a *successful* send here: a valid POST would actually try to
email the accountant. Every assertion below is on a rejected path (400) or a
read-only UI check, so the suite stays repeatable and side-effect free.
"""
from __future__ import annotations

import allure
import pytest

from helpers import api, goto, screenshot, wait_text


@allure.feature("Mutations")
@allure.story("Accountant email validation")
@pytest.mark.flows
def test_settings_patch_rejects_bad_accountant_email(authed):
    # Rejected path: a malformed accountant email is refused, never persisted.
    res = api(authed, "/api/me", "PATCH", {"accountant_email": "not-an-email"})
    assert res["status"] in (400, 422), res


@allure.feature("Mutations")
@allure.story("Tax send-to-accountant")
@pytest.mark.flows
def test_send_to_accountant_rejects_bad_recipient(authed):
    # Rejected path: bad recipient → 400, nothing is sent.
    res = api(
        authed,
        "/api/tax/send-to-accountant",
        "POST",
        {"to": "nope", "subject": "Tax summary", "body": "Hello"},
    )
    assert res["status"] in (400, 422), res


@allure.feature("Mutations")
@allure.story("Tax send-to-accountant")
@pytest.mark.flows
def test_send_to_accountant_rejects_empty_body(authed):
    # Rejected path: empty subject/body → 400, nothing is sent.
    res = api(
        authed,
        "/api/tax/send-to-accountant",
        "POST",
        {"to": "accountant@example.com", "subject": "", "body": ""},
    )
    assert res["status"] in (400, 422), res


@allure.feature("Mutations")
@allure.story("Tax send-to-accountant")
@pytest.mark.flows
def test_tax_page_exposes_send_to_accountant(authed, base_url):
    # Read-only UI check: the action is reachable from the Tax page.
    goto(authed, f"{base_url}/app/tax")
    body = authed.find_element("css selector", "body").text.lower()
    if "nothing to tax" in body or "no portfolio" in body:
        pytest.skip("no seeded tax data — send-to-accountant card hidden")
    wait_text(authed, "Send to accountant")
    screenshot(authed, "tax_send_to_accountant")

"""Mutation guards for the accountant-email feature (rejected/safe paths only).

We never drive a *successful* send here: a valid POST would actually try to
email the accountant. Every assertion below is on a rejected path (400) or a
read-only UI / API check, so the suite stays repeatable and side-effect free.

`api()` takes (driver, method, path, body) — method first, then path.
"""
from __future__ import annotations

import allure
import pytest

from helpers import api, goto, screenshot, wait_text_in


@allure.feature("Mutations")
@allure.story("Accountant email validation")
@pytest.mark.flows
def test_settings_patch_rejects_bad_accountant_email(authed):
    # Rejected path: a malformed accountant email is refused, never persisted.
    res = api(authed, "PATCH", "/api/me", {"accountant_email": "not-an-email"})
    assert res["status"] in (400, 422), res


@allure.feature("Mutations")
@allure.story("Tax send-to-accountant")
@pytest.mark.flows
def test_send_to_accountant_rejects_bad_recipient(authed):
    # Rejected path: bad recipient → 400, nothing is sent.
    res = api(
        authed,
        "POST",
        "/api/tax/send-to-accountant",
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
        "POST",
        "/api/tax/send-to-accountant",
        {"to": "accountant@example.com", "subject": "", "body": ""},
    )
    assert res["status"] in (400, 422), res


@allure.feature("Mutations")
@allure.story("Tax send-to-accountant")
@pytest.mark.flows
def test_send_to_accountant_attachment_requires_year(authed):
    # Rejected path: asking for the tax-pack attachment without a year → 400.
    res = api(
        authed,
        "POST",
        "/api/tax/send-to-accountant",
        {"to": "accountant@example.com", "subject": "Tax", "body": "Hi", "attach": True},
    )
    # 400 (no year) for any tier; a non-elite tier may instead 402 once a year
    # is supplied — either way the attachment never goes out on a bad request.
    assert res["status"] in (400, 402, 422), res


@allure.feature("Mutations")
@allure.story("Tax send-to-accountant")
@pytest.mark.tier
@pytest.mark.flows
def test_send_to_accountant_attachment_gated_below_elite(as_premium):
    # Tier gate: a premium user can't attach the elite-only tax pack.
    res = api(
        as_premium,
        "POST",
        "/api/tax/send-to-accountant",
        {"to": "a@b.com", "subject": "Tax", "body": "Hi", "year": 2024, "attach": True},
    )
    assert res["status"] == 402, res


@allure.feature("Mutations")
@allure.story("Tax send-to-accountant")
@pytest.mark.tier
@pytest.mark.flows
def test_send_all_years_attachment_gated_below_elite(as_premium):
    # Tier gate: the combined multi-year tax pack is elite-only, same as the
    # single-year pack. No year is supplied (all-years needs none) so this also
    # proves the gate fires before the "year required" check for the all path.
    res = api(
        as_premium,
        "POST",
        "/api/tax/send-to-accountant",
        {"to": "a@b.com", "subject": "Tax", "body": "Hi", "allYears": True, "attach": True},
    )
    assert res["status"] == 402, res


@allure.feature("Mutations")
@allure.story("Tax send-to-accountant")
@pytest.mark.flows
def test_accountant_sends_history_read_only(authed):
    # Read-only contract: the history endpoint returns the caller's own sends
    # as a list (RLS-scoped). Safe to run repeatedly — no mutation.
    res = api(authed, "GET", "/api/tax/accountant-sends")
    assert res["status"] == 200, res
    assert isinstance(res["body"].get("sends"), list), res


@allure.feature("Mutations")
@allure.story("Tax send-to-accountant")
@pytest.mark.tier
@pytest.mark.flows
def test_tax_page_exposes_send_all_years_for_elite(as_elite, base_url):
    # Read-only UI check: the all-years handoff is offered to elite users who
    # have more than one fiscal year of activity. Skip cleanly otherwise — the
    # button is intentionally hidden below elite or with a single year.
    goto(as_elite, f"{base_url}/app/tax")
    body = as_elite.find_element("css selector", "body").text.lower()
    if "nothing to tax" in body or "no portfolio" in body:
        pytest.skip("no seeded tax data — send-to-accountant card hidden")
    if "send all years" not in body:
        pytest.skip("fewer than 2 fiscal years of activity — all-years send hidden")
    wait_text_in(as_elite, "Send all years")
    screenshot(as_elite, "tax_send_all_years")


@allure.feature("Mutations")
@allure.story("NL Box 3 value")
@pytest.mark.flows
def test_box3_value_rejects_missing_year(authed):
    # Rejected path: the year is required to key the per-year value.
    res = api(authed, "POST", "/api/tax/box3-value", {"value": 100000})
    assert res["status"] in (400, 422), res


@allure.feature("Mutations")
@allure.story("NL Box 3 value")
@pytest.mark.flows
def test_box3_value_rejects_negative(authed):
    # Rejected path: a negative portfolio value never persists.
    res = api(authed, "POST", "/api/tax/box3-value", {"year": 2024, "value": -1})
    assert res["status"] in (400, 422), res


@allure.feature("Mutations")
@allure.story("IE dividend tax band")
@pytest.mark.flows
def test_dividend_tax_band_rejects_bad_value(authed):
    # Rejected path: only 'standard' / 'higher' are accepted.
    res = api(authed, "PATCH", "/api/me", {"dividend_tax_band": "middle"})
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
    wait_text_in(authed, "Send to accountant")
    # Exactly one of the two onboarding states must show: either a saved
    # recipient (no invite) or the "Add accountant email" CTA when it's unset.
    has_invite = "add accountant email" in body
    has_default = "goes to" in body
    assert has_invite or has_default, body
    screenshot(authed, "tax_send_to_accountant")

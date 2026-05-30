from __future__ import annotations

import allure
import pytest

from helpers import goto, wait_css, wait_text, api, present_or_skip, screenshot


@allure.feature("Mutations")
@allure.story("Rejected & safe paths")
@pytest.mark.caps
class TestMutationGuards:

    @allure.feature("Mutations")
    @allure.story("Settings persistence")
    @pytest.mark.mutations
    def test_settings_patch_rejects_bad_currency(self, authed):
        # API contract: invalid currency rejected on the profile PATCH.
        res = api_patch(authed, "/api/me", {"base_currency": "ZZZ"})
        assert res["status"] in (400, 422), res

    @allure.feature("Mutations")
    @allure.story("Accountant email validation")
    @pytest.mark.mutations
    def test_settings_patch_rejects_bad_accountant_email(self, authed):
        # Rejected path: a malformed accountant email never persists.
        res = api_patch(authed, "/api/me", {"accountant_email": "not-an-email"})
        assert res["status"] in (400, 422), res

    @allure.feature("Mutations")
    @allure.story("Tax send-to-accountant")
    @pytest.mark.mutations
    def test_send_to_accountant_rejects_bad_recipient(self, authed):
        # Rejected path: bad recipient → 400, nothing is sent.
        res = api_post(
            authed,
            "/api/tax/send-to-accountant",
            {"to": "nope", "subject": "Tax", "body": "Hi"},
        )
        assert res["status"] in (400, 422), res

    @allure.feature("Mutations")
    @allure.story("Tax send-to-accountant")
    @pytest.mark.mutations
    def test_send_to_accountant_rejects_empty_body(self, authed):
        # Rejected path: empty subject/body → 400, nothing is sent.
        res = api_post(
            authed,
            "/api/tax/send-to-accountant",
            {"to": "accountant@example.com", "subject": "", "body": ""},
        )
        assert res["status"] in (400, 422), res

    @allure.feature("Mutations")
    @allure.story("Tax send-to-accountant")
    @pytest.mark.mutations
    def test_tax_page_exposes_send_to_accountant(self, authed):
        # Read-only UI check: the action is reachable from the Tax page.
        goto(authed, "/app/tax")
        wait_css(authed, "body")
        body = authed.find_element("css selector", "body").text.lower()
        if "nothing to tax" in body or "no portfolio" in body:
            pytest.skip("no seeded tax data — send-to-accountant card hidden")
        wait_text(authed, "Send to accountant")
        screenshot(authed, "tax_send_to_accountant")


def api_patch(driver, path: str, body: dict):
    script = """
    const cb = arguments[arguments.length - 1];
    fetch(arguments[0], {
      method: 'PATCH', credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(arguments[1]),
    }).then(r => r.json().then(j => cb({ status: r.status, body: j })).catch(() => cb({ status: r.status, body: null })))
      .catch(e => cb({ status: -1, body: String(e) }));
    """
    return driver.execute_async_script(script, path, body)


def api_post(driver, path: str, body: dict):
    script = """
    const cb = arguments[arguments.length - 1];
    fetch(arguments[0], {
      method: 'POST', credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(arguments[1]),
    }).then(r => r.json().then(j => cb({ status: r.status, body: j })).catch(() => cb({ status: r.status, body: null })))
      .catch(e => cb({ status: -1, body: String(e) }));
    """
    return driver.execute_async_script(script, path, body)

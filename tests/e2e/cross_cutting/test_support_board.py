"""§7.3 Support board /support/messages (R11) — access guards.

The cross-user read, reply, and close are exercised end-to-end in SC-05
(acceptance/test_support_flow.py); here we cover the authorization gates.
"""
from __future__ import annotations

from urllib.parse import urlparse

import allure
import pytest

from helpers import api, drain_console, goto, severe_console_errors, wait_url_contains

DUMMY_UUID = "00000000-0000-0000-0000-000000000000"


@allure.feature("Support board")
@allure.story("Customer (role 'user') redirected away from /support/messages (TC-SUP-01)")
@pytest.mark.support
def test_customer_blocked_from_support_board(as_elite, base_url):
    drain_console(as_elite)
    as_elite.get(f"{base_url}/support/messages")
    wait_url_contains(as_elite, "/app")
    assert not urlparse(as_elite.current_url).path.startswith("/support"), as_elite.current_url


@allure.feature("Support board")
@allure.story("Support-role user reaches the board (TC-SUP-02)")
@pytest.mark.support
def test_support_board_renders(as_support, base_url):
    goto(as_support, f"{base_url}/support/messages")
    assert "/support" in urlparse(as_support.current_url).path, f"support should reach the board: {as_support.current_url}"
    assert not severe_console_errors(as_support)


@allure.feature("Support board")
@allure.story("Customer cannot call the support reply API → 401/403 (TC-SUP-04)")
@pytest.mark.support
def test_customer_cannot_use_support_reply_api(as_elite):
    res = api(as_elite, "POST", f"/api/support/messages/{DUMMY_UUID}/reply", {"body": "nope"})
    assert res["status"] in (401, 403), f"customer should be forbidden from support reply, got {res}"

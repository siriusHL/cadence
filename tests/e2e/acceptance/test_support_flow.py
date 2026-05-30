"""§7.5 SC-05 — support conversation end-to-end across two accounts.

A customer opens a thread + message; a support-role user finds it on the
board (cross-user), replies; the customer reloads and sees the reply; support
closes the thread. Covers TC-SUP-02/03/05 + the customer↔support delivery.
Each run creates a thread (test data accumulates on the dev DB — acceptable;
cleanup is a TODO). "Received" is asserted after a reload (robust); realtime
instant-delivery is out of scope for this assertion.
"""
from __future__ import annotations

import time
from urllib.parse import urlparse

import allure
import pytest
from selenium.webdriver.common.by import By

from helpers import api, goto, screenshot, severe_console_errors, text_of


def _body_text(driver) -> str:
    return text_of(driver.find_element(By.TAG_NAME, "body")).lower()


@allure.feature("Acceptance")
@allure.story("SC-05 — customer↔support conversation round-trip")
@pytest.mark.acceptance
@pytest.mark.support
def test_support_conversation_roundtrip(login_as, base_url):
    stamp = int(time.time())
    subject = f"e2e support flow {stamp}"
    needle_msg = f"please confirm receipt {stamp}"
    needle_reply = f"support received it {stamp}"

    # 1) Customer creates a thread + message
    customer = login_as("elite")
    res = api(customer, "POST", "/api/messages", {"subject": subject, "body": needle_msg})
    assert res["status"] in (200, 201), f"create thread failed: {res}"
    thread_id = (res["body"] or {}).get("threadId")
    assert thread_id, f"no threadId returned: {res}"

    goto(customer, f"{base_url}/app/messages/{thread_id}")
    assert needle_msg in _body_text(customer), "customer should see their own message"
    screenshot(customer, "sc05-1-customer-sent")

    # 2) Support sees the customer's thread (cross-user) and the message
    support = login_as("support")
    goto(support, f"{base_url}/support/messages/{thread_id}")
    assert "/support" in urlparse(support.current_url).path, f"support should reach the thread: {support.current_url}"
    assert needle_msg in _body_text(support), "support should see the customer's message (cross-user RLS)"
    screenshot(support, "sc05-2-support-sees")

    # 3) Support replies (sender='support')
    rr = api(support, "POST", f"/api/support/messages/{thread_id}/reply", {"body": needle_reply})
    assert rr["status"] in (200, 201), f"support reply failed: {rr}"

    # 4) Customer reloads — the support reply is present
    customer = login_as("elite")
    goto(customer, f"{base_url}/app/messages/{thread_id}")
    assert needle_reply in _body_text(customer), "customer should receive the support reply after reload"
    screenshot(customer, "sc05-3-customer-received")
    assert not severe_console_errors(customer)

    # 5) Support closes the thread (TC-SUP-05)
    support = login_as("support")
    cl = api(support, "PATCH", f"/api/support/messages/{thread_id}", {"status": "closed"})
    assert cl["status"] in (200, 204), f"close thread failed: {cl}"

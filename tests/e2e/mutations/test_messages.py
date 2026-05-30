"""§7.3 Customer messaging — new-message validation (TC-MSG-01/02).

Rejected paths only (Zod 400 before any thread is created) — non-destructive.
The happy-path create + cross-user delivery live in SC-05.
"""
from __future__ import annotations

import allure
import pytest

from helpers import api


@allure.feature("Mutations · Messages")
@allure.story("New-message subject/body boundaries rejected (TC-MSG-01/02)")
@pytest.mark.flows
@pytest.mark.parametrize(
    "subject,body,why",
    [
        ("", "a valid body", "empty subject"),
        ("a valid subject", "", "empty body"),
        ("x" * 141, "a valid body", "subject > 140 chars"),
        ("a valid subject", "y" * 5001, "body > 5000 chars"),
    ],
)
def test_new_message_validation_rejected(authed, subject, body, why):
    res = api(authed, "POST", "/api/messages", {"subject": subject, "body": body})
    assert res["status"] == 400, f"{why} should be rejected (400), got {res}"

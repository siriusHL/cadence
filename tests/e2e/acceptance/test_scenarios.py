"""§7.5 Acceptance scenarios (use-case, cross-page).

Non-destructive subset only — the signup / checkout / create-delete journeys
(SC-01/02/03) mutate state and remain manual (✋ in the plan). SC-04 (elite
review across dashboard → holdings → tax) is read-only and automated here.
"""
from __future__ import annotations

import allure
import pytest
from selenium.webdriver.common.by import By

from helpers import goto, parse_money, present_or_skip, screenshot, severe_console_errors, text_of


@allure.feature("Acceptance")
@allure.story("SC-04 Elite review: dashboard value → holdings rows → tax tables")
@pytest.mark.acceptance
def test_elite_review_journey(authed, base_url):
    goto(authed, f"{base_url}/app/dashboard")
    hero = present_or_skip(authed, ".pro-hero h1", "empty portfolio — no headline value")
    assert (parse_money(text_of(hero)) or 0) > 0, "dashboard should show a positive value"

    goto(authed, f"{base_url}/app/holdings")
    present_or_skip(authed, ".pt tbody tr .ticker", "no holdings to review")
    assert authed.find_elements(By.CSS_SELECTOR, ".pt tbody tr .ticker"), "expected holding rows"

    goto(authed, f"{base_url}/app/tax")
    assert "/upgrade" not in authed.current_url, "elite should reach /app/tax"
    screenshot(authed, "acceptance-elite-journey")
    assert not severe_console_errors(authed)

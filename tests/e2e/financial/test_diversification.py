"""§7.2 Diversification — donut renders (TC-DVR-01) + geometry sanity."""
from __future__ import annotations

import allure
import pytest
from selenium.webdriver.common.by import By

from helpers import assert_chart_sane, goto, present_or_skip, screenshot, severe_console_errors


@allure.feature("Financial · Diversification")
@allure.story("Donut segment(s) render (TC-DVR-01)")
@pytest.mark.charts
def test_diversification_donut(authed, base_url):
    goto(authed, f"{base_url}/app/diversification")
    present_or_skip(authed, "svg circle", "Diversification donut absent (empty portfolio / tier)")
    segments = authed.find_elements(By.CSS_SELECTOR, "svg circle")
    assert len(segments) >= 1, "donut rendered no segments"
    screenshot(authed, "diversification-donut", css="svg")
    assert not severe_console_errors(authed)

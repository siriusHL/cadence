"""§7.2 Performance — cumulative-return chart, or the <2-snapshot
"building history" state (TC-PERF-01/02). Both are valid; neither errors."""
from __future__ import annotations

import allure
import pytest
from selenium.webdriver.common.by import By

from helpers import goto, screenshot, severe_console_errors, text_of


@allure.feature("Financial · Performance")
@allure.story("Cumulative chart renders, or a building-history state (TC-PERF-01/02)")
@pytest.mark.charts
def test_performance_chart_or_building(authed, base_url):
    goto(authed, f"{base_url}/app/performance")
    svg_paths = authed.find_elements(By.CSS_SELECTOR, "svg path")
    body = text_of(authed.find_element(By.TAG_NAME, "body")).lower()
    building = "building" in body or "history" in body
    assert svg_paths or building, "expected a performance chart or a building-history message"
    screenshot(authed, "performance")
    assert not severe_console_errors(authed)

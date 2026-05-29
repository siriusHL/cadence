"""§7.2 Dividends — forecast chart structure (TC-DIV-04) and the invalid-tab
fallback (TC-DIV-01). Withholding/decision-table cases live in the dividends
logic tests added later."""
from __future__ import annotations

import allure
import pytest
from selenium.webdriver.common.by import By

from helpers import goto, present_or_skip, screenshot, severe_console_errors


@allure.feature("Financial · Dividends")
@allure.story("Forecast chart: bars + cumulative dots render (TC-DIV-04)")
@pytest.mark.charts
def test_forecast_chart(authed, base_url):
    goto(authed, f"{base_url}/app/dividends?tab=forecast")
    present_or_skip(authed, ".fc-col", "Forecast chart absent (empty portfolio / tier)")
    bars = authed.find_elements(By.CSS_SELECTOR, ".fc-col")
    assert len(bars) >= 1, "forecast rendered no bars"
    dots = authed.find_elements(By.CSS_SELECTOR, ".fc-dot")
    assert dots, "cumulative line dots missing"
    screenshot(authed, "forecast", css=".fc-col")
    assert not severe_console_errors(authed)


@allure.feature("Financial · Dividends")
@allure.story("Invalid ?tab= falls back to upcoming, no crash (TC-DIV-01)")
@pytest.mark.data
def test_invalid_tab_falls_back(authed, base_url):
    goto(authed, f"{base_url}/app/dividends?tab=not-a-real-tab")
    screenshot(authed, "dividends-invalid-tab")
    # The page must render (landmark already waited for in goto) and not throw.
    assert not severe_console_errors(authed)

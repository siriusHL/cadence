"""Pillar 3 — chart/graph structure assertions + screenshots.

Charts are both a calculation and a picture, so we test both layers:
  * structural assertions (bar counts, Now marker, axis, segments) catch
    data-binding/logic bugs deterministically — no pixel flake;
  * an embedded screenshot of the chart card lets a human eye confirm
    colour / overflow / overlap that assertions can't see.

Selectors target develop's real chart DOM:
  IncomeRhythmChart → .irc-bars / .irc-col / .irc-now-line / .irc-now-label
  ForecastChart     → .fc-col / .fc-dot
  Donut             → svg > circle
"""

from __future__ import annotations

import allure
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from conftest import attach_screenshot, drain_console, severe_console_errors


def _goto(driver, url: str) -> None:
    drain_console(driver)  # isolate console errors to this page
    driver.get(url)
    WebDriverWait(driver, 60).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "h1, [role=tablist]"))
    )


def _find_all(driver, selector: str):
    return driver.find_elements(By.CSS_SELECTOR, selector)


@allure.feature("Charts")
@allure.story("Dashboard · Income rhythm")
@pytest.mark.charts
def test_income_rhythm_chart(authed, base_url):
    driver = authed
    _goto(driver, f"{base_url}/app/dashboard")

    # If the account lands on a tier without the dashboard, skip rather
    # than fail — the chart only exists on the Pro/Elite dashboard.
    bars = _find_all(driver, ".irc-bars .irc-col")
    if not bars:
        pytest.skip("Income rhythm chart not present (tier/empty portfolio)")

    with allure.step(f"{len(bars)} bars rendered"):
        # Default range is 18M → expect a healthy number of bars (>= 12).
        assert len(bars) >= 12, f"expected >=12 rhythm bars, got {len(bars)}"

    with allure.step("Now marker present"):
        assert _find_all(driver, ".irc-now-line"), "Now divider line missing"
        labels = _find_all(driver, ".irc-now-label")
        assert labels, "Now label missing"
        # Use textContent, not .text: the label is aria-hidden + absolutely
        # positioned, so Selenium's visible-text `.text` can return '' even
        # though the DOM text is "Now".
        label_text = (labels[0].get_attribute("textContent") or "").strip().lower()
        assert label_text == "now", f"Now label text was {label_text!r}"

    with allure.step("y-axis ticks present"):
        # The chart renders €-value tick labels down the left edge.
        ticks = [e for e in _find_all(driver, ".num") if e.text.strip().startswith("€")]
        assert ticks, "expected € y-axis tick labels"

    attach_screenshot(driver, "income-rhythm")
    assert not severe_console_errors(driver)


@allure.feature("Charts")
@allure.story("Dividends · Forecast")
@pytest.mark.charts
def test_forecast_chart(authed, base_url):
    driver = authed
    _goto(driver, f"{base_url}/app/dividends?tab=forecast")

    bars = _find_all(driver, ".fc-col")
    if not bars:
        pytest.skip("Forecast chart not present (tier/empty portfolio)")

    with allure.step(f"{len(bars)} forecast bars rendered"):
        assert len(bars) >= 1

    with allure.step("cumulative line endpoints rendered"):
        dots = _find_all(driver, ".fc-dot")
        # One cumulative dot per bar in the active range.
        assert dots, "cumulative line dots missing"

    attach_screenshot(driver, "forecast")
    assert not severe_console_errors(driver)


@allure.feature("Charts")
@allure.story("Diversification · Donut")
@pytest.mark.charts
def test_diversification_donut(authed, base_url):
    driver = authed
    _goto(driver, f"{base_url}/app/diversification")

    segments = _find_all(driver, "svg circle")
    if not segments:
        pytest.skip("Diversification donut not present (tier/empty portfolio)")

    with allure.step(f"{len(segments)} donut segments rendered"):
        assert len(segments) >= 1

    attach_screenshot(driver, "diversification-donut")
    assert not severe_console_errors(driver)

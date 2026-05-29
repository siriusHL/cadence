"""§7.2 Dashboard — headline value (TC-DASH-01), income-rhythm chart
structure (TC-DASH-03), and its geometry sanity (TC-DASH-04 / TC-VIS).

Clock-independent: we assert the value parses to a positive € and the chart
is structurally complete, never a hard-coded amount (which drifts with live
prices / today's date).
"""
from __future__ import annotations

import allure
import pytest
from selenium.webdriver.common.by import By

from helpers import (
    assert_chart_sane,
    goto,
    parse_money,
    present_or_skip,
    screenshot,
    severe_console_errors,
    text_of,
)


@allure.feature("Financial · Dashboard")
@allure.story("Headline portfolio value is a positive € (TC-DASH-01)")
@pytest.mark.data
def test_dashboard_value_is_positive(authed, base_url):
    goto(authed, f"{base_url}/app/dashboard")
    hero = present_or_skip(
        authed, ".pro-hero h1", "Dashboard hero absent (empty portfolio / non-dashboard tier)"
    )
    # textContent, not .text: the hero animates in, so visible-text can be ''
    # while the value is already in the DOM.
    raw = text_of(hero)
    val = parse_money(raw)
    screenshot(authed, "dashboard-value", css=".pro-hero h1")
    assert val is not None and val > 0, f"dashboard hero not a positive €: {raw!r}"
    assert not severe_console_errors(authed)


@allure.feature("Financial · Dashboard")
@allure.story("Income-rhythm chart structure (TC-DASH-03)")
@pytest.mark.charts
def test_income_rhythm_chart(authed, base_url):
    goto(authed, f"{base_url}/app/dashboard")
    present_or_skip(
        authed, ".irc-bars .irc-col", "Income-rhythm chart absent (empty portfolio / tier)"
    )
    bars = authed.find_elements(By.CSS_SELECTOR, ".irc-bars .irc-col")
    assert len(bars) >= 12, f"expected >=12 rhythm bars (18M default), got {len(bars)}"

    assert authed.find_elements(By.CSS_SELECTOR, ".irc-now-line"), "Now divider line missing"
    labels = authed.find_elements(By.CSS_SELECTOR, ".irc-now-label")
    assert labels and text_of(labels[0]).lower() == "now", "Now label missing/incorrect"

    ticks = [e for e in authed.find_elements(By.CSS_SELECTOR, ".num") if text_of(e).startswith("€")]
    assert ticks, "expected € y-axis tick labels"

    screenshot(authed, "income-rhythm", css=".irc-bars")
    assert not severe_console_errors(authed)


@allure.feature("Financial · Dashboard")
@allure.story("Income-rhythm geometry: no slivers / overflow (TC-VIS-01/03)")
@pytest.mark.visual
def test_income_rhythm_geometry(authed, base_url):
    goto(authed, f"{base_url}/app/dashboard")
    present_or_skip(authed, ".irc-bars .irc-col", "Income-rhythm chart absent")
    assert_chart_sane(authed, ".irc-bars", [".irc-col"], min_px=1.0, tol=3.0)
    screenshot(authed, "income-rhythm-geometry", css=".irc-bars")

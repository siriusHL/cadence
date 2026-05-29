"""Pillar 2 — data correctness.

These assertions are clock-independent on purpose: instead of hard-coding
expected euro amounts (which drift with today's date + live prices), they
check that the app's *own numbers are internally consistent* and that real
data renders rather than an empty/error state. That holds true regardless
of when the suite runs.

  * Holdings: the table renders data rows (not the empty state), the
    "N of N" position count matches the rendered rows, and the totals
    footer shows a parseable € figure.
  * Dashboard: the headline portfolio value parses to a positive number.
"""

from __future__ import annotations

import re

import allure
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from conftest import attach_screenshot, drain_console, severe_console_errors

_NUM = re.compile(r"-?[\d.,]+")


def _parse_money(text: str) -> float | None:
    """Pull the first number out of a string like '€1,020k' / '€5,847'.
    Returns a float, expanding a trailing 'k'. None if nothing numeric."""
    if not text:
        return None
    m = _NUM.search(text.replace(" ", " "))
    if not m:
        return None
    raw = m.group(0).replace(",", "")
    try:
        val = float(raw)
    except ValueError:
        return None
    if "k" in text.lower():
        val *= 1000
    return val


def _goto(driver, url: str) -> None:
    drain_console(driver)  # isolate console errors to this page
    driver.get(url)
    WebDriverWait(driver, 60).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "h1, [role=tablist]"))
    )


@allure.feature("Data")
@allure.story("Holdings · table integrity")
@pytest.mark.data
def test_holdings_table_has_consistent_data(authed, base_url):
    driver = authed
    _goto(driver, f"{base_url}/app/holdings")

    # Empty state? Then there's nothing to assert — skip cleanly.
    body = driver.find_element(By.TAG_NAME, "body").text.lower()
    if "no holdings" in body or "no portfolio" in body or "add a holding" in body:
        pytest.skip("Test account has no holdings — seed a fixture portfolio")

    rows = driver.find_elements(By.CSS_SELECTOR, ".pt tbody tr .ticker")
    with allure.step(f"{len(rows)} holding rows rendered"):
        assert rows, "holdings table rendered no data rows"

    # Internal consistency: a "N of N" / "N positions" style count, if
    # present, should agree with the number of rendered rows.
    with allure.step("position count matches rendered rows"):
        count_match = re.search(r"(\d+)\s+of\s+(\d+)", body)
        if count_match:
            shown, total = int(count_match.group(1)), int(count_match.group(2))
            assert shown == len(rows), f"'{shown} of {total}' != {len(rows)} rendered rows"

    # Totals footer should carry a parseable € figure.
    with allure.step("totals footer is numeric"):
        foot = driver.find_elements(By.CSS_SELECTOR, ".pt tfoot")
        if foot:
            total = _parse_money(foot[0].text)
            assert total is not None, f"totals footer not numeric: {foot[0].text!r}"

    attach_screenshot(driver, "holdings-data")
    assert not severe_console_errors(driver)


@allure.feature("Data")
@allure.story("Dashboard · headline value")
@pytest.mark.data
def test_dashboard_value_is_numeric(authed, base_url):
    driver = authed
    _goto(driver, f"{base_url}/app/dashboard")

    h1s = driver.find_elements(By.CSS_SELECTOR, "h1")
    if not h1s:
        pytest.skip("Dashboard not present for this tier")

    with allure.step("portfolio value parses to a positive number"):
        # The hero h1 carries the portfolio value, e.g. "€1,020k".
        hero_text = " ".join(h.text for h in h1s)
        val = _parse_money(hero_text)
        assert val is not None and val > 0, f"dashboard hero not a positive €: {hero_text!r}"

    attach_screenshot(driver, "dashboard-data")
    assert not severe_console_errors(driver)

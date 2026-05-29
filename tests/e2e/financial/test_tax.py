"""§7.2 Tax (elite) — page renders a table; export ?year= boundaries
(TC-TAX-05). The non-elite export gate (402) lives in the tier suite."""
from __future__ import annotations

import allure
import pytest

from helpers import api, goto, present_or_skip, screenshot, severe_console_errors


@allure.feature("Financial · Tax")
@allure.story("Tax page renders a table for elite (no gate)")
@pytest.mark.data
def test_tax_page_renders(authed, base_url):
    goto(authed, f"{base_url}/app/tax")
    assert "/upgrade" not in authed.current_url, "elite should reach /app/tax"
    assert "/login" not in authed.current_url
    present_or_skip(authed, ".pt", "tax tables absent (empty portfolio)")
    screenshot(authed, "tax", css=".pt")
    assert not severe_console_errors(authed)


@allure.feature("Financial · Tax")
@allure.story("Export ?year= out of [1900,2999] → 400 (TC-TAX-05)")
@pytest.mark.data
@pytest.mark.parametrize("year", [1899, 3000])
def test_export_year_out_of_bounds(authed, year):
    res = api(authed, "GET", f"/api/export/capital-gains?year={year}")
    assert res["status"] == 400, f"year={year} should be 400, got {res['status']}"


@allure.feature("Financial · Tax")
@allure.story("Export valid ?year= succeeds for elite (TC-TAX-05)")
@pytest.mark.data
def test_export_valid_year_ok(authed):
    res = api(authed, "GET", "/api/export/capital-gains?year=2023")
    assert res["status"] == 200, f"valid-year export should be 200, got {res['status']}"

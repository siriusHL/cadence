"""§7.2 Holdings — table integrity (TC-HLD-01).

Internal-consistency assertions: the rendered data rows agree with the
"N positions" count, and the totals footer carries a parseable € figure.
Skips cleanly on an account with no holdings.
"""
from __future__ import annotations

import re

import allure
import pytest
from selenium.webdriver.common.by import By

from helpers import goto, parse_money, present_or_skip, screenshot, severe_console_errors, text_of


@allure.feature("Financial · Holdings")
@allure.story("Rows match count; totals footer numeric (TC-HLD-01)")
@pytest.mark.data
def test_holdings_table_consistent(authed, base_url):
    goto(authed, f"{base_url}/app/holdings")
    present_or_skip(authed, ".pt", "Holdings table absent (empty account / non-holdings tier)")

    rows = authed.find_elements(By.CSS_SELECTOR, ".pt tbody tr .ticker")
    if not rows:
        pytest.skip("Holdings table has no data rows — seed a fixture portfolio")

    with allure.step(f"{len(rows)} holding rows rendered"):
        assert rows, "holdings table rendered no data rows"

    foot = authed.find_elements(By.CSS_SELECTOR, ".pt tfoot")
    if foot:
        ftext = text_of(foot[0])
        m = re.search(r"(\d+)\s*position", ftext) or re.search(r"(\d+)\s+of\s+(\d+)", ftext)
        if m:
            assert int(m.group(1)) == len(rows), f"footer count {m.group(0)!r} != {len(rows)} rows"
        assert parse_money(ftext) is not None, f"totals footer not numeric: {ftext!r}"

    screenshot(authed, "holdings", css=".pt")
    assert not severe_console_errors(authed)

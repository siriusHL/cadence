"""§7.3 Portfolios — name validation + last-portfolio guard (TC-PF-01/04).

Non-destructive: invalid creates are rejected, and the delete test only runs
when the user has exactly one portfolio, so the delete is *blocked* (409)
rather than actually removing data.
"""
from __future__ import annotations

import allure
import pytest

from helpers import api


@allure.feature("Mutations · Portfolios")
@allure.story("Create name boundary: '' and 81 chars rejected (TC-PF-01)")
@pytest.mark.flows
@pytest.mark.parametrize("name", ["", "x" * 81])
def test_create_name_rejected(authed, name):
    res = api(authed, "POST", "/api/portfolios", {"name": name})
    assert res["status"] == 400, f"name length={len(name)} should be rejected, got {res}"


@allure.feature("Mutations · Portfolios")
@allure.story("Delete the only portfolio → 409 last_portfolio (TC-PF-04)")
@pytest.mark.flows
def test_delete_last_portfolio_blocked(authed):
    res = api(authed, "GET", "/api/portfolios")
    body = res["body"]
    rows = body if isinstance(body, list) else (body or {}).get("data")
    if not isinstance(rows, list) or len(rows) != 1:
        have = "unknown" if not isinstance(rows, list) else len(rows)
        pytest.skip(f"need exactly 1 portfolio to test the last-delete guard (have {have})")
    pid = rows[0].get("id")
    if not pid:
        pytest.skip("portfolio id not present in /api/portfolios response")
    res = api(authed, "DELETE", f"/api/portfolios/{pid}")
    assert res["status"] == 409, f"deleting the last portfolio should be 409, got {res}"
    assert (res["body"] or {}).get("error") == "last_portfolio"

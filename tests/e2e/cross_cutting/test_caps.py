"""§6.3 RLS / capacity caps (R4) — BVA on the per-tier limits.

Exercised through the API as the logged-in tier. Assertions are on the
REJECTED (over-cap) path, so nothing is created beyond a tier's legitimate
allowance — safe to run repeatedly.
"""
from __future__ import annotations

import allure
import pytest

from helpers import api


def _drive_to_portfolio_cap(driver, cap: int) -> dict:
    """POST portfolios until one is rejected at the cap (bounded). Leaves the
    tier at exactly its allowed maximum, so re-runs hit the cap immediately."""
    res: dict = {"status": None}
    for i in range(cap + 1):
        res = api(driver, "POST", "/api/portfolios", {"name": f"e2e-cap-{i}"})
        if res["status"] == 402:
            return res
        if res["status"] not in (200, 201):
            return res
    return api(driver, "POST", "/api/portfolios", {"name": "e2e-cap-over"})


@allure.feature("Caps")
@allure.story("free: 2nd portfolio blocked at cap 1 (TC-CAP-02)")
@pytest.mark.caps
def test_free_portfolio_cap(as_free):
    res = _drive_to_portfolio_cap(as_free, 1)
    assert res["status"] == 402, f"expected 402 at free portfolio cap, got {res}"
    assert (res["body"] or {}).get("reason") == "portfolio_cap_reached"


@allure.feature("Caps")
@allure.story("premium: 4th portfolio blocked at cap 3 (TC-CAP-03)")
@pytest.mark.caps
def test_premium_portfolio_cap(as_premium):
    res = _drive_to_portfolio_cap(as_premium, 3)
    assert res["status"] == 402, f"expected 402 at premium portfolio cap, got {res}"
    assert (res["body"] or {}).get("reason") == "portfolio_cap_reached"


@allure.feature("Caps")
@allure.story("free: 11th holding blocked at cap 10 (TC-CAP-01)")
@pytest.mark.caps
def test_free_holding_cap(as_free):
    # Only assert when the free account is already at its 10-holding cap; we
    # don't bulk-create 10 holdings just to probe (slow + pollutes data).
    res = api(as_free, "GET", "/api/holdings")
    body = res["body"]
    count = 0
    if res["status"] == 200:
        if isinstance(body, list):
            count = len(body)
        elif isinstance(body, dict):
            count = len(body.get("data") or body.get("holdings") or [])
    if count < 10:
        pytest.skip(f"free has {count} holdings (<10) — cap not reachable without bulk-seed")
    res = api(
        as_free,
        "POST",
        "/api/holdings",
        {
            "ticker": "ZZZZ",
            "currency": "USD",
            "lots": [{"quantity": 1, "price_local": 1, "occurred_on": "2023-01-02", "fee_local": 0, "kind": "buy"}],
        },
    )
    assert res["status"] == 402, f"expected 402 at free holding cap, got {res}"
    assert (res["body"] or {}).get("reason") == "holding_cap_reached"

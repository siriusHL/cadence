"""§7.3 Add holding — input validation BVA/EP via the API (TC-ADD-01..06).

Every case is the REJECTED path (invalid input or oversell), so no holding
is created. The happy-path create (TC-ADD-07) is destructive and is covered
by the seeded portfolio + acceptance scenarios instead.
"""
from __future__ import annotations

import allure
import pytest
from selenium.webdriver.common.by import By

from helpers import api, goto

VALID_LOT = {"quantity": 1, "price_local": 10, "occurred_on": "2023-01-02", "fee_local": 0, "kind": "buy"}


def _post(driver, **lot_overrides):
    body = {"ticker": "AAPL", "currency": "USD", "lots": [dict(VALID_LOT, **lot_overrides)]}
    return api(driver, "POST", "/api/holdings", body)


@allure.feature("Mutations · Add holding")
@allure.story("Quantity must be > 0 (TC-ADD-01)")
@pytest.mark.flows
@pytest.mark.parametrize("qty", [0, -1, "abc"])
def test_quantity_rejected(authed, qty):
    res = _post(authed, quantity=qty)
    assert res["status"] == 400, f"quantity={qty!r} should be rejected, got {res}"


@allure.feature("Mutations · Add holding")
@allure.story("Negative price rejected (TC-ADD-02)")
@pytest.mark.flows
def test_negative_price_rejected(authed):
    res = _post(authed, price_local=-0.01)
    assert res["status"] == 400, f"negative price should be rejected, got {res}"


@allure.feature("Mutations · Add holding")
@allure.story("Bad date rejected; date input caps at today (TC-ADD-03)")
@pytest.mark.flows
def test_bad_date_rejected(authed, base_url):
    res = _post(authed, occurred_on="not-a-date")
    assert res["status"] == 400, f"bad date should be rejected, got {res}"
    goto(authed, f"{base_url}/app/add")
    dates = authed.find_elements(By.CSS_SELECTOR, "input[type=date][max]")
    assert dates, "expected a date input with a max attribute (max=today)"


@allure.feature("Mutations · Add holding")
@allure.story("Ticker length 1..16 enforced (TC-ADD-04)")
@pytest.mark.flows
@pytest.mark.parametrize("ticker", ["", "A" * 17])
def test_ticker_length_rejected(authed, ticker):
    body = {"ticker": ticker, "currency": "USD", "lots": [VALID_LOT]}
    res = api(authed, "POST", "/api/holdings", body)
    assert res["status"] == 400, f"ticker={ticker!r} should be rejected, got {res}"


@allure.feature("Mutations · Add holding")
@allure.story("Oversell guard: sell > held → 400 insufficient_shares (TC-ADD-06)")
@pytest.mark.flows
def test_oversell_rejected(authed):
    res = _post(authed, quantity=10_000_000, kind="sell")
    assert res["status"] == 400, f"oversell should be 400, got {res}"
    assert (res["body"] or {}).get("error") == "insufficient_shares"

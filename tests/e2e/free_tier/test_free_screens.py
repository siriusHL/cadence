"""§7.4 Free-tier screens (TC-FREE-01) — the positive side of the tier
decision table: a free user reaches its own screens without being gated."""
from __future__ import annotations

import allure
import pytest

from helpers import goto, severe_console_errors

FREE_SCREENS = ["home", "next", "stocks", "year"]


@allure.feature("Free tier")
@allure.story("Free user reaches its free screens, not /upgrade (TC-FREE-01)")
@pytest.mark.free
@pytest.mark.parametrize("screen", FREE_SCREENS)
def test_free_reaches_free_screens(as_free, base_url, screen):
    goto(as_free, f"{base_url}/app/{screen}")
    assert "/upgrade" not in as_free.current_url, f"{screen}: free user unexpectedly gated"
    assert "/login" not in as_free.current_url, f"{screen}: free user unexpectedly logged out"
    assert not severe_console_errors(as_free)

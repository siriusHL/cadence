"""§6.5 Non-functional spot checks — performance budget + secret leakage."""
from __future__ import annotations

import os
import time

import allure
import pytest

from helpers import goto


@allure.feature("NFR")
@allure.story("Service-role key never appears in page source (TC-NFR-02)")
@pytest.mark.nfr
def test_no_service_role_key_in_page_source(authed, base_url):
    secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not secret:
        pytest.skip("SUPABASE_SERVICE_ROLE_KEY not in env — nothing to check against")
    goto(authed, f"{base_url}/app/dashboard")
    assert secret not in authed.page_source, "service-role key leaked into the page source!"


@allure.feature("NFR")
@allure.story("Dashboard reaches a landmark within a 10s budget (TC-NFR-01)")
@pytest.mark.nfr
def test_dashboard_within_perf_budget(authed, base_url):
    start = time.time()
    goto(authed, f"{base_url}/app/dashboard")  # waits for readyState + landmark
    elapsed = time.time() - start
    assert elapsed < 10.0, f"dashboard reached landmark in {elapsed:.1f}s (> 10s budget)"

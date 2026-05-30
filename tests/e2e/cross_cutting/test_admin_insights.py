"""§7.6 Admin Insights moderation (R10 + R12) — the publish/validation gate.

An article is invisible to the public until an admin publishes it (RLS exposes
only `status='published'`). These tests cover the authorization boundary (any
non-admin is blocked from the board and the API) and, where admin creds exist
(CI), the full review → publish → unpublish cycle against a dedicated DRAFT
fixture — set-then-restore, never the real published articles, so the suite
stays repeatable.
"""
from __future__ import annotations

import allure
import pytest
from selenium.webdriver.common.by import By

from helpers import api, goto, present_or_skip, text_of

DRAFT_SLUG = "e2e-draft-sample"
DRAFT_TITLE_FRAGMENT = "Dollar-Cost Averaging"
DUMMY_ID = "00000000-0000-0000-0000-000000000000"


def _is_noindex(driver) -> bool:
    metas = driver.find_elements(By.CSS_SELECTOR, "meta[name='robots']")
    return bool(metas) and "noindex" in (metas[0].get_attribute("content") or "").lower()


# ─── Authorization boundary (runs locally — non-admin = elite) ──────────────


@allure.feature("Admin · Insights")
@allure.story("Non-admin is redirected off the Insights board (TC-INS-16)")
@pytest.mark.admin
def test_non_admin_blocked_from_admin_insights(as_elite, base_url):
    goto(as_elite, f"{base_url}/admin/insights")
    assert "/admin" not in as_elite.current_url, "non-admin must be redirected off /admin"
    assert "/app" in as_elite.current_url, f"expected bounce to /app, got {as_elite.current_url}"


@allure.feature("Admin · Insights")
@allure.story("Non-admin cannot change article status via the API (TC-INS-16)")
@pytest.mark.admin
def test_non_admin_cannot_moderate_via_api(as_elite, base_url):
    goto(as_elite, f"{base_url}/app", landmark=False)
    res = api(as_elite, "PATCH", f"/api/admin/insights/{DUMMY_ID}", {"status": "published"})
    assert res["status"] == 403, f"non-admin moderation must be 403, got {res}"


# ─── Full moderation cycle (admin creds → CI; skips locally) ────────────────


@allure.feature("Admin · Insights")
@allure.story("Admin publishes a draft then unpublishes it (TC-INS-17)")
@pytest.mark.admin
def test_admin_publish_unpublish_flow(as_admin, base_url):
    goto(as_admin, f"{base_url}/admin/insights")
    if "/admin" not in as_admin.current_url:
        pytest.skip("admin email not in ADMIN_EMAILS for this env")

    # The board lists each article with a preview link /admin/insights/<id>.
    present_or_skip(as_admin, "a[href*='/admin/insights/']", "no articles on the board")
    links = as_admin.find_elements(By.CSS_SELECTOR, "a[href*='/admin/insights/']")
    target = next((a for a in links if DRAFT_TITLE_FRAGMENT in text_of(a)), None)
    if target is None:
        pytest.skip("draft fixture absent — run scripts/seed-e2e-insights.mjs")
    article_id = (target.get_attribute("href") or "").rstrip("/").split("/")[-1]

    try:
        # 1) Draft is NOT publicly visible.
        goto(as_admin, f"{base_url}/insights/{DRAFT_SLUG}")
        assert _is_noindex(as_admin), "draft must be hidden before publish"

        # 2) Admin publishes it.
        goto(as_admin, f"{base_url}/admin/insights", landmark=False)
        res = api(as_admin, "PATCH", f"/api/admin/insights/{article_id}", {"status": "published"})
        assert res["status"] == 200, f"publish failed: {res}"

        # 3) Now it renders publicly and is indexable.
        goto(as_admin, f"{base_url}/insights/{DRAFT_SLUG}")
        assert not _is_noindex(as_admin), "published article should be indexable"
        assert DRAFT_TITLE_FRAGMENT in text_of(as_admin.find_element(By.TAG_NAME, "h1"))
    finally:
        # Restore to draft so the fixture (and suite) stays repeatable.
        goto(as_admin, f"{base_url}/app", landmark=False)
        api(as_admin, "PATCH", f"/api/admin/insights/{article_id}", {"status": "draft"})

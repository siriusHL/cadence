"""§7.x Insights — public SEO content section (R5 reachability + R2 access).

The Insights blog is public: readable logged-out and by every tier, never
tier-gated (proxy lets /insights through before the auth/tier checks). These
tests prove the public contract, that articles render with their SEO plumbing
(canonical, JSON-LD, single H1, breadcrumb, TOC), that categories list, that
keyword search works and stays non-indexed, and that sitemap/robots expose the
section. All read-only and non-destructive.

Seeded by migration 0017: 8 categories + 3 original sample articles. Where a
test needs that seed it skips cleanly if it is absent (present_or_skip), so a
DB without the Insights seed doesn't fail the gate.
"""
from __future__ import annotations

import allure
import pytest
from selenium.webdriver.common.by import By

from helpers import (
    click,
    goto,
    present_or_skip,
    screenshot,
    severe_console_errors,
    text_of,
    wait_present,
)

# Seeded by 0017 (slugs are the stable contract).
HUB = "/insights"
ARTICLE = "understanding-dividend-yield"
ARTICLE_TITLE_FRAGMENT = "Dividend Yield"
CATEGORY = "dividend-investing"
CATEGORY_NAME = "Dividend Investing"
# Draft fixture seeded by scripts/seed-e2e-insights.mjs (status='draft').
DRAFT_SLUG = "e2e-draft-sample"


def _anon(driver):
    driver.delete_all_cookies()
    driver._tier = None


def _ld_scripts(driver) -> list[str]:
    return [
        text_of(s)
        for s in driver.find_elements(By.CSS_SELECTOR, "script[type='application/ld+json']")
    ]


# ─── Reachability + public access (R5 / R2) ────────────────────────────────


@allure.feature("Insights")
@allure.story("Hub is reachable logged-out and lists content (TC-INS-01)")
@pytest.mark.public
@pytest.mark.smoke
def test_hub_public(driver, base_url):
    _anon(driver)
    goto(driver, f"{base_url}{HUB}")
    assert HUB in driver.current_url, f"anon should reach the hub, got {driver.current_url}"
    assert "/login" not in driver.current_url, "hub must not require auth"
    # The finance-portal hub leads with an article (its title is the H1).
    assert driver.find_elements(By.TAG_NAME, "h1"), "hub should render a lead headline"
    hrefs = [a.get_attribute("href") or "" for a in driver.find_elements(By.CSS_SELECTOR, "a[href]")]
    assert any(f"/insights/{ARTICLE}" in h for h in hrefs), "hub should link to published articles"
    screenshot(driver, "insights-hub")
    assert not severe_console_errors(driver)


@allure.feature("Insights")
@allure.story("Insights is NOT tier-gated — a free user reads articles (TC-INS-02)")
@pytest.mark.tier
def test_free_user_can_read_insights(as_free, base_url):
    # An under-tier user hitting a gated /app screen is bounced to /upgrade;
    # /insights must never do that — it is public content.
    goto(as_free, f"{base_url}{HUB}/{ARTICLE}")
    assert "/upgrade" not in as_free.current_url, "insights must not be tier-gated"
    assert "/login" not in as_free.current_url, "insights must not require auth"
    assert ARTICLE in as_free.current_url


# ─── Article detail + SEO plumbing (R7-ish: structured content) ─────────────


@allure.feature("Insights")
@allure.story("Article renders title, body headings, meta row, share (TC-INS-03)")
@pytest.mark.public
def test_article_renders(driver, base_url):
    _anon(driver)
    goto(driver, f"{base_url}{HUB}/{ARTICLE}")
    h1s = driver.find_elements(By.TAG_NAME, "h1")
    assert len(h1s) == 1, f"an article must have exactly one H1, found {len(h1s)}"
    assert ARTICLE_TITLE_FRAGMENT in text_of(h1s[0])
    assert driver.find_elements(By.TAG_NAME, "h2"), "article body should have H2 sections"
    body = text_of(driver.find_element(By.TAG_NAME, "body"))
    assert "min read" in body, "article should show reading time"
    assert driver.find_elements(By.CSS_SELECTOR, "a[href*='twitter.com'], a[href*='linkedin.com']"), (
        "article should offer social share links"
    )
    screenshot(driver, "insights-article")
    assert not severe_console_errors(driver)


@allure.feature("Insights")
@allure.story("Article emits canonical + Article/Breadcrumb/FAQ JSON-LD + OG (TC-INS-04)")
@pytest.mark.public
def test_article_seo_metadata(driver, base_url):
    _anon(driver)
    goto(driver, f"{base_url}{HUB}/{ARTICLE}")

    canon = driver.find_elements(By.CSS_SELECTOR, "link[rel='canonical']")
    assert canon, "article must declare a canonical URL"
    assert f"/insights/{ARTICLE}" in (canon[0].get_attribute("href") or "")

    og_title = driver.find_elements(By.CSS_SELECTOR, "meta[property='og:title']")
    assert og_title and og_title[0].get_attribute("content"), "article must set og:title"

    blob = "\n".join(_ld_scripts(driver))
    assert '"@type":"Article"' in blob or '"@type": "Article"' in blob, "missing Article JSON-LD"
    assert "BreadcrumbList" in blob, "missing BreadcrumbList JSON-LD"
    assert "FAQPage" in blob, "missing FAQPage JSON-LD (sample article has a FAQ)"


@allure.feature("Insights")
@allure.story("Breadcrumb trail + auto TOC anchor to real heading ids (TC-INS-05)")
@pytest.mark.public
def test_article_breadcrumb_and_toc(driver, base_url):
    _anon(driver)
    goto(driver, f"{base_url}{HUB}/{ARTICLE}")
    assert driver.find_elements(By.CSS_SELECTOR, "nav[aria-label='Breadcrumb']"), "breadcrumb missing"

    toc = driver.find_elements(By.CSS_SELECTOR, "nav[aria-label='Table of contents'] a[href^='#']")
    present_or_skip(
        driver,
        "nav[aria-label='Table of contents'] a[href^='#']",
        "TOC not rendered (article has < 2 headings)",
    )
    # Every TOC link must resolve to an element with that id on the page.
    for a in toc:
        frag = (a.get_attribute("href") or "").split("#", 1)[-1]
        assert frag, "TOC anchor has no fragment"
        assert driver.find_elements(By.ID, frag), f"TOC points to #{frag} but no such heading id exists"


# ─── Category listing (R5) ──────────────────────────────────────────────────


@allure.feature("Insights")
@allure.story("Category page lists its articles with a breadcrumb (TC-INS-06)")
@pytest.mark.public
def test_category_page(driver, base_url):
    _anon(driver)
    goto(driver, f"{base_url}{HUB}/{CATEGORY}")
    h1 = driver.find_element(By.TAG_NAME, "h1")
    assert CATEGORY_NAME in text_of(h1)
    assert driver.find_elements(By.CSS_SELECTOR, "nav[aria-label='Breadcrumb']"), "breadcrumb missing"
    present_or_skip(driver, f"a[href*='/insights/{ARTICLE}']", "category has no seeded article")
    screenshot(driver, "insights-category")
    assert not severe_console_errors(driver)


# ─── Template: index strip, market sidebar, sub-nav ─────────────────────────


@allure.feature("Insights")
@allure.story("Hub renders the index strip + market sidebar (sample data) (TC-INS-18)")
@pytest.mark.public
def test_index_strip_and_sidebar(driver, base_url):
    _anon(driver)
    goto(driver, f"{base_url}{HUB}")
    idx = driver.find_elements(By.CSS_SELECTOR, ".ins-indexbar .ins-idx")
    assert len(idx) >= 4, f"index strip should list market indices, found {len(idx)}"
    panels = driver.find_elements(By.CSS_SELECTOR, ".ins-col-side .ins-panel")
    assert len(panels) >= 2, f"sidebar should show market panels, found {len(panels)}"
    # Sample/illustrative data must be labelled (legal: not a live feed).
    body = text_of(driver.find_element(By.TAG_NAME, "body")).lower()
    assert "indicative" in body, "sample market data must carry an 'indicative' disclaimer"


@allure.feature("Insights")
@allure.story("Sub-nav links to category pages (TC-INS-19)")
@pytest.mark.public
def test_subnav_category_links(driver, base_url):
    _anon(driver)
    goto(driver, f"{base_url}{HUB}")
    hrefs = [a.get_attribute("href") or "" for a in driver.find_elements(By.CSS_SELECTOR, ".ins-subnav a[href]")]
    assert any("/insights/stock-market" in h for h in hrefs), "sub-nav should link to a category (Bourse)"
    assert any("/insights/personal-finance" in h for h in hrefs), "sub-nav should link to a category (Finance perso)"


# ─── Search (no-JS GET form) ────────────────────────────────────────────────


@allure.feature("Insights")
@allure.story("Keyword search returns matches and stays non-indexed (TC-INS-07)")
@pytest.mark.public
def test_search_hits_and_noindex(driver, base_url):
    _anon(driver)
    goto(driver, f"{base_url}{HUB}?q=dividend")
    assert driver.find_elements(By.CSS_SELECTOR, f"a[href*='/insights/{ARTICLE}']"), (
        "search for 'dividend' should surface the dividend-yield article"
    )
    # Search-result variants must be noindex to avoid thin/duplicate pages.
    robots = driver.find_elements(By.CSS_SELECTOR, "meta[name='robots']")
    assert robots and "noindex" in (robots[0].get_attribute("content") or "").lower(), (
        "search results page should be noindex"
    )


@allure.feature("Insights")
@allure.story("Search with no match shows a clean empty state (TC-INS-08)")
@pytest.mark.public
def test_search_empty_state(driver, base_url):
    _anon(driver)
    goto(driver, f"{base_url}{HUB}?q=zzqqxxnomatchterm")
    body = text_of(driver.find_element(By.TAG_NAME, "body")).lower()
    assert "no articles" in body, "no-match search should show an empty state"
    assert not severe_console_errors(driver)


# ─── 404 + sitemap + robots ─────────────────────────────────────────────────


@allure.feature("Insights")
@allure.story("A draft article is never publicly visible — RLS gate (TC-INS-15)")
@pytest.mark.public
def test_draft_not_publicly_visible(driver, base_url):
    # The seeded fixture is status='draft'; RLS exposes only published rows, so
    # the public route must render the noindex not-found, never the draft body.
    _anon(driver)
    goto(driver, f"{base_url}{HUB}/{DRAFT_SLUG}")
    robots = driver.find_elements(By.CSS_SELECTOR, "meta[name='robots']")
    assert robots and "noindex" in (robots[0].get_attribute("content") or "").lower(), (
        "a draft article must not be publicly visible"
    )
    body = text_of(driver.find_element(By.TAG_NAME, "body")).lower()
    assert "dollar-cost averaging" not in body, "draft body must not leak on the public route"


@allure.feature("Insights")
@allure.story("Unknown slug renders a noindex not-found page (TC-INS-09)")
@pytest.mark.public
def test_unknown_slug_not_found_noindex(driver, base_url):
    # Next streams App-Router pages, so notFound() renders a not-found UI with
    # HTTP 200 (404 only for non-streamed responses — per Next docs). The
    # SEO-critical signal is the injected `noindex` meta, which keeps junk URLs
    # out of the index; that is the contract we assert, not the status line.
    _anon(driver)
    goto(driver, f"{base_url}{HUB}/no-such-article-xyz")
    robots = driver.find_elements(By.CSS_SELECTOR, "meta[name='robots']")
    assert robots and "noindex" in (robots[0].get_attribute("content") or "").lower(), (
        "unknown slug should render a noindex not-found page"
    )
    body = text_of(driver.find_element(By.TAG_NAME, "body")).lower()
    assert "could not be found" in body or "not found" in body, "should show not-found UI"
    # And it must NOT have leaked a real article's content.
    assert "min read" not in body, "not-found must not render article chrome"


@allure.feature("Insights")
@allure.story("sitemap.xml exposes the hub + article URLs (TC-INS-10)")
@pytest.mark.public
def test_sitemap_lists_insights(driver, base_url):
    _anon(driver)
    driver.get(f"{base_url}/sitemap.xml")
    src = driver.page_source
    assert "/insights" in src, "sitemap should list the insights hub"
    assert f"/insights/{ARTICLE}" in src, "sitemap should list published articles"


@allure.feature("Insights")
@allure.story("robots.txt points at the sitemap and keeps /app private (TC-INS-11)")
@pytest.mark.public
def test_robots_txt(driver, base_url):
    _anon(driver)
    driver.get(f"{base_url}/robots.txt")
    src = driver.page_source
    assert "sitemap.xml" in src.lower(), "robots should reference the sitemap"
    assert "/app" in src, "robots should disallow the authenticated app"


# ─── Discoverability (menu links) ───────────────────────────────────────────


@allure.feature("Insights")
@allure.story("Insights is linked from the marketing site (TC-INS-13)")
@pytest.mark.public
def test_landing_links_to_insights(driver, base_url):
    _anon(driver)
    goto(driver, f"{base_url}/")
    hrefs = [a.get_attribute("href") or "" for a in driver.find_elements(By.CSS_SELECTOR, "a[href]")]
    assert any("/insights" in h for h in hrefs), "landing should link to /insights (nav + footer)"


@allure.feature("Insights")
@allure.story("Insights is a primary nav tab in the app (TC-INS-14)")
@pytest.mark.public
def test_app_navtabs_has_insights(authed, base_url):
    goto(authed, f"{base_url}/app")
    tab = wait_present(authed, "nav.cdn-tabs a[href='/app/insights']")
    assert "Insights" in text_of(tab), "the primary app nav should include an Insights tab"


@allure.feature("Insights")
@allure.story("Insights is also reachable from the in-app account menu (TC-INS-14)")
@pytest.mark.public
def test_app_account_menu_links_to_insights(authed, base_url):
    goto(authed, f"{base_url}/app")
    # Open the avatar/account dropdown; the Insights entry should be present.
    click(authed, "button[aria-label='Account menu']")
    link = wait_present(authed, "div[role=menu] a[href='/app/insights']")
    assert link, "account menu should expose an Insights link"


@allure.feature("Insights")
@allure.story("Logged-out Insights nav offers a 'Se connecter' CTA (TC-INS-20)")
@pytest.mark.public
def test_insights_nav_logged_out_has_auth_cta(driver, base_url):
    _anon(driver)
    goto(driver, f"{base_url}{HUB}")
    hrefs = [a.get_attribute("href") or "" for a in driver.find_elements(By.CSS_SELECTOR, ".ins-nav a[href]")]
    assert any("/login" in h for h in hrefs), "logged-out insights nav must offer Se connecter (login)"


@allure.feature("Insights")
@allure.story("In-app /app/insights keeps the app menu + account menu, no marketing ticker (TC-INS-20)")
@pytest.mark.public
def test_app_insights_renders_in_app_shell(authed, base_url):
    # The whole point: clicking Insights stays in the app shell — the same tab
    # bar and account menu persist, and there's no marketing ticker.
    goto(authed, f"{base_url}/app/insights")
    assert "/app/insights" in authed.current_url, f"should stay on /app/insights, got {authed.current_url}"
    assert authed.find_elements(By.CSS_SELECTOR, "nav.cdn-tabs"), "the app tab menu must stay visible"
    assert authed.find_elements(By.CSS_SELECTOR, "button[aria-label='Account menu']"), "account menu must stay"
    # The public-only market chrome (index strip) must not appear inside the app.
    assert not authed.find_elements(By.CSS_SELECTOR, ".ins-indexbar"), "no market index strip inside the app"
    links = [a.get_attribute("href") or "" for a in authed.find_elements(By.CSS_SELECTOR, ".ins-page a[href]")]
    assert any("/app/insights/" in h for h in links), "article links should stay within the app"


@allure.feature("Insights")
@allure.story("Public /insights for a signed-in visitor shows the account menu, not signup (TC-INS-20)")
@pytest.mark.public
def test_public_insights_logged_in_shows_account_menu(authed, base_url):
    goto(authed, f"{base_url}{HUB}")
    assert authed.find_elements(By.CSS_SELECTOR, ".ins-nav button[aria-label='Account menu']"), (
        "a signed-in visitor on the public page should see their account menu"
    )
    hrefs = [a.get_attribute("href") or "" for a in authed.find_elements(By.CSS_SELECTOR, ".ins-nav a[href]")]
    assert not any("/signup" in h for h in hrefs), "signed-in visitor should not be shown Start free"

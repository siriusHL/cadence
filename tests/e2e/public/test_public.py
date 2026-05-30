"""§7.1 Public marketing pages — landing + pricing + FAQ (TC-LAND-01, TC-PRC-01, TC-FAQ-01).

Run logged-out (cookies cleared) so the CTAs are the anonymous-visitor ones.
"""
from __future__ import annotations

import allure
import pytest
from selenium.webdriver.common.by import By

from helpers import goto, screenshot, severe_console_errors


def _anon(driver):
    driver.delete_all_cookies()
    driver._tier = None


@allure.feature("Public")
@allure.story("Landing renders and links to /signup and /login (TC-LAND-01)")
@pytest.mark.public
def test_landing_links(driver, base_url):
    _anon(driver)
    goto(driver, f"{base_url}/")
    hrefs = [a.get_attribute("href") or "" for a in driver.find_elements(By.CSS_SELECTOR, "a[href]")]
    assert any("/signup" in h for h in hrefs), "landing should link to /signup"
    assert any("/login" in h for h in hrefs), "landing should link to /login"
    screenshot(driver, "landing")
    assert not severe_console_errors(driver)


@allure.feature("Public")
@allure.story("Pricing names the tiers and CTAs lead to /signup (TC-PRC-01)")
@pytest.mark.public
def test_pricing_plans(driver, base_url):
    _anon(driver)
    goto(driver, f"{base_url}/pricing")
    body = driver.find_element(By.TAG_NAME, "body").text.lower()
    assert ("premium" in body and "elite" in body), "pricing should name the tiers"
    hrefs = [a.get_attribute("href") or "" for a in driver.find_elements(By.CSS_SELECTOR, "a[href]")]
    assert any("/signup" in h for h in hrefs), "pricing CTAs should lead to /signup"
    screenshot(driver, "pricing")
    assert not severe_console_errors(driver)


@allure.feature("Public")
@allure.story("FAQ answers questions and guides every page (TC-FAQ-01)")
@pytest.mark.public
def test_faq_content(driver, base_url):
    _anon(driver)
    goto(driver, f"{base_url}/faq")
    body = driver.find_element(By.TAG_NAME, "body").text.lower()

    # Q&A is present and expandable (native <details>, no client JS needed).
    qa = driver.find_elements(By.CSS_SELECTOR, "details summary")
    assert len(qa) >= 5, "FAQ should list several expandable questions"

    # The per-page guide names the headline screens across every tier.
    for page_name in ("dashboard", "performance", "tax", "alerts", "portfolios"):
        assert page_name in body, f"page guide should explain the {page_name} screen"

    # Plan facts stay consistent with the tier SSOT / pricing page.
    assert "premium" in body and "elite" in body, "FAQ should name the paid tiers"

    # CTAs lead a curious visitor to sign up / pricing — never a dead end.
    hrefs = [a.get_attribute("href") or "" for a in driver.find_elements(By.CSS_SELECTOR, "a[href]")]
    assert any("/signup" in h for h in hrefs), "FAQ should link to /signup"
    assert any("/pricing" in h for h in hrefs), "FAQ should link to /pricing"

    screenshot(driver, "faq")
    assert not severe_console_errors(driver)

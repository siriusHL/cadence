"""§7.1 Public marketing pages — landing + pricing (TC-LAND-01, TC-PRC-01).

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

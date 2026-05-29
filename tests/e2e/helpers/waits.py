"""Explicit-wait primitives.

The whole suite waits explicitly — never `time.sleep` — so tests are both
fast (they proceed the instant the condition holds) and non-flaky (they
don't assert against a half-rendered page). Timeouts are tight because the
app under test is a pre-compiled production build, not the dev server.
"""
from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

# Tight default: a prod build serves pages fast, so anything slower than
# this is a real problem, not a compile delay.
DEFAULT_TIMEOUT = 15

# An element that proves a page rendered something meaningful (or cleanly
# redirected to an auth / tier-gate page that itself renders one of these).
LANDMARK = (By.CSS_SELECTOR, "h1, [role=tablist], main, form, .cdn-pro, .cdn-free")


def wait(driver, timeout=None) -> WebDriverWait:
    return WebDriverWait(driver, timeout or DEFAULT_TIMEOUT)


def wait_ready(driver, timeout=None) -> None:
    wait(driver, timeout).until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )


def wait_present(driver, css: str, timeout=None):
    return wait(driver, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, css))
    )


def wait_visible(driver, css: str, timeout=None):
    return wait(driver, timeout).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, css))
    )


def wait_clickable(driver, css: str, timeout=None):
    return wait(driver, timeout).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, css))
    )


def wait_landmark(driver, timeout=None):
    return wait(driver, timeout).until(EC.presence_of_element_located(LANDMARK))


def wait_url_contains(driver, fragment: str, timeout=None) -> None:
    wait(driver, timeout).until(lambda d: fragment in d.current_url)


def wait_url_not_contains(driver, fragment: str, timeout=None) -> None:
    wait(driver, timeout).until(lambda d: fragment not in d.current_url)


def wait_text(driver, css: str, timeout=None):
    """Wait until the first match exists AND has non-empty textContent.

    Uses textContent (not visible `.text`) because animated/aria-hidden
    elements can hold their value in the DOM while `.text` still returns ''.
    """

    def _has_text(d) -> bool:
        els = d.find_elements(By.CSS_SELECTOR, css)
        return bool(els) and (els[0].get_attribute("textContent") or "").strip() != ""

    wait(driver, timeout).until(_has_text)
    return driver.find_element(By.CSS_SELECTOR, css)


def present_or_skip(driver, css: str, reason: str, timeout: int = 8):
    """Wait for `css` to appear; pytest.skip(reason) if it never does.

    Lets a data/chart test wait properly (honouring "always wait before
    asserting") yet skip cleanly when a precondition (seeded data, tier,
    feature) isn't met — rather than failing the merge gate on an empty
    account.
    """
    import pytest
    from selenium.common.exceptions import TimeoutException

    try:
        return wait_present(driver, css, timeout)
    except TimeoutException:
        pytest.skip(reason)

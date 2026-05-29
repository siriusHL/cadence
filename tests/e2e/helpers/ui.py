"""Navigation, interaction and screenshot helpers — each one waits.

Project rule: never capture or assert against a fast/half-rendered page.
`goto` waits for readyState + a landmark; `screenshot` waits for readyState,
optional element visibility, and two paint frames so entrance animations
finish before the PNG is taken.
"""
from __future__ import annotations

import allure

from .console import drain_console
from .waits import wait_clickable, wait_landmark, wait_ready, wait_visible


def goto(driver, url: str, *, landmark: bool = True, timeout=None) -> None:
    drain_console(driver)  # isolate this page's console errors
    driver.get(url)
    wait_ready(driver, timeout)
    if landmark:
        wait_landmark(driver, timeout)


def text_of(el) -> str:
    """textContent (not visible `.text`) — robust to animated/hidden nodes."""
    return (el.get_attribute("textContent") or "").strip()


def click(driver, css: str, timeout=None):
    el = wait_clickable(driver, css, timeout)
    el.click()
    return el


def screenshot(driver, name: str, *, css: str | None = None, timeout=None) -> None:
    """Wait for the page to settle, THEN attach a PNG to the Allure report.

    Waits for document.readyState == complete, optionally for `css` to be
    visible, then lets the browser paint two frames so transitions finish.
    Capture must never break a test, so any wait failure is swallowed and
    the shot is still taken.
    """
    try:
        wait_ready(driver, timeout)
        if css:
            wait_visible(driver, css, timeout)
        driver.execute_async_script(
            "const cb = arguments[arguments.length - 1];"
            "requestAnimationFrame(() => requestAnimationFrame(cb));"
        )
    except Exception:  # noqa: BLE001 — screenshotting must never break a run
        pass
    allure.attach(
        driver.get_screenshot_as_png(),
        name=name,
        attachment_type=allure.attachment_type.PNG,
    )

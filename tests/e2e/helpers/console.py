"""Browser-console inspection — the cheap, high-yield "no runtime error"
invariant asserted on every page (test plan §5.2 structural proxy)."""
from __future__ import annotations

# Messages that are not real app errors and must not fail a test.
_CONSOLE_NOISE = (
    "favicon.ico",
    "Download the React DevTools",
    "Failed to load resource: the server responded with a status of 404",
    "[Fast Refresh]",
)


def drain_console(driver) -> None:
    """Discard pending console entries.

    The WebDriver console log is session-cumulative and only cleared when
    read, so call this right before navigating to isolate a page's errors
    from the previous page's.
    """
    try:
        driver.get_log("browser")
    except Exception:  # noqa: BLE001 — some drivers don't expose logs
        pass


def severe_console_errors(driver) -> list[str]:
    """Return SEVERE browser-console messages, minus known benign noise."""
    out: list[str] = []
    try:
        logs = driver.get_log("browser")
    except Exception:  # noqa: BLE001
        return out
    for entry in logs:
        if entry.get("level") != "SEVERE":
            continue
        msg = entry.get("message", "")
        if any(n in msg for n in _CONSOLE_NOISE):
            continue
        out.append(msg)
    return out

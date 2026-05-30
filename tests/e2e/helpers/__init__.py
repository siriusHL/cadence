"""Shared, dependency-light helpers for the Cadence e2e suite.

Importable from any test under tests/e2e thanks to `pythonpath = .` in
pytest.ini. Tests import these helpers from `helpers` and receive fixtures
via pytest injection — they must NOT do `from conftest import ...`.
"""
from .api import api
from .console import drain_console, severe_console_errors
from .money import parse_money
from .ui import click, goto, screenshot, text_of
from .waits import (
    DEFAULT_TIMEOUT,
    LANDMARK,
    wait,
    wait_clickable,
    wait_landmark,
    wait_present,
    wait_ready,
    wait_text,
    wait_text_any,
    wait_url_contains,
    wait_url_not_contains,
    wait_visible,
    present_or_skip,
)
from .charts import assert_chart_sane

__all__ = [
    "api",
    "drain_console",
    "severe_console_errors",
    "parse_money",
    "click",
    "goto",
    "screenshot",
    "text_of",
    "DEFAULT_TIMEOUT",
    "LANDMARK",
    "wait",
    "wait_clickable",
    "wait_landmark",
    "wait_present",
    "wait_ready",
    "wait_text",
    "wait_text_any",
    "wait_url_contains",
    "wait_url_not_contains",
    "wait_visible",
    "present_or_skip",
    "assert_chart_sane",
]

"""Parse the app's money strings into floats for internal-consistency checks.

Deliberately clock-independent: we never hard-code euro amounts (they drift
with live prices), we just confirm figures parse and relate sanely.
"""
from __future__ import annotations

import re

_NUM = re.compile(r"-?[\d.,]+")


def parse_money(text: str | None) -> float | None:
    """Pull the first number out of '€1,020k' / '€5,847' / '1 234,56 €'.

    Expands a trailing 'k'. Returns None when nothing numeric is present.
    """
    if not text:
        return None
    # Normalise the unicode spaces used as thousands separators in € output.
    norm = text.replace(" ", " ").replace(" ", " ")
    m = _NUM.search(norm)
    if not m:
        return None
    raw = m.group(0).replace(",", "")
    try:
        val = float(raw)
    except ValueError:
        return None
    if "k" in norm.lower():
        val *= 1000
    return val

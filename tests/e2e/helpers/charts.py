"""Layer-A chart geometry sanity (test plan §6.6, TC-VIS-01/03).

Deterministic DOM/SVG geometry assertions — no pixel diffs, no flake. We
read getBoundingClientRect for the chart's real child elements and flag the
two breakages a human would notice: items rendered sub-minimum (invisible
slivers) and items spilling outside their container. Tolerances are
generous on purpose so rounding never trips the merge gate.
"""
from __future__ import annotations

_GEOM_JS = r"""
const [containerSel, itemSels, minPx, tol] = arguments;
const container = document.querySelector(containerSel);
if (!container) return {error: 'container-not-found'};
const crect = container.getBoundingClientRect();
const isVisible = (el) => {
  const s = getComputedStyle(el);
  if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity || '1') === 0) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};
let items = [];
for (const sel of itemSels) items = items.concat(Array.from(container.querySelectorAll(sel)));
items = items.filter(isVisible);
const tiny = [], overflow = [];
for (const el of items) {
  const r = el.getBoundingClientRect();
  const tag = (el.getAttribute('class') || el.tagName || '').toString().slice(0, 40);
  // Use the larger dimension: a value-bar can legitimately be ~0px tall
  // (a zero month) while still being a real, visible column. Only a mark
  // that is tiny in BOTH dimensions is actually an invisible sliver.
  if (Math.max(r.width, r.height) < minPx) tiny.push(tag + ' ' + r.width.toFixed(1) + 'x' + r.height.toFixed(1));
  if (r.left < crect.left - tol || r.right > crect.right + tol ||
      r.top < crect.top - tol || r.bottom > crect.bottom + tol) overflow.push(tag);
}
return {count: items.length, tiny, overflow};
"""


def assert_chart_sane(driver, container_css: str, item_css, *, min_px: float = 2.0, tol: float = 2.0) -> dict:
    """Assert every visible chart item meets a min size and stays in-bounds.

    container_css: the chart card/wrapper. item_css: one selector or a list
    of selectors for the meaningful marks (bars, dots, segments, labels).
    """
    if isinstance(item_css, str):
        item_css = [item_css]
    res = driver.execute_script(_GEOM_JS, container_css, list(item_css), float(min_px), float(tol))
    assert res and not res.get("error"), f"chart container {container_css!r} not found"
    assert res["count"] > 0, f"no visible chart items for {item_css} in {container_css}"
    assert not res["tiny"], f"sub-minimum chart elements in {container_css}: {res['tiny'][:5]}"
    assert not res["overflow"], f"chart elements overflow {container_css}: {res['overflow'][:5]}"
    return res

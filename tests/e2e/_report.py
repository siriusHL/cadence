"""Self-contained HTML report renderer for the Cadence E2E suite.

Produces a single, dependency-free `report.html` (all CSS inlined, no
fetch()/external assets) so it opens cleanly by double-click — no HTTP
server, no "Failed to fetch", and no embedded screenshots.

The pytest hooks in conftest.py collect a flat list of result records and
hand them to `render()`. Kept as a pure function so the design can be
previewed without running the suite:  `python tests/e2e/_report.py`.
"""

from __future__ import annotations

import html
import tempfile
from datetime import datetime
from pathlib import Path

# Palette — modern, restrained, finance-app friendly.
OK = "#10b981"      # emerald  (passed)
BAD = "#ef4444"     # red      (failed)
SKIP = "#f59e0b"    # amber    (skipped)

# Friendly suite names keyed by test module basename.
_SUITE_LABELS = {
    "test_smoke.py": "Smoke · page reachability",
    "test_charts.py": "Charts · structure",
    "test_data.py": "Data · correctness",
    "test_flows.py": "Flows · mutations",
}
_SUITE_ORDER = list(_SUITE_LABELS.values())


def _esc(text: object) -> str:
    return html.escape(str(text), quote=True)


def _module(nodeid: str) -> str:
    mod = nodeid.split("::", 1)[0]
    return mod.replace("\\", "/").rsplit("/", 1)[-1]


def suite_label(nodeid: str) -> str:
    mod = _module(nodeid)
    if mod in _SUITE_LABELS:
        return _SUITE_LABELS[mod]
    return mod.removeprefix("test_").removesuffix(".py").replace("_", " ").title()


def humanize(nodeid: str) -> tuple[str, str | None]:
    """'test_smoke.py::test_app_page_loads[dashboard]' -> ('App page loads', 'dashboard')."""
    after = nodeid.split("::", 1)[1] if "::" in nodeid else nodeid
    param = None
    if after.endswith("]") and "[" in after:
        after, param = after[:-1].split("[", 1)
    name = after.removeprefix("test_").replace("_", " ").strip()
    name = name[:1].upper() + name[1:] if name else after
    return name, param


def _fmt_dur(seconds: float | None) -> str:
    if not seconds:
        return "—"
    if seconds < 1:
        return f"{seconds * 1000:.0f} ms"
    if seconds < 60:
        return f"{seconds:.2f} s"
    minutes, secs = divmod(seconds, 60)
    return f"{int(minutes)}m {secs:.0f}s"


_CSS = """
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#eef2f7;color:#0f172a;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,
  "Apple Color Emoji","Segoe UI Emoji",sans-serif;line-height:1.5;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.wrap{max-width:1080px;margin:0 auto;padding:36px 22px 72px}
a{color:inherit}

/* Hero */
.hero{position:relative;overflow:hidden;border-radius:22px;color:#f8fafc;
  background:radial-gradient(1200px 400px at 85% -20%,rgba(99,102,241,.55),transparent 60%),
  linear-gradient(135deg,#0b1220 0%,#172033 55%,#1f1b4d 100%);
  padding:34px 38px;box-shadow:0 18px 40px -12px rgba(15,23,42,.45)}
.hero-top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
.brand{font-size:12px;font-weight:700;letter-spacing:.28em;color:#a5b4fc}
.hero h1{margin:8px 0 2px;font-size:27px;font-weight:700;letter-spacing:-.02em}
.hero .sub{margin:0;color:#aebbcf;font-size:13.5px}
.verdict{flex:none;display:inline-flex;align-items:center;gap:9px;font-weight:700;
  font-size:13px;letter-spacing:.04em;padding:9px 16px;border-radius:999px;
  border:1px solid transparent;backdrop-filter:blur(4px)}
.verdict .dot{width:9px;height:9px;border-radius:50%}
.verdict--ok{background:rgba(16,185,129,.14);color:#6ee7b7;border-color:rgba(16,185,129,.4)}
.verdict--ok .dot{background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.18)}
.verdict--bad{background:rgba(239,68,68,.14);color:#fca5a5;border-color:rgba(239,68,68,.4)}
.verdict--bad .dot{background:#ef4444;box-shadow:0 0 0 4px rgba(239,68,68,.18)}
.meta{display:flex;flex-wrap:wrap;gap:26px;margin-top:26px}
.meta>div{display:flex;flex-direction:column;gap:2px}
.meta span{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8ea0bd}
.meta b{font-size:14px;font-weight:600;color:#eef2ff}

/* Overview */
.overview{display:grid;grid-template-columns:auto 1fr;gap:18px;margin-top:18px}
.card{background:#fff;border:1px solid #e6ebf2;border-radius:18px;
  box-shadow:0 1px 2px rgba(15,23,42,.04)}
.donut-card{display:flex;align-items:center;gap:22px;padding:22px 26px}
.donut{width:128px;height:128px;border-radius:50%;flex:none;
  display:grid;place-items:center;
  -webkit-mask:radial-gradient(transparent 56px,#000 57px);
  mask:radial-gradient(transparent 56px,#000 57px)}
.donut-hole{text-align:center}
.donut-pct{font-size:30px;font-weight:750;letter-spacing:-.03em;line-height:1}
.donut-lbl{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;margin-top:4px}
.legend{display:flex;flex-direction:column;gap:10px}
.legend div{display:flex;align-items:center;gap:9px;font-size:13.5px;color:#334155}
.legend i{width:10px;height:10px;border-radius:3px;flex:none}
.legend b{margin-left:auto;font-variant-numeric:tabular-nums;color:#0f172a}

.stat-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.stat{padding:18px 18px 16px;border-radius:16px;background:#fff;border:1px solid #e6ebf2;
  position:relative;overflow:hidden}
.stat::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:4px}
.stat--total::before{background:#94a3b8}
.stat--ok::before{background:#10b981}
.stat--bad::before{background:#ef4444}
.stat--skip::before{background:#f59e0b}
.stat .n{font-size:30px;font-weight:750;letter-spacing:-.03em;line-height:1.1}
.stat .k{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin-top:6px}
.stat--ok .n{color:#059669}.stat--bad .n{color:#dc2626}.stat--skip .n{color:#d97706}

/* Suites */
.suite{margin-top:26px}
.suite-head{display:flex;align-items:center;gap:14px;margin:0 4px 12px}
.suite-head h2{margin:0;font-size:15px;font-weight:700;letter-spacing:-.01em}
.suite-line{flex:1;height:1px;background:linear-gradient(90deg,#dbe3ee,transparent)}
.suite-counts{display:flex;gap:6px}
.mini{font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;font-variant-numeric:tabular-nums}
.mini--ok{background:rgba(16,185,129,.12);color:#047857}
.mini--bad{background:rgba(239,68,68,.12);color:#b91c1c}
.mini--skip{background:rgba(245,158,11,.14);color:#b45309}

.rows{overflow:hidden;border-radius:16px;border:1px solid #e6ebf2;background:#fff}
.row{display:flex;align-items:center;gap:16px;padding:13px 18px;border-top:1px solid #eef2f7}
.row:first-child{border-top:none}
.row:hover{background:#f8fafc}
.pill{flex:none;width:74px;text-align:center;font-size:10.5px;font-weight:800;
  letter-spacing:.08em;padding:5px 0;border-radius:7px;text-transform:uppercase}
.pill--passed{background:rgba(16,185,129,.13);color:#047857}
.pill--failed{background:rgba(239,68,68,.13);color:#b91c1c}
.pill--skipped{background:rgba(148,163,184,.18);color:#475569}
.row-main{flex:1;min-width:0}
.row-name{font-size:14px;font-weight:560;color:#1e293b;display:flex;align-items:center;
  gap:9px;flex-wrap:wrap}
.chip{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;
  background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;padding:1px 8px;border-radius:6px}
.skip-reason{margin-top:4px;font-size:12.5px;color:#94a3b8}
.row-dur{flex:none;font-size:12.5px;color:#94a3b8;font-variant-numeric:tabular-nums;min-width:64px;text-align:right}
.trace{margin-top:8px}
.trace summary{cursor:pointer;font-size:12.5px;color:#dc2626;font-weight:600;
  list-style:none;display:inline-flex;align-items:center;gap:6px;user-select:none}
.trace summary::-webkit-details-marker{display:none}
.trace summary::before{content:"▸";transition:transform .15s ease;display:inline-block}
.trace[open] summary::before{transform:rotate(90deg)}
.trace pre{margin:10px 0 2px;background:#0b1220;color:#e2e8f0;border-radius:12px;
  padding:14px 16px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:12px;line-height:1.55;max-height:340px}
.shot{margin-top:8px}
.shot summary{cursor:pointer;font-size:12.5px;color:#6366f1;font-weight:600;
  list-style:none;display:inline-flex;align-items:center;gap:6px;user-select:none}
.shot summary::-webkit-details-marker{display:none}
.shot summary::before{content:"▸";transition:transform .15s ease;display:inline-block}
.shot[open] summary::before{transform:rotate(90deg)}
.shot img{display:block;margin-top:10px;max-width:100%;border:1px solid #e2e8f0;
  border-radius:10px;box-shadow:0 8px 22px -10px rgba(15,23,42,.4)}

footer{margin-top:34px;text-align:center;color:#94a3b8;font-size:12px}
footer b{color:#64748b;font-weight:600}

@media (max-width:720px){
  .overview{grid-template-columns:1fr}
  .stat-cards{grid-template-columns:repeat(2,1fr)}
  .hero{padding:26px 22px}
}
"""


def render(records: list[dict], meta: dict) -> str:
    total = len(records)
    passed = sum(1 for r in records if r["status"] == "passed")
    failed = sum(1 for r in records if r["status"] == "failed")
    skipped = sum(1 for r in records if r["status"] == "skipped")
    rate = round(passed / total * 100) if total else 0

    # Donut conic-gradient stops (passed → skipped → failed).
    if total:
        s1 = passed / total * 100
        s2 = s1 + skipped / total * 100
    else:
        s1 = s2 = 0.0
    grad = (
        f"conic-gradient({OK} 0 {s1:.2f}%,{SKIP} {s1:.2f}% {s2:.2f}%,"
        f"{BAD} {s2:.2f}% 100%)"
    )

    start: datetime = meta.get("start") or datetime.now()
    end: datetime = meta.get("end") or datetime.now()
    wall = (end - start).total_seconds()
    ok = failed == 0

    out: list[str] = []
    out.append("<!doctype html><html lang='en'><head><meta charset='utf-8'>")
    out.append("<meta name='viewport' content='width=device-width, initial-scale=1'>")
    out.append("<title>Cadence · E2E Report</title>")
    out.append(f"<style>{_CSS}</style></head><body><div class='wrap'>")

    # Hero
    out.append("<header class='hero'><div class='hero-top'><div>")
    out.append("<div class='brand'>CADENCE</div>")
    out.append("<h1>End-to-End Test Report</h1>")
    out.append("<p class='sub'>Selenium · pytest · headless Chrome</p></div>")
    vclass = "ok" if ok else "bad"
    vtext = "ALL PASSED" if ok else f"{failed} FAILED"
    out.append(f"<div class='verdict verdict--{vclass}'><span class='dot'></span>{vtext}</div>")
    out.append("</div><div class='meta'>")
    for label, value in (
        ("Run", start.strftime("%d %b %Y · %H:%M")),
        ("Duration", _fmt_dur(wall)),
        ("Target", meta.get("base_url", "—")),
        ("Browser", meta.get("browser", "Chrome")),
        ("Account", meta.get("account", "—")),
    ):
        out.append(f"<div><span>{_esc(label)}</span><b>{_esc(value)}</b></div>")
    out.append("</div></header>")

    # Overview: donut + stat cards
    out.append("<section class='overview'>")
    out.append(f"<div class='card donut-card'><div class='donut' style='background:{grad}'>")
    out.append(f"<div class='donut-hole'><div class='donut-pct'>{rate}%</div>")
    out.append("<div class='donut-lbl'>passed</div></div></div><div class='legend'>")
    for color, label, n in ((OK, "Passed", passed), (SKIP, "Skipped", skipped), (BAD, "Failed", failed)):
        out.append(f"<div><i style='background:{color}'></i>{label}<b>{n}</b></div>")
    out.append("</div></div>")

    out.append("<div class='stat-cards'>")
    for cls, n, k in (
        ("total", total, "Total"),
        ("ok", passed, "Passed"),
        ("bad", failed, "Failed"),
        ("skip", skipped, "Skipped"),
    ):
        out.append(f"<div class='stat stat--{cls}'><div class='n'>{n}</div><div class='k'>{k}</div></div>")
    out.append("</div></section>")

    # Group by suite
    groups: dict[str, list[dict]] = {}
    for r in records:
        groups.setdefault(suite_label(r["nodeid"]), []).append(r)

    def _order(label: str) -> tuple[int, str]:
        return (_SUITE_ORDER.index(label) if label in _SUITE_ORDER else len(_SUITE_ORDER), label)

    _rank = {"failed": 0, "skipped": 1, "passed": 2}
    for label in sorted(groups, key=_order):
        rows = sorted(groups[label], key=lambda r: (_rank.get(r["status"], 3), r["nodeid"]))
        g_ok = sum(1 for r in rows if r["status"] == "passed")
        g_bad = sum(1 for r in rows if r["status"] == "failed")
        g_skip = sum(1 for r in rows if r["status"] == "skipped")

        out.append("<section class='suite'><div class='suite-head'>")
        out.append(f"<h2>{_esc(label)}</h2><div class='suite-line'></div><div class='suite-counts'>")
        if g_ok:
            out.append(f"<span class='mini mini--ok'>{g_ok} passed</span>")
        if g_bad:
            out.append(f"<span class='mini mini--bad'>{g_bad} failed</span>")
        if g_skip:
            out.append(f"<span class='mini mini--skip'>{g_skip} skipped</span>")
        out.append("</div></div><div class='rows'>")

        for r in rows:
            name, param = humanize(r["nodeid"])
            status = r["status"]
            out.append(f"<div class='row row--{status}'>")
            out.append(f"<span class='pill pill--{status}'>{status}</span>")
            out.append("<div class='row-main'><div class='row-name'>")
            out.append(_esc(name))
            if param:
                out.append(f"<span class='chip'>{_esc(param)}</span>")
            out.append("</div>")
            detail = r.get("error")
            if status == "failed" and detail:
                trace = _esc(detail[:6000])
                out.append("<details class='trace'><summary>Show traceback</summary>")
                out.append(f"<pre>{trace}</pre></details>")
            elif status == "skipped" and detail:
                out.append(f"<div class='skip-reason'>{_esc(detail)}</div>")
            shot = r.get("shot")
            if shot:
                out.append("<details class='shot'><summary>📷 Screenshot</summary>")
                out.append(
                    f"<img loading='lazy' alt='screenshot' "
                    f"src='data:image/png;base64,{shot}'></details>"
                )
            out.append("</div>")
            out.append(f"<span class='row-dur'>{_fmt_dur(r.get('dur'))}</span></div>")
        out.append("</div></section>")

    out.append(
        f"<footer>Generated {datetime.now().strftime('%d %b %Y · %H:%M:%S')} · "
        f"<b>{total}</b> tests · Cadence Selenium suite</footer>"
    )
    out.append("</div></body></html>")
    return "".join(out)


_MD_EMOJI = {"passed": "✅", "failed": "❌", "skipped": "⏭️"}


def render_markdown(records: list[dict], meta: dict) -> str:
    """GitHub-flavoured Markdown rendering of the same results, for the
    Actions job summary ($GITHUB_STEP_SUMMARY) — shows inline on the run
    page, so there's nothing to download or unzip."""
    total = len(records)
    passed = sum(1 for r in records if r["status"] == "passed")
    failed = sum(1 for r in records if r["status"] == "failed")
    skipped = sum(1 for r in records if r["status"] == "skipped")
    start = meta.get("start") or datetime.now()
    end = meta.get("end") or datetime.now()
    wall = _fmt_dur((end - start).total_seconds())
    verdict = "✅ All passed" if failed == 0 else f"❌ {failed} failed"

    out: list[str] = []
    out.append(f"# 🧪 Cadence E2E Report — {verdict}\n\n")
    out.append(
        f"**✅ {passed} passed &nbsp;·&nbsp; ⏭️ {skipped} skipped &nbsp;·&nbsp; "
        f"❌ {failed} failed** &nbsp;—&nbsp; {total} total &nbsp;·&nbsp; ⏱️ {wall} "
        f"&nbsp;·&nbsp; {meta.get('browser', 'Chrome')} &nbsp;·&nbsp; {meta.get('account', '—')}\n"
    )

    groups: dict[str, list[dict]] = {}
    for r in records:
        groups.setdefault(suite_label(r["nodeid"]), []).append(r)

    def _order(label: str) -> tuple[int, str]:
        return (_SUITE_ORDER.index(label) if label in _SUITE_ORDER else len(_SUITE_ORDER), label)

    rank = {"failed": 0, "skipped": 1, "passed": 2}
    for label in sorted(groups, key=_order):
        rows = sorted(groups[label], key=lambda r: (rank.get(r["status"], 3), r["nodeid"]))
        g_ok = sum(1 for r in rows if r["status"] == "passed")
        g_bad = sum(1 for r in rows if r["status"] == "failed")
        g_skip = sum(1 for r in rows if r["status"] == "skipped")
        head = "❌" if g_bad else ("⏭️" if g_skip and not g_ok else "✅")
        bits = []
        if g_ok:
            bits.append(f"{g_ok} passed")
        if g_bad:
            bits.append(f"{g_bad} failed")
        if g_skip:
            bits.append(f"{g_skip} skipped")
        out.append(f"\n## {head} {label} &nbsp; ({', '.join(bits)})\n\n")
        out.append("| | Test | Duration |\n| :--: | :-- | --: |\n")
        fails: list[tuple[str, str]] = []
        for r in rows:
            name, param = humanize(r["nodeid"])
            disp = f"{name} `{param}`" if param else name
            disp = disp.replace("|", "\\|")
            out.append(f"| {_MD_EMOJI[r['status']]} | {disp} | {_fmt_dur(r.get('dur'))} |\n")
            if r["status"] == "failed" and r.get("error"):
                fails.append((f"{name} [{param}]" if param else name, r["error"]))
        for disp, err in fails:
            trace = err[:5000].replace("```", "ʼʼʼ")
            out.append(
                f"\n<details><summary>❌ <b>{_esc(disp)}</b> — traceback</summary>\n\n"
                f"```text\n{trace}\n```\n\n</details>\n"
            )

    return "".join(out)


def _demo() -> None:
    """Write a sample report with synthetic data for previewing the design."""
    now = datetime.now()
    records = [
        {"nodeid": "test_smoke.py::test_public_page_loads[/]", "status": "passed", "dur": 1.2, "error": None},
        {"nodeid": "test_smoke.py::test_public_page_loads[/login]", "status": "passed", "dur": 0.8, "error": None},
        {"nodeid": "test_smoke.py::test_app_page_loads[dashboard]", "status": "passed", "dur": 2.4, "error": None},
        {"nodeid": "test_smoke.py::test_app_page_loads[tax]", "status": "failed", "dur": 5.1,
         "error": "AssertionError: Console errors on /app/tax:\n  Module not found: 'xlsx'\n    at ./app/tax/page.tsx:3"},
        {"nodeid": "test_charts.py::test_income_rhythm_chart", "status": "passed", "dur": 3.0, "error": None},
        {"nodeid": "test_charts.py::test_forecast_chart", "status": "skipped", "dur": 0.0,
         "error": "Forecast chart not present (tier/empty portfolio)"},
        {"nodeid": "test_data.py::test_dashboard_value_is_numeric", "status": "passed", "dur": 1.9, "error": None},
    ]
    meta = {
        "start": now, "end": now.replace(second=min(now.second + 33, 59)),
        "base_url": "http://localhost:3000", "browser": "Chrome (headless)",
        "account": "elite tier",
    }
    path = Path(tempfile.gettempdir()) / "cadence-e2e-report-preview.html"
    path.write_text(render(records, meta), encoding="utf-8")
    print(f"Preview written to: {path}")


if __name__ == "__main__":
    _demo()

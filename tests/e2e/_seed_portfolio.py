"""One-off: give the elite e2e user a populated portfolio so the financial /
chart / tax tests assert instead of skipping (test plan §5.4 — "elite carries
a populated multi-country portfolio").

Logs in as the seeded elite user and POSTs a fixed set of dividend-paying
holdings through the real /api/holdings endpoint (reusing the browser
session cookie). Idempotent: if the account already has holdings it exits
without adding, so re-running never duplicates.

    E2E_BASE_URL=http://localhost:3100 python tests/e2e/_seed_portfolio.py

Underscore-prefixed so pytest never collects it as a test.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:3000").rstrip("/")
elite = json.loads((Path(__file__).parent / "test-users.json").read_text())["elite"]

# Well-known dividend payers across sectors so the rhythm/forecast charts,
# diversification donut and tax/withholding screens all have something real.
HOLDINGS = [
    {"ticker": "AAPL", "currency": "USD", "lots": [{"quantity": 40, "price_local": 120, "occurred_on": "2022-03-15", "fee_local": 0, "kind": "buy"}]},
    {"ticker": "MSFT", "currency": "USD", "lots": [{"quantity": 25, "price_local": 250, "occurred_on": "2022-05-10", "fee_local": 0, "kind": "buy"}]},
    {"ticker": "JNJ", "currency": "USD", "lots": [{"quantity": 30, "price_local": 160, "occurred_on": "2021-11-02", "fee_local": 0, "kind": "buy"}]},
    {"ticker": "KO", "currency": "USD", "lots": [{"quantity": 80, "price_local": 55, "occurred_on": "2021-07-20", "fee_local": 0, "kind": "buy"}]},
    {"ticker": "PG", "currency": "USD", "lots": [{"quantity": 35, "price_local": 140, "occurred_on": "2022-01-12", "fee_local": 0, "kind": "buy"}]},
    {"ticker": "PEP", "currency": "USD", "lots": [{"quantity": 20, "price_local": 170, "occurred_on": "2022-02-08", "fee_local": 0, "kind": "buy"}]},
]

_FETCH = """
const h = arguments[0], cb = arguments[arguments.length - 1];
fetch('/api/holdings', {method:'POST', headers:{'Content-Type':'application/json'},
  credentials:'same-origin', body: JSON.stringify(h)})
  .then(r => r.text().then(t => cb({status: r.status, body: t})))
  .catch(e => cb({status: -1, body: String(e)}));
"""

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-dev-shm-usage")
opts.add_argument("--window-size=1440,900")
drv = webdriver.Chrome(options=opts)
drv.set_script_timeout(30)
try:
    drv.get(f"{BASE}/login")
    w = WebDriverWait(drv, 20)
    w.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type=email]"))).send_keys(elite["email"])
    drv.find_element(By.CSS_SELECTOR, "input[type=password]").send_keys(elite["password"])
    drv.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    w.until(lambda d: "/app" in d.current_url and "/login" not in d.current_url)

    # Idempotency via the API (avoids depending on the empty-state UI).
    existing = drv.execute_async_script(
        "const cb=arguments[arguments.length-1];"
        "fetch('/api/holdings',{credentials:'same-origin'})"
        ".then(r=>r.text().then(t=>cb({status:r.status,body:t})))"
        ".catch(e=>cb({status:-1,body:String(e)}));"
    )
    has_data = False
    if existing.get("status") == 200:
        try:
            parsed = json.loads(existing["body"])
            rows = parsed if isinstance(parsed, list) else parsed.get("holdings", [])
            has_data = bool(rows)
        except Exception:
            has_data = False
    if has_data:
        print(f"elite already has holdings ({str(existing['body'])[:60]}) — skipping")
    else:
        for h in HOLDINGS:
            res = drv.execute_async_script(_FETCH, h)
            print(f"  {h['ticker']:5} -> {res['status']}  {str(res['body'])[:100]}")
        print("done")
finally:
    drv.quit()

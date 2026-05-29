"""In-browser API calls executed as the currently logged-in user.

Lets tests assert API contracts (error codes, tier gates, caps) using the
real session cookie without juggling tokens — the fetch runs in the page
origin via execute_async_script. Use this only for NON-destructive /
rejected paths (validation failures, cap hits, wrong-password, blocked
deletes) so the suite stays safe to run repeatedly.
"""
from __future__ import annotations

_FETCH_JS = r"""
const method = arguments[0], path = arguments[1], body = arguments[2];
const cb = arguments[3];
const opts = {method: method, headers: {}, credentials: 'same-origin'};
if (body !== null && body !== undefined) {
  opts.headers['Content-Type'] = 'application/json';
  opts.body = JSON.stringify(body);
}
fetch(path, opts).then(function (r) {
  return r.text().then(function (t) {
    let parsed = null;
    try { parsed = JSON.parse(t); } catch (e) {}
    cb({status: r.status, body: parsed});
  });
}).catch(function (e) { cb({status: -1, error: String(e)}); });
"""


def api(driver, method: str, path: str, body=None) -> dict:
    """Issue `method path` as the logged-in user; return {status, body}."""
    return driver.execute_async_script(_FETCH_JS, method.upper(), path, body)

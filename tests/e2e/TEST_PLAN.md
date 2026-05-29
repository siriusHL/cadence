# Cadence — System / E2E Test Plan

> Test plan ID: `CAD-TP-001` · Level: **System + Acceptance** (black-box, UI-driven) · Standard basis: ISTQB Foundation + ISO/IEC/IEEE 29119‑3 structure · Owner: QA · Status: draft for review

This plan is **risk-based and lean by design**: every test below is justified by a product risk and a test-design technique. We deliberately exclude low-value/redundant checks. Cross-cutting behaviours (auth, tier-gating, caps) are tested **once, centrally** and parametrised — never repeated per page.

---

## 1. Objectives

- Verify each page renders, computes correct/consistent data, and lets the user complete its core tasks.
- Catch the highest-impact defects early: broken auth/tier-gating, data-integrity errors, failed mutations, and runtime/500 errors.
- Provide a repeatable **automated regression** gate on every PR into `develop`/`main`.

## 2. Test items

The deployed Next.js 16 app (`HLRB/cadence`) running against the Supabase backend, exercised through the browser as the three subscription tiers (**free / premium / elite**). Server API routes are covered indirectly through the UI plus targeted negative checks.

## 3. Scope

**In scope (this plan):** functional UI behaviour, input validation, data correctness/consistency, page reachability, navigation, mutations (CRUD + checkout), tier-gating, chart structure & visual sanity, and the no-runtime-error contract.

**Out of scope (with rationale — keeps the suite efficient):**
- *Responsive / multi-resolution / cross-browser* — explicitly descoped by the team; suite runs one viewport, headless Chrome.
- *Unit / component / integration* — owned by developers (Jest/RTL); this plan is system-level. Listed as an assumed prerequisite quality gate.
- *Load / stress / soak* — not part of the PR gate.
- *Penetration testing* — a security review is separate; we cover only auth/authorization behaviour observable through the UI.
- *Real payment capture* — Stripe is exercised up to the checkout redirect only (test mode), never a real charge.

## 4. Quality-risk analysis (drives priority)

| # | Risk area | Impact | Likelihood | **Priority** |
|---|-----------|--------|-----------|--------------|
| R1 | Auth bypass / unauthenticated access to `/app/*` | High | Low | **P1** |
| R2 | Tier-gating bypass (under-tier reaches paid screen via direct URL) | High | Med | **P1** |
| R3 | Wrong financial figures (value, income, P/L, tax, CGT) | High | Med | **P1** |
| R4 | Mutation corrupts data (oversell, cap bypass, delete last portfolio) | High | Med | **P1** |
| R5 | Runtime 500 / Server-Component crash on any page | High | Med | **P1** |
| R6 | Input-validation gaps (negative qty, bad dates, weak password) | Med | High | **P2** |
| R7 | Chart renders wrong / tiny / overlapping / empty | Med | Med | **P2** |
| R8 | Broken empty/error states (dead-ends, missing CTAs) | Low | Med | **P3** |
| R9 | Copy/marketing inconsistency (pricing vs tiers) | Low | High | **P3** |

**Priority key:** **P1** = must pass to merge (blocker); **P2** = should pass, fix before release; **P3** = nice-to-have / exploratory.

## 5. Test approach

### 5.1 Test levels
System (full stack via browser) and Acceptance (use-case scenarios per persona/tier). Component & integration assumed covered upstream.

### 5.2 Test types
- **Functional** — behaviour, validation, mutations, calculations.
- **Non-functional (targeted):** *Performance* (page reaches landmark < 10 s on prod build), *Usability* (every empty/error state has a message + CTA), *Security* (auth redirect, tier-gating, RLS caps, no PII/secret in client, signup confirm-password gap), *Reliability* (flaky external market-data tolerated via reruns).
- **Structural (proxy):** browser console has **no SEVERE errors** and no HTTP 5xx — a cheap, high-yield invariant on every page.
- **Change-related:** *Confirmation* (re-run failed test after fix) + *Regression* (the automated Selenium suite on every PR).

### 5.3 Test-design techniques (and how they keep us efficient)
- **Equivalence Partitioning (EP):** one representative per valid/invalid class — not many.
- **Boundary Value Analysis (BVA):** test only the boundaries of each documented range (see Appendix A). This is where most defects live.
- **Decision tables:** for combinational logic — tier × screen access, login (email valid? × password correct?), withholding rate by country.
- **State transition:** auth lifecycle, portfolio create→switch→delete, message thread open→reply→closed, free→paid upgrade.
- **Use-case / scenario:** end-to-end persona journeys.
- **Experience-based (exploratory + error-guessing + checklist):** time-boxed, targets the gaps techniques miss (e.g. the **signup has no confirm-password** field).

**Efficiency rules applied throughout:** (1) every test maps to a risk; (2) EP/BVA collapse input space to representatives + boundaries; (3) cross-cutting behaviour tested once and parametrised; (4) prefer **clock-independent internal-consistency** assertions over hard-coded euro amounts (numbers drift with live prices/date); (5) read-only display pages share one generic "loads + correct landmark + no console error" template rather than bespoke tests.

### 5.4 Test data & environment
- **Personas:** seeded `free`, `premium`, `elite` users (`scripts/seed-e2e-users.mjs`). Elite carries a populated multi-country portfolio so charts/tax/CGT render.
- **Environment:** production build (`next build && next start`) — pre-compiled, fast, representative; **not** the dev server.
- **Config:** public Supabase URL + anon key; server secrets (service-role, Twelve Data, FMP) from repo secrets. A fail-fast env check guards them.

### 5.5 Entry / exit criteria
- **Entry:** app builds; env present (env-check green); seed users provisioned.
- **Exit (merge gate):** 100% of **P1** pass; ≥95% of **P2** pass with no open P1/P2 blocker; chart-visual and console-error invariants green; report published.
- **Suspension:** if env-check fails or >30% of tests error on infra (e.g. market-data quota), suspend, fix infra/reruns, resume.

### 5.6 Automation & tooling
Selenium 4 + pytest + Allure; self-contained `report.html` (per-test screenshot) + inline GitHub job summary + Pages publish. Flaky external-data failures mitigated with **reruns** (retry transient 429s). Chart visual checks via **DOM/SVG geometry assertions** (§6.6), not pixel diffs.

---

## 6. Cross-cutting suites (tested once, parametrised — not per page)

### 6.1 Authentication (R1) — state transition + decision table
| ID | Title | Technique | Pri | Expected |
|----|-------|-----------|-----|----------|
| TC-AUTH-01 | Unauthenticated GET of every `/app/*` route | EP (1 rep + parametrised list) | P1 | 302 → `/login?next=…` |
| TC-AUTH-02 | Login: valid email + correct password | Decision table | P1 | → `/app` (or `next`) |
| TC-AUTH-03 | Login: valid email + wrong password | Decision table | P1 | stays, shows error, no session |
| TC-AUTH-04 | Login: malformed email | EP/BVA | P2 | browser/API rejects, no submit |
| TC-AUTH-05 | Logout clears session; back-button to `/app` re-redirects | State transition | P1 | redirected to `/login` |
| TC-AUTH-06 | Signup: password `minLength=8` enforced; **no confirm-password field** | Error-guessing | P2 | flag as risk; 7-char rejected, 8 accepted |

### 6.2 Tier-gating / authorization (R2) — decision table (tier × screen)
Build the table once and parametrise. Screens: dashboard, holdings, dividends(+calendar/forecast redirects), performance, diversification, tax, alerts vs account-pages (profile/settings/account/portfolios/messages/add) vs free screens (home/next/stocks/year).

| ID | Title | Technique | Pri | Expected |
|----|-------|-----------|-----|----------|
| TC-TIER-01 | free → paid screen by **direct URL** (dashboard/holdings/performance/diversification) | Decision table (negative) | P1 | gated — must redirect/deny, **not** render. *(Note: only `/app/dividends` & `/app/tax`-family redirect in-page today; others rely on nav gating — explicit direct-URL test required.)* |
| TC-TIER-02 | free → `/app/dividends` direct URL | Decision table | P1 | 302 → `/upgrade` |
| TC-TIER-03 | premium → `/app/tax` & `/app/alerts` (elite-only) | Decision table | P1 | gated → `/upgrade` |
| TC-TIER-04 | elite → all screens | Decision table | P1 | all render |
| TC-TIER-05 | CSV import button hidden for free; visible premium+ | Decision table | P2 | per `can(tier,'csvImport')` |
| TC-TIER-06 | Export (tax-pack/dividends/CGT) requires elite | Decision table | P1 | non-elite → 402 `upgrade_required` |

### 6.3 RLS / capacity caps (R4) — BVA on limits
| ID | Title | Technique | Pri | Expected |
|----|-------|-----------|-----|----------|
| TC-CAP-01 | free add 11th holding (cap 10) | BVA (10 ok, 11 blocked) | P1 | 402 `holding_cap_reached` + upgrade CTA |
| TC-CAP-02 | free create 2nd portfolio (cap 1) | BVA | P1 | 402 `portfolio_cap_reached` |
| TC-CAP-03 | premium create 4th portfolio (cap 3) | BVA | P2 | 402 |

### 6.4 Navigation & reachability (R5) — existing smoke crawl
Generic template: every public + tier-accessible route mounts a landmark (or cleanly redirects) **and** has no SEVERE console error / 5xx. *(Already automated: `test_smoke.py`.)* — P1.

### 6.5 Non-functional spot checks
| ID | Title | Type | Pri | Expected |
|----|-------|------|-----|----------|
| TC-NFR-01 | Each page reaches landmark < 10 s (prod build) | Performance | P2 | within budget |
| TC-NFR-02 | No secret/service-role key in page source or network to 3rd parties | Security | P1 | absent |
| TC-NFR-03 | Every empty/error state shows message **and** a CTA | Usability | P3 | present |

### 6.6 Chart visual sanity (R7) — DOM/SVG geometry assertions
Reusable `assert_chart_sane(container)` across all charts. *(Layer A — deterministic; pixel/visual-AI is a deferred Layer B requiring seeded fixed data.)*
| ID | Title | Technique | Pri | Expected |
|----|-------|-----------|-----|----------|
| TC-VIS-01 | No visible element below min-size (tiny bar/dot/label, sub-px, font < floor) | Boundary/geometry | P2 | none flagged |
| TC-VIS-02 | No unintended overlap among siblings (bars, **axis tick labels**, legend, Now-label) | Geometry (bbox intersection) | P2 | none beyond tolerance |
| TC-VIS-03 | No element spills outside its chart container (clipping/overflow) | Geometry | P2 | all within bounds |

---

## 7. Per-page test design

> Convention: each table lists the **efficient** set — representatives (EP) + boundaries (BVA) + key flows. `Auto` = ✅ in current suite, ➕ proposed automation, ✋ manual/exploratory. Display-only pages reuse the §6.4 template plus a data-consistency check rather than bespoke cases.

### 7.1 Public

**`/` landing** — Risk P3.
| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-LAND-01 | Page loads, hero + primary CTAs link to `/signup` `/login` | Use-case | P3 | ✅ |
| TC-LAND-02 | Reclaim sliders (portfolio €10k–2M, yield 1–8%) update figure at min/max | BVA | P3 | ✋ |
| TC-LAND-03 | Marketing copy vs `tiers.ts` consistency (Premium price, "15 positions" vs cap 10) | Checklist | P3 | ✋ (defect already suspected — R9) |

**`/login`, `/signup`, `/pricing`** — covered by §6.1 + below.
| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-PRC-01 | `/pricing` shows 3 plans; every CTA → `/signup[?tier=]` (no Stripe here) | Use-case | P2 | ➕ |
| TC-SUP-01 | `/upgrade` Premium/Elite card → `POST /api/billing/checkout` → Stripe redirect | State transition | P1 | ➕ |
| TC-SUP-02 | `/upgrade` with price env missing → inline error, no crash | Error-guessing | P3 | ✋ |

### 7.2 Core financial (premium+/elite)

**`/app/dashboard`** — Risk P1 (headline figures). 
| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-DASH-01 | Hero portfolio value parses to **positive €** | Internal consistency | P1 | ✅ |
| TC-DASH-02 | Safety score bucket boundaries: yield 2.9/3.0, 4.9/5.0, 6.9/7.0 → 95/80/55/30 | **BVA + decision table** | P2 | ➕ |
| TC-DASH-03 | Income-rhythm chart: ≥12 bars, `Now` marker present, € y-ticks | Structural | P1 | ✅ |
| TC-DASH-04 | Chart visual sanity (TC-VIS-01..03) | Geometry | P2 | ➕ |
| TC-DASH-05 | 0-holdings → distinct empty state w/ Add CTA | Use-case | P3 | ✅(skip) |

**`/app/holdings`** — Risk P1 (table integrity + bulk delete). 
| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-HLD-01 | Rendered rows == "N of N" count; totals footer numeric | Internal consistency | P1 | ✅ |
| TC-HLD-02 | Search filter narrows rows; no-match shows message | EP | P2 | ➕ |
| TC-HLD-03 | Group chips All/Sector/Country regroup without data loss | EP | P3 | ➕ |
| TC-HLD-04 | Sort each column toggles asc/desc, order correct | EP (1 numeric+1 text col) | P2 | ➕ |
| TC-HLD-05 | Bulk-select → delete → rows removed; partial-failure toast | State transition | P1 | ➕ |
| TC-HLD-06 | Freq label maps 12/4/2/1 → Mon/Qtr/Semi/Ann | Decision table | P3 | ➕ |

**`/app/dividends` (+ tabs)** — Risk P1. 
| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-DIV-01 | Invalid `?tab=xyz` falls back to `upcoming` | EP (invalid) | P2 | ➕ |
| TC-DIV-02 | Withholding rate by country: US .15, DE .26375, FR .128, CH .35, GB 0, default .15 | **Decision table** | P1 | ➕ |
| TC-DIV-03 | "This week" = events ≤ 7 days | BVA (7 vs 8 days) | P2 | ➕ |
| TC-DIV-04 | Forecast chart: `.fc-col` bars + cumulative `.fc-dot`s render | Structural | P1 | ✅ |
| TC-DIV-05 | **Simulator sliders BVA** — each at min/max/step: Horizon 5–40/1, Yield 1–9/0.1, Growth 0–15/0.1, Contrib 0–3000/50, Target 5000–150000/1000 | **BVA** | P2 | ➕ |
| TC-DIV-06 | Simulator empty when totalValue ≤ 0 or fwd income ≤ 0 | EP (boundary 0) | P2 | ➕ |
| TC-DIV-07 | Year heatmap renders current-year cells + legend | Structural | P2 | ➕ |
| TC-DIV-08 | Chart visual sanity (forecast, year, simulator) | Geometry | P2 | ➕ |

**`/app/performance`** — Risk P1 (metrics). 
| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-PERF-01 | Cumulative-return area + benchmark lines render; endpoints present | Structural | P1 | ➕ |
| TC-PERF-02 | <2 snapshots → "building history" state (no crash, no fake chart) | EP (boundary) | P2 | ➕ |
| TC-PERF-03 | Risk metrics show `—` when no benchmark (not NaN/0) | Error-guessing | P2 | ➕ |
| TC-PERF-04 | Period table values internally consistent with chart endpoints sign | Internal consistency | P2 | ➕ |

**`/app/diversification`** — Risk P2. 
| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-DVR-01 | Donut segment(s) render (`svg circle`) | Structural | P1 | ✅ |
| TC-DVR-02 | HHI label thresholds: 1499/1500 and 2500/2501 → diversified / moderate / highly | **BVA** | P2 | ➕ |
| TC-DVR-03 | Weighting toggle value↔income recomputes mix | EP | P2 | ➕ |
| TC-DVR-04 | Min-yield slider filters; over-filter → "no payers above X%" | BVA (slider bounds) | P3 | ➕ |

**`/app/tax`** (elite) — Risk P1 (legal numbers). 
| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-TAX-01 | `?year=` boundary: 1999→default, 2000 ok, currentYear+1 ok, +2→default | **BVA** | P1 | ➕ |
| TC-TAX-02 | Residence tax model picks right rates/allowance per country (IE/NL/DE/FR/ES/GB…) | **Decision table** | P1 | ➕ |
| TC-TAX-03 | Reclaim card appears only when reclaimable > €0.01 | BVA (boundary) | P2 | ➕ |
| TC-TAX-04 | CGT (FIFO) + `hasUnmatchedSells` warning surfaces | Use-case | P2 | ➕ |
| TC-TAX-05 | Export `?year=` API: 1899/1900/2999/3000 → 400 vs 200 | **BVA** | P2 | ➕ |
| TC-TAX-06 | Export endpoints reject non-elite (402) | Decision table | P1 | ➕ |

### 7.3 Mutations / account (all tiers)

**`/app/add` (add-holding)** — Risk P1 (core write + oversell). 
| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-ADD-01 | Quantity boundary: 0 rejected, 0.0001 accepted, −1 rejected, non-numeric rejected | **BVA + EP** | P1 | ➕ |
| TC-ADD-02 | Price ≥ 0: −0.01 rejected, 0 accepted | BVA | P2 | ➕ |
| TC-ADD-03 | Date `max=today`: today ok, tomorrow rejected; bad format rejected | BVA | P1 | ➕ |
| TC-ADD-04 | Ticker required (1–16 chars, upper-cased); empty → "Pick a ticker first" | EP/BVA | P2 | ➕ |
| TC-ADD-05 | Multi-lot: add/remove lot, ≥1 enforced | State transition | P2 | ➕ |
| TC-ADD-06 | **Oversell guard:** sell qty > held → 400 `insufficient_shares` | Error-guessing | P1 | ➕ |
| TC-ADD-07 | Happy path: add holding → appears in holdings + dashboard updates | Use-case | P1 | ➕ |

**`/app/portfolios`** — Risk P1. 
| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-PF-01 | Create name boundary: "" rejected, 1 char ok, 80 ok, 81 rejected | **BVA** | P1 | ➕ |
| TC-PF-02 | Rename inline: Enter saves, Esc cancels, unchanged = no-op | State transition | P2 | ➕ |
| TC-PF-03 | Switch active → cookie set; data reflects new portfolio | State transition | P1 | ➕ |
| TC-PF-04 | **Delete last portfolio → 409 `last_portfolio`** ("need at least one") | Error-guessing | P1 | ➕ |
| TC-PF-05 | Delete non-last → cascades holdings; confirm dialog required | Use-case | P2 | ➕ |

**`/app/account` (security)** — Risk P1. 
| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-ACC-01 | Password new boundary: 7 rejected, 8 ok, 72 ok, 73 rejected | **BVA** | P1 | ➕ |
| TC-ACC-02 | Confirm-password mismatch blocked client-side | Decision table | P1 | ➕ |
| TC-ACC-03 | Wrong current password → 403 `wrong_password` | Decision table | P1 | ➕ |
| TC-ACC-04 | `same_password` / `same_email` → 400 | EP (invalid) | P2 | ➕ |
| TC-ACC-05 | Email change requires current password; sends confirm link | Use-case | P2 | ➕ |
| TC-ACC-06 | Delete account: needs password + confirm; cascades; → `/` | State transition | P1 | ✋ (destructive — dedicated disposable user) |

**`/app/profile`** — Risk P2 (regex fields). 
| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-PRO-01 | Phone regex `^[+\d][\d\s()./-]{3,}$`: valid vs "abc" | EP | P2 | ➕ |
| TC-PRO-02 | Country ISO-2 `[A-Z]{2}` only | EP | P2 | ➕ |
| TC-PRO-03 | Birth date ≤ today; future rejected | BVA | P2 | ➕ |
| TC-PRO-04 | Name/postal length caps (60/20); empty string → null saved | BVA | P3 | ➕ |

**`/app/settings`** — Risk P2. 
| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-SET-01 | Income target: ≤0 rejected, 1 ok, 10,000,000 ok, >max rejected | **BVA** | P2 | ➕ |
| TC-SET-02 | Contrast/bg-tone change applies instantly + persists (optimistic + cookie) | State transition | P3 | ➕ |
| TC-SET-03 | Default landing screen list filtered to tier-accessible only | Decision table | P2 | ➕ |

**`/app/messages`** — Risk P2. 
| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-MSG-01 | New thread subject 1–140 & body 1–5000 boundaries | **BVA** | P2 | ➕ |
| TC-MSG-02 | Empty body/subject blocked | EP | P2 | ➕ |
| TC-MSG-03 | Reply to foreign thread → 404 `thread_not_found` | Error-guessing/security | P2 | ➕ |
| TC-MSG-04 | User cannot post as `sender=support` | Security | P1 | ✋ |
| TC-MSG-05 | Filters all/open/closed + date range | EP | P3 | ➕ |

### 7.4 Free-tier & utility

| ID | Title | Technique | Pri | Auto |
|----|-------|-----------|-----|------|
| TC-FREE-01 | `/app/home,next,stocks,year` render for free user with empty + populated portfolio | EP (2 states) | P2 | ✅ (smoke) |
| TC-FREE-02 | Each free screen empty state has CTA to `/app/add` or `/upgrade` | Usability | P3 | ➕ |
| TC-FREE-03 | `/app/stocks` per-stock edit/delete → `/api/holdings/[ticker]` | Use-case | P2 | ➕ |
| TC-RED-01 | `/app/calendar` → `/app/dividends?tab=year`; `/app/forecast` → `?tab=forecast` | EP | P3 | ➕ |
| TC-RED-02 | Free user following those redirects then hits dividends gate (→ `/upgrade`) | Decision table | P2 | ➕ |

### 7.5 Acceptance scenarios (use-case, cross-page) — P1
- **SC-01 New user:** signup → confirm → add 3 holdings → dashboard shows positive value & rhythm chart.
- **SC-02 Upgrade:** free hits gated screen → `/upgrade` → checkout redirect (test mode) → returns elite → gated screens now render.
- **SC-03 Portfolio lifecycle:** create → add holdings → switch → rename → delete (blocked when last).
- **SC-04 Tax run (elite):** populated portfolio → `/app/tax` shows residence + withholding + CGT → export downloads.

---

## 8. Traceability & coverage summary

| Risk | Covered by | Automated now |
|------|-----------|---------------|
| R1 Auth | TC-AUTH-01..06, SC-01 | partial (smoke) |
| R2 Tier-gating | TC-TIER-01..06, TC-RED-02, SC-02 | ❌ → **add** |
| R3 Figures | TC-DASH/PERF/DIV/TAX consistency + BVA | partial (data tests) |
| R4 Mutations | TC-ADD/PF/CAP, SC-03 | ❌ → **add** |
| R5 Runtime | §6.4 smoke + console/5xx invariant | ✅ |
| R6 Validation | all BVA/EP rows (Appendix A) | ❌ → **add** |
| R7 Charts | TC-VIS-01..03 + structural | structural ✅ / visual ➕ |
| R8 States | empty-state rows | partial |
| R9 Copy | TC-LAND-03 | ✋ |

**Gap → priority for the next automation increment:** (1) tier-gating decision table (R2), (2) add-holding + portfolio mutation BVA/flows (R4/R6), (3) tax/withholding decision tables (R3), (4) chart geometry sanity (R7).

## 9. Deliverables, roles, defects, schedule
- **Deliverables:** this plan; automated suite (`tests/e2e/`); per-run `report.html` + Allure + Pages URL + inline summary.
- **Roles:** QA authors/maintains the suite & plan; Dev fixes defects + owns unit/integration; PR author ensures the gate is green.
- **Defect mgmt:** log with severity (S1 blocker→S4 trivial) × the priority above; S1/S2 block merge.
- **Schedule:** suite runs on every PR into `develop`/`main` (required `e2e` check) and on demand via `workflow_dispatch`.

---

## Appendix A — Validation data dictionary (BVA reference)

| Field / rule | Valid | Invalid (boundary) | Source |
|--------------|-------|--------------------|--------|
| Holding quantity | > 0 (e.g. 0.0001) | 0, negative, non-numeric | `api/holdings` zod `.positive()` |
| Holding price / fee | ≥ 0 | < 0 | `.nonnegative()` |
| Holding/txn date | ≤ today, `YYYY-MM-DD` | future, bad format | regex + `max=today` |
| Ticker | 1–16 chars (upper) | 0 or 17 chars | zod |
| Currency | exactly 3 chars | ≠3 | zod |
| Lots | ≥ 1 | 0 | zod |
| Oversell | sell ≤ held | sell > held | 400 `insufficient_shares` |
| Portfolio name | 1–80 | "", 81 | zod min1/max80 |
| Delete portfolio | ≥1 remains | last one | 409 `last_portfolio` |
| Holdings cap | free 10 / prem 100 / elite ∞ | +1 over cap | 402 `holding_cap_reached` |
| Portfolio cap | free 1 / prem 3 / elite ∞ | +1 over cap | 402 `portfolio_cap_reached` |
| Password (new) | 8–72 | 7, 73 | zod min8/max72 |
| Signup password | ≥ 8 | 7 (**no confirm field — risk**) | `minLength=8` |
| Income target | 1–10,000,000 | ≤0, >max | zod coerce positive |
| Message subject / body | 1–140 / 1–5000 | "", 141 / 5001 | zod |
| Tax `?year=` | 2000 … currentYear+1 | 1999, +2 (→ default) | page guard |
| Export `?year=` | 1900–2999 | 1899, 3000 (→ 400) | export route |
| Phone | `^[+\d][\d\s()./-]{3,}$` | "abc", too short | profile zod |
| Country | ISO-2 `[A-Z]{2}` | lowercase, 3 chars | profile zod |
| Withholding by country | US/CA/NL .15, DE .26375, FR .128, CH .35, GB 0, ES .19, default .15 | — (decision table) | dividends logic |

> **Note (already-suspected defects to verify):** signup lacks a confirm-password field (R6); landing/pricing copy disagrees with `tiers.ts` on price & position count (R9); several `/app/*` pages gate via nav only, not an in-page redirect — direct-URL access by an under-tier user must be explicitly tested (R2, TC-TIER-01).

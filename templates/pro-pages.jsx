// Pro tier mobile pages — Holdings, Dividends, Performance, Diversification.
// All four use the V2 Breathing chassis (.mob.v2b) and obey the typographic
// hierarchy locked in earlier: title 14/600, side-tag 11/500 dim, captions
// 10/400 dim, body values 13–17 (never equal to title size).

const { useState: useStateProP } = React;
const D = window.Cadence;

// ── Shared injected styles for the Pro pages ─────────────────────────
const PRO_PAGE_STYLE = `
/* Compact hero variant used across Pro pages (Holdings / Dividends / Perf / Div). */
.mob.v2b .pro-hero-mob {
  text-align: center;
  padding: 28px var(--pad) 18px;
}
.mob.v2b[data-density="compact"] .pro-hero-mob { padding: 20px var(--pad) 14px; }
.mob.v2b[data-density="comfy"]   .pro-hero-mob { padding: 36px var(--pad) 24px; }
.mob.v2b .pro-hero-mob .eyebrow {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 12px;
}
.mob.v2b .pro-hero-mob h1 {
  margin: 0;
  font-size: 52px;
  line-height: 0.95;
  letter-spacing: -0.035em;
  font-weight: 600;
}
.mob.v2b[data-density="compact"] .pro-hero-mob h1 { font-size: 44px; }
.mob.v2b[data-density="comfy"]   .pro-hero-mob h1 { font-size: 60px; }
.mob.v2b .pro-hero-mob h1 .light { font-weight: 300; color: var(--text-dim); }
.mob.v2b .pro-hero-mob h1 .cur { font-size: 0.55em; font-weight: 400; color: var(--text-dim); vertical-align: top; line-height: 1.4; margin-right: 4px; }
.mob.v2b .pro-hero-mob .sub {
  margin-top: 14px;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.45;
}
.mob.v2b .pro-hero-mob .sub b { color: var(--text); font-weight: 600; }
.mob.v2b .pro-hero-mob .delta-pill {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 16px;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--up-bg);
  color: var(--up-fg);
  font-weight: 600;
  font-size: 13px;
}
.mob.v2b .pro-hero-mob .delta-pill.down { background: oklch(0.94 0.04 25); color: var(--down); }

/* Segmented control (used by Dividends / Diversification tabs) */
.mob.v2b .segtop-pro {
  display: flex;
  margin: 8px var(--pad) 0;
  padding: 3px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow-x: auto;
  scrollbar-width: none;
  gap: 2px;
}
.mob.v2b .segtop-pro::-webkit-scrollbar { display: none; }
.mob.v2b .segtop-pro .seg {
  flex: 1; min-width: 0;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  text-align: center;
  transition: color 160ms ease, background 160ms ease;
}
.mob.v2b .segtop-pro .seg.is-active {
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04);
}

/* List row: shared pattern for holdings / upcoming / winners */
.mob.v2b .lr {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 0;
}
.mob.v2b .lr + .lr { border-top: 1px solid var(--border); }
.mob.v2b .lr .logo {
  width: 34px; height: 34px;
  border-radius: 9px;
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px; color: rgba(0,0,0,0.85);
  flex-shrink: 0;
}
.mob.v2b .lr .body { flex: 1; min-width: 0; }
.mob.v2b .lr .body .tk { font-size: 13px; font-weight: 600; letter-spacing: -0.01em; }
.mob.v2b .lr .body .nm { font-size: 11px; color: var(--text-dim); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mob.v2b .lr .right { text-align: right; }
.mob.v2b .lr .right .v {
  font-size: 15px; font-weight: 600; letter-spacing: -0.01em;
}
.mob.v2b .lr .right .s {
  font-size: 10px; color: var(--text-dim); margin-top: 1px;
}
.mob.v2b .lr .right .s.up { color: var(--up-fg); font-weight: 600; }
.mob.v2b .lr .right .s.down { color: var(--down); font-weight: 600; }

/* Date bubble for dividend events */
.mob.v2b .cal {
  width: 42px; flex-shrink: 0; text-align: center;
}
.mob.v2b .cal .d { font-size: 19px; font-weight: 600; letter-spacing: -0.02em; line-height: 1; }
.mob.v2b .cal .m { font-size: 9px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin-top: 3px; }

/* Filter chip + FAB */
.mob.v2b .chips {
  display: flex; gap: 6px;
  padding: 8px var(--pad) 4px;
  overflow-x: auto;
  scrollbar-width: none;
}
.mob.v2b .chips::-webkit-scrollbar { display: none; }
.mob.v2b .chips .chip {
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--surface-2);
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
}
.mob.v2b .chips .chip.is-active { background: var(--text); color: var(--surface); }

.mob.v2b .fab {
  position: absolute; right: 18px; bottom: 78px;
  width: 52px; height: 52px;
  border-radius: 50%;
  background: var(--text); color: var(--surface);
  border: 0; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 20px rgba(0,0,0,0.25);
  z-index: 5;
}

/* Donut visualization */
.mob.v2b .donut-wrap {
  display: flex; align-items: center; gap: 16px;
  margin: 4px 0 6px;
}
.mob.v2b .donut-wrap .donut-meta .v {
  font-size: 22px; font-weight: 600; letter-spacing: -0.02em;
}
.mob.v2b .donut-wrap .donut-meta .l {
  font-size: 11px; color: var(--text-dim); margin-top: 2px;
}

.mob.v2b .legend-row {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 0;
}
.mob.v2b .legend-row + .legend-row { border-top: 1px solid var(--border); }
.mob.v2b .legend-row .swatch { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.mob.v2b .legend-row .name { flex: 1; font-size: 12px; font-weight: 500; color: var(--text); }
.mob.v2b .legend-row .val { font-size: 13px; font-weight: 600; }
.mob.v2b .legend-row .pct { font-size: 10px; color: var(--text-dim); margin-left: 6px; }

/* Concentration check */
.mob.v2b .conc-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.mob.v2b .conc-row + .conc-row { border-top: 1px solid var(--border); }
.mob.v2b .conc-row .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.mob.v2b .conc-row .dot.ok { background: var(--up); }
.mob.v2b .conc-row .dot.warn { background: oklch(0.74 0.13 70); }
.mob.v2b .conc-row .dot.danger { background: var(--down); }
.mob.v2b .conc-row .body { flex: 1; min-width: 0; }
.mob.v2b .conc-row .body .label { font-size: 12px; font-weight: 500; }
.mob.v2b .conc-row .body .note { font-size: 10px; color: var(--text-dim); margin-top: 2px; }
.mob.v2b .conc-row .v {
  font-size: 13px; font-weight: 600; text-align: right;
}

/* Perf table */
.mob.v2b .ptable {
  width: 100%; border-collapse: collapse;
  font-family: var(--font-sans);
}
.mob.v2b .ptable thead th {
  font-size: 9.5px; color: var(--text-dim); font-weight: 600;
  letter-spacing: 0.04em; text-transform: uppercase;
  text-align: left; padding: 6px 8px 8px;
  border-bottom: 1px solid var(--border);
}
.mob.v2b .ptable thead th.r { text-align: right; }
.mob.v2b .ptable tbody td {
  font-size: 12px; padding: 8px;
  border-bottom: 1px solid var(--border);
}
.mob.v2b .ptable tbody tr:last-child td { border-bottom: 0; }
.mob.v2b .ptable td.r { text-align: right; }
.mob.v2b .ptable td.b { font-weight: 600; }
.mob.v2b .ptable td.up { color: var(--up-fg); }
.mob.v2b .ptable td.down { color: var(--down); }
.mob.v2b .ptable td.lbl { color: var(--text-dim); font-size: 11.5px; }
`;

function injectProPageStyle() {
  if (document.getElementById('pro-page-style')) return;
  const s = document.createElement('style');
  s.id = 'pro-page-style';
  s.textContent = PRO_PAGE_STYLE;
  document.head.appendChild(s);
}
// Eager-inject so .pro-hero-mob / .stat-paired / .lr / .legend-row / etc.
// styles are available to every tier (Free/Elite/Account/AddEdit/Public),
// not just the pages that render ProShell.
injectProPageStyle();
window.injectProPageStyle = injectProPageStyle;

const fmtN = (n, d = 0) => window.fmt(n, d);
const fmtPct = (n, d = 2) => (n >= 0 ? '+' : '') + n.toFixed(d) + '%';

// ── Shared page shell ───────────────────────────────────────────────
function ProShell({ activeTab, density, navPattern, children, hideStatusbar = false, onNavigate }) {
  injectProPageStyle();
  const [drawer, setDrawer] = useStateProP(false);
  const handleTabClick = (tabId) => {
    if (tabId === 'more') { setDrawer(true); return; }
    if (onNavigate) onNavigate(tabId);
    window.dispatchEvent(new CustomEvent('cadenceNavigate', { detail: tabId }));
  };
  return (
    <div className="mob v2b" data-density={density}>
      <window.TopBar onMenu={() => setDrawer(true)} dense />
      <div className="scroll">{children}</div>
      {navPattern === 'segmented'
        ? <window.SegBottomPlaceholder />
        : <ProTabBar active={activeTab} onPick={handleTabClick} />
      }
      <window.Drawer open={drawer} onClose={() => setDrawer(false)} active={activeTab} />
    </div>
  );
}

// Bottom tab bar — same look as window.TabBar but with onPick wired.
function ProTabBar({ active, onPick }) {
  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'holdings',  label: 'Holdings',  icon: 'holdings' },
    { id: 'dividends', label: 'Dividends', icon: 'dividends' },
    { id: 'perf',      label: 'Perf',      icon: 'perf' },
    { id: 'more',      label: 'More',      icon: 'more' },
  ];
  return (
    <div className="tabbar">
      {TABS.map((t) => (
        <div
          key={t.id}
          className={'tab' + (active === t.id ? ' is-active' : '')}
          onClick={() => onPick?.(t.id)}
        >
          <span className="ico"><window.Icon name={t.icon} size={22} /></span>
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

// Centered colored ticker logo helper
function Logo({ ticker, color, size = 34 }) {
  return (
    <div className="logo" style={{
      background: color, width: size, height: size,
      borderRadius: size * 0.27,
      fontSize: size * 0.42,
    }}>
      {ticker.slice(0, 1)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Holdings page
// ─────────────────────────────────────────────────────────────────────
function HoldingsPage({ density, navPattern }) {
  const [filter, setFilter] = useStateProP('all');
  const totalValue = D.holdings.reduce((s, h) => s + h.price * h.qty * (h.currency === 'EUR' ? 1 : h.currency === 'USD' ? 0.92 : h.currency === 'CAD' ? 0.68 : h.currency === 'GBP' ? 1.18 : 0.92), 0);
  const cadenceTxt = [];
  if (D.cadenceCounts.monthly)   cadenceTxt.push(`${D.cadenceCounts.monthly} monthly`);
  if (D.cadenceCounts.quarterly) cadenceTxt.push(`${D.cadenceCounts.quarterly} quarterly`);
  if (D.cadenceCounts.annual)    cadenceTxt.push(`${D.cadenceCounts.annual} annual`);

  const filtered = D.holdings.filter((h) => {
    if (filter === 'all') return true;
    if (filter === 'monthly') return h.payoutFreq === 12;
    if (filter === 'quarterly') return h.payoutFreq === 4;
    if (filter === 'annual') return h.payoutFreq === 1;
    if (filter === 'usd') return h.currency === 'USD';
    if (filter === 'eur') return h.currency === 'EUR';
    return true;
  });

  return (
    <ProShell activeTab="holdings" density={density} navPattern={navPattern}>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 }}>
        <div className="eyebrow">Your positions</div>
        <h1>{D.holdings.length} stocks <span className="light">paying you</span></h1>
        <div className="sub">
          <b>€{fmtN(Math.round(totalValue))}</b> across <b>{D.countriesList.length} countries</b> · {cadenceTxt.join(', ')} payers
        </div>
      </div>

      {/* Paired stat: portfolio + cadence */}
      <div className="stat-paired cdn-anim" style={{ '--i': 1 }}>
        <div className="pcard-mini">
          <div className="ph">Portfolio</div>
          <div className="paired-vals">
            <span className="num a">€{fmtN(Math.round(totalValue / 1000))}k</span>
            <span className="sep">·</span>
            <span className="num b">{D.countriesList.length}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: '70%' }} />
            <div className="b" style={{ width: '30%' }} />
          </div>
          <div className="paired-foot">
            <span>Total value</span>
            <span>Countries</span>
          </div>
        </div>
        <div className="pcard-mini">
          <div className="ph">Cadence</div>
          <div className="stacked-rows">
            <div className="srow"><span className="name">Monthly</span><span className="val">{D.cadenceCounts.monthly}</span></div>
            <div className="srow"><span className="name">Quarterly</span><span className="val">{D.cadenceCounts.quarterly}</span></div>
            <div className="srow"><span className="name">Annual</span><span className="val">{D.cadenceCounts.annual}</span></div>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="chips">
        {[
          { id: 'all', label: 'All' },
          { id: 'monthly', label: 'Monthly' },
          { id: 'quarterly', label: 'Quarterly' },
          { id: 'annual', label: 'Annual' },
          { id: 'usd', label: 'USD' },
          { id: 'eur', label: 'EUR' },
        ].map((c) => (
          <div key={c.id} className={'chip' + (filter === c.id ? ' is-active' : '')} onClick={() => setFilter(c.id)}>{c.label}</div>
        ))}
      </div>

      {/* Holdings list */}
      <div className="pcard cdn-anim" style={{ '--i': 2 }}>
        <div className="pcard-h">
          <div className="t">Holdings</div>
          <span className="more">{filtered.length} of {D.holdings.length}</span>
        </div>
        <div>
          {filtered.map((h) => {
            const value = h.price * h.qty;
            const isUp = h.changePct >= 0;
            return (
              <div className="lr" key={h.ticker}>
                <Logo ticker={h.ticker} color={h.color} />
                <div className="body">
                  <div className="tk">{h.ticker} <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 11 }}>· {h.name}</span></div>
                  <div className="nm">{h.qty} sh · {h.currency === 'EUR' ? '€' : h.currency === 'GBP' ? '£' : h.currency === 'USD' ? '$' : 'C$'}{h.price.toFixed(2)} · {h.fwdYieldPct.toFixed(2)}% yld</div>
                </div>
                <div className="right">
                  <div className="v">{h.currency === 'EUR' ? '€' : h.currency === 'GBP' ? '£' : h.currency === 'USD' ? '$' : 'C$'}{fmtN(Math.round(value))}</div>
                  <div className={'s ' + (isUp ? 'up' : 'down')}>{isUp ? '+' : ''}{h.changePct.toFixed(2)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ height: 80 }} />

      <button className="fab" aria-label="Add holding"><window.Icon name="plus" size={22} /></button>
    </ProShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Dividends page
// ─────────────────────────────────────────────────────────────────────
function DividendsPage({ density, navPattern }) {
  const [tab, setTab] = useStateProP('upcoming');

  return (
    <ProShell activeTab="dividends" density={density} navPattern={navPattern}>
      <div className="segtop-pro cdn-anim" style={{ '--i': 0 }}>
        {[
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'forecast', label: 'Forecast' },
          { id: 'year',     label: 'Year' },
        ].map((t) => (
          <div key={t.id} className={'seg' + (tab === t.id ? ' is-active' : '')} onClick={() => setTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {tab === 'upcoming' && <DividendsUpcoming />}
      {tab === 'forecast' && <DividendsForecast />}
      {tab === 'year'     && <DividendsYear />}
    </ProShell>
  );
}

function DividendsUpcoming() {
  const events = D.upcomingExtended;
  const totalGross = events.reduce((s, e) => s + e.gross, 0);
  const totalNet = events.reduce((s, e) => s + e.gross * (1 - e.withholdPct / 100), 0);
  const thisWeek = events.filter((e) => e.daysUntil <= 7).length;

  return (
    <>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 1 }}>
        <div className="eyebrow">Upcoming · next 40 days</div>
        <h1><span className="cur">€</span>{fmtN(totalGross, 0)} <span className="light">expected</span></h1>
        <div className="sub">
          <b>{events.length} payments</b> · <b>{thisWeek}</b> within 7 days
        </div>
      </div>

      <div className="stat-paired cdn-anim" style={{ '--i': 2 }}>
        <div className="pcard-mini">
          <div className="ph">Gross vs net</div>
          <div className="paired-vals">
            <span className="num a">€{fmtN(Math.round(totalGross))}</span>
            <span className="sep">:</span>
            <span className="num b">€{fmtN(Math.round(totalNet))}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: '15%' }} />
            <div className="b" style={{ width: '85%' }} />
          </div>
          <div className="paired-foot">
            <span>Withheld</span>
            <span>Net to you</span>
          </div>
        </div>
        <div className="pcard-mini">
          <div className="ph">Avg withholding</div>
          <div className="stacked-rows">
            <div className="srow"><span className="name">Effective rate</span><span className="val">15%</span></div>
            <div className="srow"><span className="name">US holdings</span><span className="val">15%</span></div>
            <div className="srow"><span className="name">EU avg</span><span className="val">19%</span></div>
          </div>
        </div>
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 3 }}>
        <div className="pcard-h">
          <div className="t">Next {events.length} payments</div>
          <span className="more">€{fmtN(totalGross)} gross</span>
        </div>
        <div>
          {events.map((e) => {
            const d = new Date(e.exDate);
            const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const color = D.holdings.find((h) => h.ticker === e.ticker)?.color ?? '#94a3b8';
            const net = e.gross * (1 - e.withholdPct / 100);
            return (
              <div className="lr" key={e.ticker + e.exDate}>
                <div className="cal">
                  <div className="d">{String(d.getDate()).padStart(2, '0')}</div>
                  <div className="m">{M[d.getMonth()]}</div>
                </div>
                <Logo ticker={e.ticker} color={color} size={30} />
                <div className="body">
                  <div className="tk">{e.ticker}</div>
                  <div className="nm">in {e.daysUntil}d{e.isProjected ? ' · est' : ''} · {e.withholdPct}% WH</div>
                </div>
                <div className="right">
                  <div className="v">€{fmtN(net, 2)}</div>
                  <div className="s">€{fmtN(e.gross, 2)} gross</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ height: 80 }} />
    </>
  );
}

function DividendsForecast() {
  const f = D.forecast;
  return (
    <>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 1 }}>
        <div className="eyebrow">12-month forecast · Jun → May</div>
        <h1><span className="cur">€</span>{fmtN(f.next12M)} <span className="light">expected</span></h1>
        <div className="sub">
          avg <b>€{fmtN(Math.round(f.next12M / 12))}/mo</b> · based on declared schedules
        </div>
      </div>

      <div className="stat-paired cdn-anim" style={{ '--i': 2 }}>
        <div className="pcard-mini">
          <div className="ph">Gross vs net</div>
          <div className="paired-vals">
            <span className="num a">€{fmtN(Math.round(f.next12M))}</span>
            <span className="sep">:</span>
            <span className="num b">€{fmtN(Math.round(f.next12MNet))}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: '22%' }} />
            <div className="b" style={{ width: '78%' }} />
          </div>
          <div className="paired-foot">
            <span>Tax · {f.taxLabel}</span>
            <span>Net</span>
          </div>
        </div>
        <div className="pcard-mini">
          <div className="ph">Year totals</div>
          <div className="stacked-rows">
            <div className="srow"><span className="name">This month</span><span className="val">€{fmtN(f.thisMonth)}</span></div>
            <div className="srow"><span className="name">This quarter</span><span className="val">€{fmtN(f.thisQuarter)}</span></div>
            <div className="srow"><span className="name">2026 total</span><span className="val">€{fmtN(f.thisYearTotal)}</span></div>
          </div>
        </div>
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 3 }}>
        <div className="pcard-h">
          <div className="t">Forward monthly income</div>
          <span className="more">12M + 6M</span>
        </div>
        <window.RhythmChart height={120} />
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 4 }}>
        <div className="pcard-h">
          <div className="t">If every holding raises 5%</div>
          <span className="more">growth scenario</span>
        </div>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--up-fg)' }}>
          +€{fmtN(Math.round(f.fivePctGrowth))}/yr
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.45 }}>
          At <b style={{ color: 'var(--text)' }}>7.8%</b> historical dividend growth,
          income hits <b style={{ color: 'var(--text)' }}>€{fmtN(Math.round(f.in5y))}</b> in 5 years and
          <b style={{ color: 'var(--text)' }}> €{fmtN(Math.round(f.in10y))}</b> in 10.
        </div>
      </div>
      <div style={{ height: 80 }} />
    </>
  );
}

function DividendsYear() {
  const yearTotal = D.rhythm.slice(0, 12).reduce((s, m) => s + m.received, 0);
  return (
    <>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 1 }}>
        <div className="eyebrow">Year view · 2026</div>
        <h1><span className="cur">€</span>{fmtN(yearTotal)} <span className="light">YTD</span></h1>
        <div className="sub">
          <b>{D.holdings.length}</b> stocks paid in {D.rhythm.filter((m) => m.received > 0).length} months
        </div>
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 2 }}>
        <div className="pcard-h">
          <div className="t">Monthly income</div>
          <span className="more">2026</span>
        </div>
        <window.RhythmChart months={D.rhythm.slice(0, 12)} nowIndex={D.nowIndex} height={140} />
      </div>

      {/* Heatmap-style monthly grid */}
      <div className="pcard cdn-anim" style={{ '--i': 3 }}>
        <div className="pcard-h">
          <div className="t">Heatmap · ex-div by day</div>
          <span className="more">heaviest: Mar</span>
        </div>
        <YearHeatmap />
      </div>
      <div style={{ height: 80 }} />
    </>
  );
}

function YearHeatmap() {
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Generate a deterministic intensity grid (12 rows × ~30 days)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {M.map((m, mi) => {
        const days = mi === 1 ? 28 : (mi === 3 || mi === 5 || mi === 8 || mi === 10) ? 30 : 31;
        return (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 24, fontSize: 9.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{m}</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(31, 1fr)`, gap: 2, flex: 1 }}>
              {Array.from({ length: days }).map((_, di) => {
                // Sprinkle dividends in a recognizable pattern
                const k = (mi * 31 + di) % 7;
                const hot = (di + mi) % 12 === 0 || k === 3 && mi % 2 === 0;
                const med = k === 5 || k === 1 && mi % 3 === 0;
                const f = hot ? 0.95 : med ? 0.55 : 0.0;
                return (
                  <div key={di} style={{
                    height: 8,
                    borderRadius: 1.5,
                    background: f > 0 ? `color-mix(in oklab, var(--accent-soft) ${f * 100}%, rgba(0,0,0,0.04))` : 'rgba(0,0,0,0.04)',
                  }} />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Performance page
// ─────────────────────────────────────────────────────────────────────
function PerformancePage({ density, navPattern }) {
  const totalRet = 30.27;
  const ytdRet = 12.40;
  const oneY = 18.62;
  const alphaVsSpx = totalRet - 22.05;

  return (
    <ProShell activeTab="perf" density={density} navPattern={navPattern}>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 }}>
        <div className="eyebrow">Performance · 730 days tracked</div>
        <h1 style={{ color: 'var(--up-fg)' }}>+{totalRet.toFixed(2)}%</h1>
        <div className="sub">
          <b style={{ color: 'var(--up-fg)' }}>+{alphaVsSpx.toFixed(1)}pp</b> ahead of S&P 500 · YTD <b>{fmtPct(ytdRet)}</b>
        </div>
        <div className="delta-pill">▲ €{fmtN(D.summary.unrealizedPL)} unrealized</div>
      </div>

      <div className="stat-paired cdn-anim" style={{ '--i': 1 }}>
        <div className="pcard-mini">
          <div className="ph">YTD vs S&P 500</div>
          <div className="paired-vals">
            <span className="num a">+12.40%</span>
            <span className="sep">:</span>
            <span className="num b">+9.80%</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: '56%' }} />
            <div className="b" style={{ width: '44%' }} />
          </div>
          <div className="paired-foot">
            <span>Yours</span>
            <span>S&P 500</span>
          </div>
        </div>
        <div className="pcard-mini">
          <div className="ph">Risk · 1y</div>
          <div className="stacked-rows">
            <div className="srow"><span className="name">Sharpe</span><span className="val">{D.risk.sharpe.toFixed(2)}</span></div>
            <div className="srow"><span className="name">Sortino</span><span className="val">{D.risk.sortino.toFixed(2)}</span></div>
            <div className="srow"><span className="name">Max DD</span><span className="val" style={{ color: 'var(--down)' }}>{D.risk.maxDD.toFixed(1)}%</span></div>
          </div>
        </div>
      </div>

      {/* Cumulative return chart */}
      <div className="pcard cdn-anim" style={{ '--i': 2 }}>
        <div className="pcard-h">
          <div className="t">Cumulative return</div>
          <span className="more">2Y · weekly</span>
        </div>
        <PerfLineChart />
      </div>

      {/* Period returns table */}
      <div className="pcard cdn-anim" style={{ '--i': 3 }}>
        <div className="pcard-h">
          <div className="t">Period returns</div>
          <span className="more">vs S&P 500</span>
        </div>
        <table className="ptable">
          <thead>
            <tr><th>Period</th><th className="r">Yours</th><th className="r">S&P</th><th className="r">α</th></tr>
          </thead>
          <tbody>
            {D.periodReturns.map((p) => {
              const a = p.port - p.spx;
              return (
                <tr key={p.label}>
                  <td className="b">{p.label}</td>
                  <td className={'r b ' + (p.port >= 0 ? 'up' : 'down')}>{fmtPct(p.port)}</td>
                  <td className={'r ' + (p.spx >= 0 ? 'up' : 'down')}>{fmtPct(p.spx)}</td>
                  <td className={'r b ' + (a >= 0 ? 'up' : 'down')}>{(a >= 0 ? '+' : '') + a.toFixed(2)}pp</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Top winners */}
      <div className="pcard cdn-anim" style={{ '--i': 4 }}>
        <div className="pcard-h">
          <div className="t">Top winners</div>
          <span className="more">by € P/L</span>
        </div>
        <div>
          {D.winners.map((w) => (
            <div className="lr" key={w.ticker}>
              <Logo ticker={w.ticker} color={w.color} size={30} />
              <div className="body">
                <div className="tk">{w.ticker}</div>
                <div className="nm">{w.name}</div>
              </div>
              <div className="right">
                <div className="v" style={{ color: 'var(--up-fg)' }}>+€{fmtN(Math.abs(w.pl))}</div>
                <div className="s up">{fmtPct(w.plPct, 1)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk & ratios */}
      <div className="pcard cdn-anim" style={{ '--i': 5 }}>
        <div className="pcard-h">
          <div className="t">Risk &amp; ratios</div>
          <span className="more">rolling 1y</span>
        </div>
        <table className="ptable">
          <tbody>
            <tr><td className="lbl">Volatility (σ)</td><td className="r b">{D.risk.volPct.toFixed(1)}%</td><td className="lbl">annualised</td></tr>
            <tr><td className="lbl">Sharpe</td><td className="r b up">{D.risk.sharpe.toFixed(2)}</td><td className="lbl">rf 4.5%</td></tr>
            <tr><td className="lbl">Sortino</td><td className="r b up">{D.risk.sortino.toFixed(2)}</td><td className="lbl">downside σ</td></tr>
            <tr><td className="lbl">Beta vs S&P</td><td className="r b">{D.risk.beta.toFixed(2)}</td><td className="lbl">market-like</td></tr>
            <tr><td className="lbl">Alpha (Jensen)</td><td className="r b up">+{D.risk.alpha.toFixed(2)}%</td><td className="lbl">annualised</td></tr>
            <tr><td className="lbl">Max DD</td><td className="r b down">{D.risk.maxDD.toFixed(1)}%</td><td className="lbl">recovered {D.risk.maxDDRecovered}</td></tr>
            <tr><td className="lbl">Win rate</td><td className="r b">{D.risk.winRate}%</td><td className="lbl">{D.risk.winMonths}/{D.risk.totalMonths} mo</td></tr>
          </tbody>
        </table>
      </div>

      {/* Detractors */}
      <div className="pcard cdn-anim" style={{ '--i': 6 }}>
        <div className="pcard-h">
          <div className="t">Detractors</div>
          <span className="more">P/L &lt; 0</span>
        </div>
        {D.losers.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '10px 0' }}>No losing positions.</div>
        ) : (
          <div>
            {D.losers.map((w) => (
              <div className="lr" key={w.ticker}>
                <Logo ticker={w.ticker} color={w.color} size={30} />
                <div className="body">
                  <div className="tk">{w.ticker}</div>
                  <div className="nm">{w.name}</div>
                </div>
                <div className="right">
                  <div className="v" style={{ color: 'var(--down)' }}>−€{fmtN(Math.abs(w.pl))}</div>
                  <div className="s down">{fmtPct(w.plPct, 1)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ height: 80 }} />
    </ProShell>
  );
}

function PerfLineChart() {
  const port = D.perfSeries;
  const bench = D.benchSeries;
  const all = [...port, ...bench];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const w = 340; const h = 130;
  const stepX = w / (port.length - 1);
  const sy = (v) => h - 4 - ((v - min) / (max - min)) * (h - 8);
  const portPath = port.map((v, i) => `${i ? 'L' : 'M'}${(i * stepX).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  const benchPath = bench.map((v, i) => `${i ? 'L' : 'M'}${(i * stepX).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  return (
    <div style={{ width: '100%', paddingTop: 4 }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        <defs>
          <linearGradient id="fillPort" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--up-fg)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--up-fg)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Zero line */}
        <line x1="0" x2={w} y1={sy(0)} y2={sy(0)} stroke="rgba(0,0,0,0.08)" strokeDasharray="2 3" />
        {/* Portfolio area */}
        <path d={`${portPath} L${w},${h} L0,${h} Z`} fill="url(#fillPort)" />
        {/* Benchmark line */}
        <path d={benchPath} fill="none" stroke="var(--text-dim)" strokeWidth="1.4" strokeDasharray="3 2" />
        {/* Portfolio line */}
        <path d={portPath} fill="none" stroke="var(--up-fg)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 10.5, color: 'var(--text-dim)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 2, background: 'var(--up-fg)' }} /> Yours +30.27%
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 2, background: 'var(--text-dim)', borderTop: '1px dashed' }} /> S&amp;P 500 +22.05%
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Diversification page
// ─────────────────────────────────────────────────────────────────────
function DiversificationPage({ density, navPattern }) {
  const [view, setView] = useStateProP('sector');
  const data = view === 'sector' ? D.sectors : view === 'country' ? D.countries : D.currencies;
  const totalValue = 184732;

  return (
    <ProShell activeTab="more" density={density} navPattern={navPattern}>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 }}>
        <div className="eyebrow">Diversification</div>
        <h1>{D.holdings.length} positions <span className="light">across</span></h1>
        <div className="sub">
          <b>{D.sectors.length} sectors</b> · <b>{D.countries.length} countries</b> · <b>{D.currencies.length} currencies</b>
        </div>
      </div>

      <div className="segtop-pro cdn-anim" style={{ '--i': 1 }}>
        {[
          { id: 'sector',   label: 'Sector' },
          { id: 'country',  label: 'Country' },
          { id: 'currency', label: 'Currency' },
        ].map((t) => (
          <div key={t.id} className={'seg' + (view === t.id ? ' is-active' : '')} onClick={() => setView(t.id)}>{t.label}</div>
        ))}
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 2 }}>
        <div className="pcard-h">
          <div className="t">Breakdown</div>
          <span className="more">€{fmtN(totalValue)} total</span>
        </div>
        <div className="donut-wrap">
          <DonutChart segments={data} size={120} />
          <div className="donut-meta">
            <div className="v">{data[0].pct.toFixed(1)}%</div>
            <div className="l">{data[0].name}</div>
            <div className="l" style={{ marginTop: 6 }}>largest</div>
          </div>
        </div>
        <div style={{ marginTop: 6 }}>
          {data.map((s) => (
            <div className="legend-row" key={s.name}>
              <span className="swatch" style={{ background: s.color }} />
              <span className="name">{s.name}</span>
              <span className="val">€{fmtN(Math.round((s.pct / 100) * totalValue))}</span>
              <span className="pct">{s.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 3 }}>
        <div className="pcard-h">
          <div className="t">Concentration check</div>
          <span className="more">2 warnings</span>
        </div>
        <div>
          {D.concentration.map((c) => (
            <div className="conc-row" key={c.label}>
              <span className={'dot ' + c.status} />
              <div className="body">
                <div className="label">{c.label}</div>
                <div className="note">{c.note}</div>
              </div>
              <div className="v">{c.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 80 }} />
    </ProShell>
  );
}

function DonutChart({ segments, size = 120 }) {
  const r = (size - 16) / 2;
  const cx = size / 2; const cy = size / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
      {segments.map((s, i) => {
        const len = (s.pct / 100) * c;
        const dash = `${len} ${c - len}`;
        const dashOffset = -offset;
        offset += len;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color}
            strokeWidth="14"
            strokeDasharray={dash}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
      })}
    </svg>
  );
}

// Export
Object.assign(window, {
  HoldingsPage, DividendsPage, PerformancePage, DiversificationPage,
  ProShell,
});

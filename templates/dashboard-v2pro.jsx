// V2 Pro — professional, compact format.
// Inspired by your existing .cdn-pro .hero-stats desktop pattern: single
// bordered card, 1px hairline grid, tabular numerics, tight cells.

const { useState: useStateP } = React;
const CP = window.Cadence;

const V2P_STYLE = `
.mob.v2p {
  --pad: 14px;
  --gap: 10px;
  --card-r: 12px;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  height: 100%; width: 100%;
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
}
.mob.v2p .scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; }
.mob.v2p .scroll::-webkit-scrollbar { display: none; }

/* Topbar — small, neutral */
.mob.v2p .topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px var(--pad);
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.mob.v2p .topbar .ttl {
  font-size: 11px; letter-spacing: 0.08em;
  text-transform: uppercase; font-weight: 600;
  color: var(--text);
}
.mob.v2p .topbar .ttl .dot {
  display: inline-block; width: 6px; height: 6px;
  border-radius: 50%; background: var(--accent-soft);
  margin-right: 6px; vertical-align: middle;
}
.mob.v2p .topbar .right { display: flex; gap: 4px; align-items: center; }
.mob.v2p .topbar .icb {
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; background: transparent; color: var(--text-muted);
  cursor: pointer; border-radius: 6px;
}
.mob.v2p .topbar .icb:hover { background: var(--surface-2); color: var(--text); }

/* Pro-hero — eyebrow / value / live meta, left-aligned & tight */
.mob.v2p .pro-hero {
  padding: 12px var(--pad) 10px;
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 12px;
}
.mob.v2p .pro-hero .eyebrow {
  font-size: 10px; color: var(--text-dim);
  font-weight: 500;
  letter-spacing: 0.06em; text-transform: uppercase;
  margin-bottom: 4px;
}
.mob.v2p .pro-hero h1 {
  margin: 0;
  font-size: 32px; font-weight: 600; letter-spacing: -0.025em;
  line-height: 1.05;
  font-variant-numeric: tabular-nums; font-feature-settings: 'tnum';
}
.mob.v2p .pro-hero h1 .cur {
  font-size: 18px; color: var(--text-dim); font-weight: 400;
  vertical-align: top; line-height: 1.5; margin-right: 1px;
}
.mob.v2p .pro-hero h1 .frac {
  color: var(--text-dim); font-weight: 400;
}
.mob.v2p .pro-hero .sub {
  margin-top: 5px;
  font-size: 11px; color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.mob.v2p .pro-hero .sub .up { color: var(--up-fg); font-weight: 600; }
.mob.v2p .pro-hero .sub .down { color: var(--down); font-weight: 600; }
.mob.v2p .pro-hero .right-meta {
  text-align: right;
  font-size: 10px; color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  display: flex; flex-direction: column; gap: 2px;
}
.mob.v2p .pro-hero .right-meta .live {
  display: inline-flex; align-items: center; gap: 5px;
  justify-content: flex-end;
  color: var(--text); font-weight: 500; font-size: 10.5px;
}
.mob.v2p .pro-hero .right-meta .live::before {
  content: ''; width: 5px; height: 5px; border-radius: 50%;
  background: oklch(0.55 0.10 165);
  box-shadow: 0 0 0 2.5px oklch(0.55 0.10 165 / 0.18);
}

/* 4-cell stat grid — hairline 1px dividers via background:var(--border) + gap:1px */
.mob.v2p .hero-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--border);
  margin: 0 var(--pad);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.mob.v2p .hero-stats .cell {
  background: var(--surface);
  padding: 12px 14px;
  display: flex; flex-direction: column; gap: 2px;
  min-height: 76px;
}
.mob.v2p .hero-stats .cell .l {
  font-size: 9.5px; color: var(--text-dim);
  font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase;
}
.mob.v2p .hero-stats .cell .v {
  margin-top: 2px;
  font-size: 22px; font-weight: 600; letter-spacing: -0.02em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums; font-feature-settings: 'tnum';
}
.mob.v2p .hero-stats .cell .v .cur {
  font-size: 0.6em; color: var(--text-dim); font-weight: 400;
  vertical-align: top; line-height: 1.55; margin-right: 1px;
}
.mob.v2p .hero-stats .cell .v .pct {
  font-size: 0.6em; color: var(--text-dim); font-weight: 400;
}
.mob.v2p .hero-stats .cell .d {
  font-size: 10px; color: var(--text-muted);
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}
.mob.v2p .hero-stats .cell .d .up { color: var(--up-fg); font-weight: 600; }
.mob.v2p .hero-stats .cell .d .down { color: var(--down); font-weight: 600; }

/* density tuning */
.mob.v2p[data-density="compact"] {
  --pad: 12px; --gap: 8px;
}
.mob.v2p[data-density="compact"] .hero-stats .cell { padding: 10px 12px; min-height: 66px; }
.mob.v2p[data-density="compact"] .hero-stats .cell .v { font-size: 20px; }
.mob.v2p[data-density="compact"] .pro-hero h1 { font-size: 28px; }

.mob.v2p[data-density="comfy"] {
  --pad: 18px; --gap: 14px;
}
.mob.v2p[data-density="comfy"] .hero-stats .cell { padding: 16px 18px; min-height: 90px; }
.mob.v2p[data-density="comfy"] .hero-stats .cell .v { font-size: 26px; }
.mob.v2p[data-density="comfy"] .pro-hero h1 { font-size: 36px; }

/* pcard — compact pro */
.mob.v2p .pcard {
  margin: var(--gap) var(--pad) 0;
  background: var(--surface);
  border-radius: var(--card-r);
  border: 1px solid var(--border);
  padding: 12px 14px;
}
.mob.v2p[data-density="comfy"] .pcard { padding: 16px 18px; }

.mob.v2p .pcard-h {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
  gap: 8px;
}
.mob.v2p .pcard-h .t {
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--text);
}
.mob.v2p .pcard-h .tag {
  font-size: 9.5px; padding: 2px 7px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-muted);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.mob.v2p .pcard-h .more {
  font-size: 11px; font-weight: 500;
  color: var(--text-muted); cursor: pointer;
}

/* Tabular row layout for contributors / upcoming */
.mob.v2p .ptable {
  display: flex; flex-direction: column;
}
.mob.v2p .ptable .row {
  display: grid; align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
}
.mob.v2p .ptable .row:last-child { border-bottom: 0; }

.mob.v2p .ptable.contrib .row {
  grid-template-columns: 22px 1fr 50px 64px;
  gap: 10px;
}
.mob.v2p .ptable.upcoming .row {
  grid-template-columns: 38px 22px 1fr 70px;
  gap: 10px;
}

.mob.v2p .ptable .logo {
  width: 22px; height: 22px; border-radius: 5px;
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 10px; color: rgba(0,0,0,0.85);
  flex-shrink: 0;
}
.mob.v2p .ptable .tk { font-size: 12px; font-weight: 600; letter-spacing: 0; }
.mob.v2p .ptable .nm { font-size: 10.5px; color: var(--text-dim); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mob.v2p .ptable .v { font-size: 12.5px; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; }
.mob.v2p .ptable .s { font-size: 10px; color: var(--text-dim); text-align: right; margin-top: 1px; font-variant-numeric: tabular-nums; }
.mob.v2p .ptable .bar {
  height: 3px; background: var(--surface-2); border-radius: 999px; overflow: hidden;
  margin-top: 4px;
}
.mob.v2p .ptable .bar > i {
  display: block; height: 100%;
  background: var(--text); opacity: 0.7; border-radius: 999px;
}
.mob.v2p .ptable .yld {
  font-size: 10.5px; color: var(--text-dim); text-align: right;
  font-variant-numeric: tabular-nums;
}

.mob.v2p .ptable .cal {
  text-align: center;
}
.mob.v2p .ptable .cal .d {
  font-size: 14px; font-weight: 600; letter-spacing: -0.02em;
  line-height: 1; font-variant-numeric: tabular-nums;
}
.mob.v2p .ptable .cal .m {
  font-size: 8.5px; color: var(--text-dim);
  text-transform: uppercase; letter-spacing: 0.08em;
  font-weight: 600; margin-top: 2px;
}
.mob.v2p .ptable .right-amt {
  text-align: right;
}
.mob.v2p .ptable .right-amt .v {
  font-size: 12.5px; font-weight: 600; font-variant-numeric: tabular-nums;
}
.mob.v2p .ptable .right-amt .s {
  font-size: 10px; color: var(--text-dim); margin-top: 1px;
  font-variant-numeric: tabular-nums;
}

/* Rhythm card — slim */
.mob.v2p .rhythm-wrap { padding: 2px 0 0; }

/* FIRE card */
.mob.v2p .fire-grid {
  display: grid; grid-template-columns: 1fr auto; align-items: baseline;
  gap: 10px;
}
.mob.v2p .fire-grid .big {
  font-size: 20px; font-weight: 600; letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums; font-feature-settings: 'tnum';
}
.mob.v2p .fire-grid .big .cur { font-size: 0.65em; color: var(--text-dim); font-weight: 400; vertical-align: top; line-height: 1.55; margin-right: 1px; }
.mob.v2p .fire-grid .of {
  font-size: 11px; color: var(--text-dim); font-variant-numeric: tabular-nums;
}
.mob.v2p .fire-grid .pct {
  font-size: 12px; color: var(--text); font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.mob.v2p .fire-track {
  position: relative; height: 6px;
  background: var(--surface-2);
  border-radius: 3px; overflow: hidden;
  margin-top: 8px;
}
.mob.v2p .fire-fill {
  position: absolute; inset: 0;
  background: var(--accent-soft);
  border-radius: 3px;
}
.mob.v2p .fire-foot {
  display: flex; justify-content: space-between;
  margin-top: 6px;
  font-size: 9.5px; color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}

.mob.v2p .pad-bottom { height: 16px; }

/* Bottom tab bar — slim, neutral, hairline divider on top */
.mob.v2p .tabbar {
  flex-shrink: 0;
  display: grid; grid-template-columns: repeat(5, 1fr);
  padding: 4px 2px 4px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}
.mob.v2p .tabbar .tab {
  display: flex; flex-direction: column; align-items: center;
  gap: 2px; padding: 5px 2px;
  font-size: 9.5px; font-weight: 500;
  color: var(--text-dim);
  cursor: pointer;
  border-radius: 8px;
}
.mob.v2p .tabbar .tab.is-active { color: var(--text); }
.mob.v2p .tabbar .tab .ico { width: 20px; height: 20px; color: currentColor; }
`;

function injectV2PStyle() {
  if (document.getElementById('v2p-style')) return;
  const s = document.createElement('style');
  s.id = 'v2p-style';
  s.textContent = V2P_STYLE;
  document.head.appendChild(s);
}

const fmtP = (n, d = 0) => window.fmt(n, d);

function V2Pro({ density = 'regular', navPattern = 'tabs' }) {
  injectV2PStyle();
  const [drawer, setDrawer] = useStateP(false);
  const { whole, frac } = window.splitEuro(CP.summary.totalValue);
  const pct = Math.min(100, (CP.summary.forwardAnnualIncome / CP.incomeTarget) * 100);
  const years = Math.ceil(Math.log(CP.incomeTarget / CP.summary.forwardAnnualIncome) / Math.log(1.08));
  const maxContrib = CP.contributors[0].forwardAnnualLocal;

  return (
    <div className="mob v2p" data-density={density}>
      {/* Topbar — Cadence wordmark + portfolio + actions */}
      <div className="topbar">
        <div className="ttl"><span className="dot" />CADENCE · Main</div>
        <div className="right">
          <button className="icb" onClick={() => setDrawer(true)} aria-label="Menu">
            <window.Icon name="menu" size={18} />
          </button>
          <button className="icb" aria-label="Search"><window.Icon name="search" size={16} /></button>
          <button className="icb" aria-label="Alerts"><window.Icon name="bell" size={16} /></button>
        </div>
      </div>

      <div className="scroll">
        {/* Pro hero */}
        <div className="pro-hero cdn-anim" style={{ '--i': 0 }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">Portfolio · {CP.todayLabel}</div>
            <h1><span className="cur">€</span>{whole}<span className="frac">.{frac}</span></h1>
            <div className="sub">
              <span className="up">▲ €{fmtP(CP.summary.todayDeltaAbs, 2)} · +{CP.summary.todayDeltaPct}%</span> today · <span style={{ color: 'var(--up-fg)', fontWeight: 600 }}>+€{fmtP(CP.summary.unrealizedPL)} ({CP.summary.unrealizedPLPct.toFixed(2)}%)</span> total
            </div>
          </div>
          <div className="right-meta">
            <span className="live">LIVE</span>
            <span>{CP.summary.positionsCount} positions</span>
            <span>14:32 UTC</span>
          </div>
        </div>

        {/* 2×2 stat grid — hairline dividers, professional and compact */}
        <div className="hero-stats cdn-anim" style={{ '--i': 1 }}>
          <div className="cell">
            <div className="l">Fwd income</div>
            <div className="v"><span className="cur">€</span>{fmtP(CP.summary.forwardAnnualIncome)}</div>
            <div className="d"><span className="up">+7.9%</span> YoY · 12M</div>
          </div>
          <div className="cell">
            <div className="l">Fwd yield</div>
            <div className="v">{CP.summary.forwardYieldPct.toFixed(2)}<span className="pct">%</span></div>
            <div className="d">YoC {CP.summary.yieldOnCostPct.toFixed(2)}%</div>
          </div>
          <div className="cell">
            <div className="l">YTD received</div>
            <div className="v"><span className="cur">€</span>{fmtP(CP.summary.ytdReceived)}</div>
            <div className="d">{((CP.summary.ytdReceived / CP.summary.forwardAnnualIncome) * 100).toFixed(0)}% of fwd</div>
          </div>
          <div className="cell">
            <div className="l">T12M income</div>
            <div className="v"><span className="cur">€</span>{fmtP(CP.summary.t12mReceived)}</div>
            <div className="d"><span className="up">+12.4%</span> vs prior</div>
          </div>
        </div>

        {/* Rhythm */}
        <div className="pcard cdn-anim" style={{ '--i': 2 }}>
          <div className="pcard-h">
            <div className="t">Income rhythm</div>
            <span className="tag">12M · 6F</span>
          </div>
          <div className="rhythm-wrap">
            <window.RhythmChart height={70} condensed />
          </div>
        </div>

        {/* Top contributors */}
        <div className="pcard cdn-anim" style={{ '--i': 3 }}>
          <div className="pcard-h">
            <div className="t">Top contributors</div>
            <span className="more">All →</span>
          </div>
          <div className="ptable contrib">
            {CP.contributors.slice(0, 5).map((c) => {
              const w = (c.forwardAnnualLocal / maxContrib) * 100;
              return (
                <div className="row" key={c.ticker}>
                  <div className="logo" style={{ background: c.color }}>{c.ticker.slice(0, 1)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="tk">{c.ticker}</div>
                    <div className="bar"><i style={{ width: `${w}%` }} /></div>
                  </div>
                  <div className="yld">{c.yieldPct.toFixed(2)}%</div>
                  <div className="v">€{fmtP(c.forwardAnnualLocal)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coming up */}
        <div className="pcard cdn-anim" style={{ '--i': 4 }}>
          <div className="pcard-h">
            <div className="t">Coming up</div>
            <span className="tag">Next 5 · 60d</span>
          </div>
          <div className="ptable upcoming">
            {CP.upcoming.slice(0, 5).map((e) => {
              const d = new Date(e.exDate);
              const MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              const color = CP.contributors.find(c => c.ticker === e.ticker)?.color ?? '#94a3b8';
              return (
                <div className="row" key={e.ticker}>
                  <div className="cal">
                    <div className="d">{String(d.getDate()).padStart(2, '0')}</div>
                    <div className="m">{MONTH[d.getMonth()]}</div>
                  </div>
                  <div className="logo" style={{ background: color }}>{e.ticker.slice(0, 1)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="tk">{e.ticker}</div>
                    <div className="nm">in {e.daysUntil}d{e.isProjected ? ' · est' : ''}</div>
                  </div>
                  <div className="right-amt">
                    <div className="v">€{fmtP(e.estimatedTotalLocal, 2)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FIRE */}
        <div className="pcard cdn-anim" style={{ '--i': 5 }}>
          <div className="pcard-h">
            <div className="t">Passive income target</div>
            <span className="tag">€{(CP.incomeTarget / 1000).toFixed(0)}k / yr</span>
          </div>
          <div className="fire-grid">
            <div>
              <span className="big"><span className="cur">€</span>{fmtP(CP.summary.forwardAnnualIncome)}</span>
              <span className="of"> / €{fmtP(CP.incomeTarget)}</span>
            </div>
            <div className="pct">{pct.toFixed(1)}%</div>
          </div>
          <div className="fire-track">
            <div className="fire-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="fire-foot">
            <span>€0</span><span>€7.5k</span><span>€15k</span><span>€22.5k</span><span>€30k</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--text-muted)' }}>
            ~<b style={{ color: 'var(--text)' }}>{years} yrs</b> at 8% growth
          </div>
        </div>

        <div className="pad-bottom" />
      </div>

      {/* Bottom tabs — compact */}
      {navPattern === 'segmented' ? <window.SegBottomPlaceholder /> : (
        <div className="tabbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
            { id: 'holdings',  label: 'Holdings',  icon: 'holdings' },
            { id: 'dividends', label: 'Dividends', icon: 'dividends' },
            { id: 'perf',      label: 'Perf',      icon: 'perf' },
            { id: 'more',      label: 'More',      icon: 'more' },
          ].map((t) => (
            <div
              key={t.id}
              className={'tab' + (t.id === 'dashboard' ? ' is-active' : '')}
              onClick={() => t.id === 'more' && setDrawer(true)}
            >
              <span className="ico"><window.Icon name={t.icon} size={20} /></span>
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      )}
      <window.Drawer open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}

window.V2Pro = V2Pro;

// V2 Breathing — refined Big Number direction.
// Less text, bigger numbers, more vertical spacing.

const { useState: useStateB } = React;
const CB = window.Cadence;

// ── reset styles specific to V2 breathing ────────────────────
// Larger pad, larger card radius, breathing gaps between sections.
const V2_STYLE = `
.mob.v2b {
  --pad: 22px;
  --card-r: 18px;
  --gap: 22px;
}
.mob.v2b[data-density="compact"] { --pad: 16px; --gap: 14px; --card-r: 16px; }
.mob.v2b[data-density="comfy"]   { --pad: 26px; --gap: 28px; --card-r: 20px; }

.mob.v2b .topbar { padding: 10px var(--pad) 4px; }

.mob.v2b .hero {
  text-align: center;
  padding: 36px var(--pad) 24px;
}
.mob.v2b[data-density="compact"] .hero { padding: 24px var(--pad) 18px; }
.mob.v2b[data-density="comfy"]   .hero { padding: 44px var(--pad) 32px; }

.mob.v2b .hero .eyebrow {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 14px;
}
.mob.v2b .hero h1 {
  margin: 0;
  font-size: 64px;
  line-height: 0.95;
  letter-spacing: -0.04em;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
.mob.v2b[data-density="compact"] .hero h1 { font-size: 54px; }
.mob.v2b[data-density="comfy"]   .hero h1 { font-size: 72px; }

.mob.v2b .hero h1 .cur {
  font-weight: 400; color: var(--text-dim);
  font-size: 0.55em; vertical-align: top; line-height: 1.4;
  margin-right: 4px;
}
.mob.v2b .hero h1 .frac {
  font-weight: 400; color: var(--text-dim);
  font-size: 0.55em;
}

.mob.v2b .hero .delta {
  margin-top: 22px;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}
.mob.v2b .hero .delta .pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px 5px 10px;
  border-radius: 999px;
  background: var(--up-bg);
  color: var(--up-fg);
  font-weight: 600;
  font-size: 13px;
}
.mob.v2b .hero .delta .pill .arrow { font-size: 10px; line-height: 1; }

/* Stat stack — full-width rows, one per stat, stacked vertically. */
.mob.v2b .stat-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 var(--pad);
  margin-top: var(--gap);
}
.mob.v2b[data-density="compact"] .stat-stack { gap: 8px; }
.mob.v2b[data-density="comfy"]   .stat-stack { gap: 14px; }

.mob.v2b .stat-stack .row {
  display: flex; flex-direction: column;
  gap: 8px;
  background: var(--surface);
  border-radius: 16px;
  border: 1px solid var(--border);
  padding: 18px 20px;
}
.mob.v2b[data-density="compact"] .stat-stack .row { padding: 14px 16px; gap: 6px; }
.mob.v2b[data-density="comfy"]   .stat-stack .row { padding: 22px 24px; gap: 10px; }

.mob.v2b .stat-stack .row .head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
}
.mob.v2b .stat-stack .row .l {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.mob.v2b .stat-stack .row .d {
  font-size: 11.5px;
  color: var(--text-dim);
}
.mob.v2b .stat-stack .row .v {
  font-size: 34px;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
.mob.v2b[data-density="comfy"] .stat-stack .row .v { font-size: 40px; }
.mob.v2b[data-density="compact"] .stat-stack .row .v { font-size: 28px; }
.mob.v2b .stat-stack .row .v .cur {
  font-size: 0.55em; color: var(--text-dim); font-weight: 400;
  vertical-align: top; line-height: 1.6; margin-right: 2px;
}
.mob.v2b .stat-stack .row .v .pct {
  font-size: 0.55em; color: var(--text-dim); font-weight: 400;
}
.mob.v2b .stat-stack .row .trend {
  font-size: 11.5px;
  color: var(--up);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  display: inline-flex; align-items: center; gap: 4px;
  flex-shrink: 0;
}
.mob.v2b .stat-stack .row .trend.down { color: var(--down); }
.mob.v2b .stat-stack .row .trend.flat { color: var(--text-dim); }

/* ── Stat treatment: A · LABEL-TOP / PAIRED ──
   Two cards side-by-side. Left: a merged paired metric (e.g. Forward vs T12M)
   with a split bar. Right: a stacked named-rows card (e.g. Forward + YoC yield).
   Modelled on the user's "Market Overview" reference (Decliners & Advancers
   paired card + Net Inflow stacked card). */
.mob.v2b .stat-paired {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 10px;
  padding: 0 var(--pad);
  margin-top: var(--gap);
}
.mob.v2b[data-density="compact"] .stat-paired { gap: 8px; }
.mob.v2b[data-density="comfy"]   .stat-paired { gap: 14px; }

.mob.v2b .stat-paired .pcard-mini {
  background: var(--surface);
  border-radius: 16px;
  border: 1px solid var(--border);
  padding: 14px 14px 16px;
  display: flex; flex-direction: column;
}
.mob.v2b[data-density="comfy"] .stat-paired .pcard-mini { padding: 18px; }
.mob.v2b[data-density="compact"] .stat-paired .pcard-mini { padding: 12px; }

.mob.v2b .stat-paired .pcard-mini .ph .chev {
  color: var(--text-dim);
  flex-shrink: 0;
}

/* Paired card body: two values flanking a colon, split bar below */
.mob.v2b .stat-paired .paired-vals {
  display: flex; align-items: baseline; justify-content: center;
  gap: 8px;
}
.mob.v2b .stat-paired .paired-vals .num {
  /* Use sans + proportional digits — mono+tnum pads the thousands separator
     to digit-width, which reads as an unwanted space (e.g. "5 , 418"). */
  font-family: var(--font-sans);
  font-variant-numeric: normal;
  font-feature-settings: normal;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.mob.v2b .stat-paired .paired-vals .num.a { color: var(--text); }
.mob.v2b .stat-paired .paired-vals .num.b { color: var(--up-fg); }
.mob.v2b .stat-paired .paired-vals .num .cur {
  font-size: 0.7em; color: var(--text-dim); font-weight: 400;
  vertical-align: baseline; margin-right: 1px;
}
.mob.v2b .stat-paired .paired-vals .sep {
  font-size: 16px; font-weight: 400; color: var(--text-dim);
  line-height: 1;
}

.mob.v2b .stat-paired .paired-bar {
  display: flex; gap: 3px;
  height: 6px;
  margin-top: 12px;
}
.mob.v2b .stat-paired .paired-bar .a {
  background: var(--text); opacity: 0.78;
  border-radius: 3px;
}
.mob.v2b .stat-paired .paired-bar .b {
  background: var(--up); opacity: 0.85;
  border-radius: 3px;
}

.mob.v2b .stat-paired .paired-foot {
  display: flex; justify-content: space-between;
  margin-top: 8px;
  font-size: 10px;
  color: var(--text-dim);
  font-weight: 400;
}

/* Stacked card body: 2-3 named rows */
.mob.v2b .stat-paired .stacked-rows {
  display: flex; flex-direction: column; gap: 6px;
}
.mob.v2b .stat-paired .stacked-rows .srow {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 8px;
}
.mob.v2b .stat-paired .stacked-rows .srow .name {
  font-size: 10px;
  color: var(--text-dim);
  font-weight: 400;
}
.mob.v2b .stat-paired .stacked-rows .srow .val {
  /* Value-tier — clearly smaller than the 14px card title */
  font-family: var(--font-sans);
  font-variant-numeric: normal;
  font-feature-settings: normal;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.01em;
}
.mob.v2b .stat-paired .stacked-rows .srow .val.up { color: var(--up-fg); }
.mob.v2b .stat-paired .stacked-rows .srow .val.down { color: var(--down); }

/* legacy default (used when treatment is none of the above paired/number-first/etc) */

/* ── Stat treatment: B · NUMBER-FIRST ──
   Big value reads first; label collapses into a small caption below. */
.mob.v2b .stat-stack.t-number-first .row {
  gap: 6px;
  padding: 18px 20px 16px;
}
.mob.v2b .stat-stack.t-number-first .row .head { order: 2; }
.mob.v2b .stat-stack.t-number-first .row .v { order: 1; }
.mob.v2b .stat-stack.t-number-first .row .d { order: 3; }
.mob.v2b .stat-stack.t-number-first .row .l {
  text-transform: none;
  letter-spacing: 0;
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
}
.mob.v2b .stat-stack.t-number-first .row .d { display: none; }

/* ── Stat treatment: C · BORDERLESS ──
   Single card, rows separated only by hair-line dividers. */
.mob.v2b .stat-stack.t-borderless {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 4px 4px;
  gap: 0;
  margin-left: var(--pad);
  margin-right: var(--pad);
  padding: 0;
}
.mob.v2b .stat-stack.t-borderless .row {
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.mob.v2b .stat-stack.t-borderless .row:last-child { border-bottom: 0; }
.mob.v2b .stat-stack.t-borderless .row .v { font-size: 30px; }
.mob.v2b .stat-stack.t-borderless .row .d {
  font-size: 11px; color: var(--text-dim);
}

/* ── Stat treatment: D · SPARKLINE ──
   Value left, mini chart filling right side. */
.mob.v2b .stat-stack.t-spark .row {
  padding: 16px 20px;
  gap: 4px;
}
.mob.v2b .stat-stack.t-spark .row .body {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
  align-items: center;
}
.mob.v2b .stat-stack.t-spark .row .body .left { min-width: 0; }
.mob.v2b .stat-stack.t-spark .row .v { font-size: 30px; }
.mob.v2b .stat-stack.t-spark .row .d {
  font-size: 11px; color: var(--text-dim); margin-top: 4px;
}
.mob.v2b .stat-stack.t-spark .row .trend {
  margin-top: 4px;
  font-size: 11px;
}
.mob.v2b .stat-stack.t-spark .row .spark {
  width: 96px; height: 44px;
  align-self: stretch;
  display: flex; align-items: center;
}

/* Generous card spacing */
.mob.v2b .pcard {
  margin: var(--gap) var(--pad) 0;
  padding: 20px var(--pad);
  border-radius: var(--card-r);
  background: var(--surface);
  border: 1px solid var(--border);
}
.mob.v2b[data-density="compact"] .pcard { padding: 16px 16px; }
.mob.v2b[data-density="comfy"]   .pcard { padding: 24px 24px; }

.mob.v2b .pcard-h {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 18px;
}
.mob.v2b .pcard-h .t {
  /* Title-tier — must be larger/heavier than any side-tag or caption */
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.005em;
  text-transform: none;
  color: var(--text);
}
.mob.v2b .pcard-h .more {
  /* Side-tag-tier — clearly subordinate to the title */
  font-size: 11px;
  color: var(--text-dim);
  font-weight: 500;
  cursor: pointer;
}
.mob.v2b .pcard-h .tag {
  font-size: 10px;
  color: var(--text-dim);
  font-weight: 500;
  padding: 3px 7px;
  border-radius: 999px;
  background: var(--surface-2);
  letter-spacing: 0.02em;
}

/* Same hierarchy inside the paired stat cards */
.mob.v2b .stat-paired .pcard-mini .ph {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.005em;
  margin-bottom: 12px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px;
}
.mob.v2b .stat-paired .pcard-mini .ph .chev {
  color: var(--text-dim);
  flex-shrink: 0;
}

/* Contributors list — bigger amounts, less text */
.mob.v2b .ctr-row {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 0;
}
.mob.v2b .ctr-row + .ctr-row { border-top: 1px solid var(--border); }
.mob.v2b .ctr-row .logo {
  width: 38px; height: 38px;
  border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px; color: rgba(0,0,0,0.85);
  flex-shrink: 0;
}
.mob.v2b .ctr-row .body { flex: 1; min-width: 0; }
.mob.v2b .ctr-row .body .tk {
  /* Row label — must be smaller than the card title (14px) */
  font-size: 13px; font-weight: 600; letter-spacing: -0.01em;
}
.mob.v2b .ctr-row .body .nm {
  /* Caption-tier */
  font-size: 11px; color: var(--text-dim); margin-top: 2px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mob.v2b .ctr-row .right { text-align: right; }
.mob.v2b .ctr-row .right .v {
  font-size: 17px; font-weight: 600; letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
.mob.v2b .ctr-row .right .y {
  /* Caption-tier */
  font-size: 10px; color: var(--text-dim); margin-top: 1px;
  font-variant-numeric: tabular-nums;
}

/* Upcoming list — calendar bubble + ticker + amount only */
.mob.v2b .up-row {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 0;
}
.mob.v2b .up-row + .up-row { border-top: 1px solid var(--border); }
.mob.v2b .up-row .cal {
  width: 46px; flex-shrink: 0; text-align: center;
}
.mob.v2b .up-row .cal .d {
  font-size: 22px; font-weight: 600;
  letter-spacing: -0.02em; line-height: 1;
  font-variant-numeric: tabular-nums;
}
.mob.v2b .up-row .cal .m {
  font-size: 9.5px; color: var(--text-dim);
  text-transform: uppercase; letter-spacing: 0.08em;
  font-weight: 600; margin-top: 4px;
}
.mob.v2b .up-row .body { flex: 1; min-width: 0; }
.mob.v2b .up-row .body .tk { font-size: 13px; font-weight: 600; letter-spacing: -0.01em; }
.mob.v2b .up-row .body .in { font-size: 10px; color: var(--text-dim); margin-top: 2px; }
.mob.v2b .up-row .right .v {
  font-size: 17px; font-weight: 600; letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}

/* Rhythm card — emphasize the chart */
.mob.v2b .rhythm-wrap { padding: 4px 2px 0; }

/* FIRE card — bigger progress */
.mob.v2b .fire-num {
  display: flex; align-items: baseline; gap: 10px;
  margin-top: 4px;
}
.mob.v2b .fire-num .big {
  font-size: 34px; font-weight: 600; letter-spacing: -0.025em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
.mob.v2b .fire-num .big .cur { font-size: 0.55em; color: var(--text-dim); font-weight: 400; vertical-align: top; line-height: 1.6; margin-right: 2px; }
.mob.v2b .fire-num .of {
  /* Caption-tier next to the big 34px figure */
  font-size: 11px; color: var(--text-dim); font-weight: 400;
  font-variant-numeric: tabular-nums;
}
.mob.v2b .fire-track {
  position: relative; height: 10px;
  background: var(--surface-2);
  border-radius: 5px; overflow: hidden;
  margin-top: 18px;
}
.mob.v2b .fire-fill {
  position: absolute; inset: 0;
  background: var(--accent-soft);
  border-radius: 5px;
  transition: width 700ms cubic-bezier(0.22,1,0.36,1);
}
.mob.v2b .fire-foot {
  display: flex; justify-content: space-between;
  margin-top: 10px;
  font-size: 10px; color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}
.mob.v2b .fire-foot .pct {
  color: var(--text); font-weight: 600;
}

.mob.v2b .scroll-pad-bottom { height: 28px; }
`;

function injectV2Style() {
  if (document.getElementById('v2b-style')) return;
  const s = document.createElement('style');
  s.id = 'v2b-style';
  s.textContent = V2_STYLE;
  document.head.appendChild(s);
}
// Inject on script load so .mob.v2b CSS is available to ALL tiers that
// reuse the chassis (Free, Elite, Account, AddEdit, Public), not just
// the pages that happen to render V2Breathing.
injectV2Style();
window.injectV2Style = injectV2Style;

// ── V2 Breathing ───────────────────────────────────────────────
// statStyle: 'label-top' (default) | 'number-first' | 'borderless' | 'spark'
function V2Breathing({ density = 'regular', navPattern = 'tabs', statStyle = 'label-top' }) {
  injectV2Style();
  const [drawer, setDrawer] = useStateB(false);
  const { whole, frac } = window.splitEuro(CB.summary.totalValue);
  const pct = Math.min(100, (CB.summary.forwardAnnualIncome / CB.incomeTarget) * 100);

  return (
    <div className="mob v2b" data-density={density}>
      <window.TopBar onMenu={() => setDrawer(true)} dense />

      <div className="scroll">
        {/* Hero — centered big number, single delta pill, nothing else */}
        <div className="hero cdn-anim" style={{ '--i': 0 }}>
          <div className="eyebrow">Portfolio · {CB.todayLabel}</div>
          <h1>
            <span className="cur">€</span>{whole}<span className="frac">.{frac}</span>
          </h1>
          <div className="delta">
            <span className="pill">
              <span className="arrow">▲</span>
              €{window.fmt(CB.summary.todayDeltaAbs, 2)} · +{CB.summary.todayDeltaPct}%
            </span>
            <span style={{ marginLeft: 8 }}>today</span>
          </div>
        </div>

        {/* Stat stack — vertical full-width, treatment varies by statStyle */}
        <StatStack statStyle={statStyle} />

        {/* Rhythm */}
        <div className="pcard cdn-anim" style={{ '--i': 2 }}>
          <div className="pcard-h">
            <div className="t">Income rhythm</div>
            <span className="more">12M + 6M</span>
          </div>
          <div className="rhythm-wrap">
            <window.RhythmChart height={120} />
          </div>
        </div>

        {/* Top contributors */}
        <div className="pcard cdn-anim" style={{ '--i': 3 }}>
          <div className="pcard-h">
            <div className="t">Top contributors</div>
            <span className="more">See all</span>
          </div>
          <div>
            {CB.contributors.slice(0, 4).map((c) => (
              <div key={c.ticker} className="ctr-row">
                <div className="logo" style={{ background: c.color }}>{c.ticker.slice(0, 1)}</div>
                <div className="body">
                  <div className="tk">{c.ticker}</div>
                  <div className="nm">{c.name}</div>
                </div>
                <div className="right">
                  <div className="v">€{window.fmt(c.forwardAnnualLocal)}</div>
                  <div className="y">{c.yieldPct.toFixed(2)}% yld</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coming up */}
        <div className="pcard cdn-anim" style={{ '--i': 4 }}>
          <div className="pcard-h">
            <div className="t">Coming up</div>
            <span className="more">See all</span>
          </div>
          <div>
            {CB.upcoming.slice(0, 3).map((e) => {
              const d = new Date(e.exDate);
              const MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              return (
                <div key={e.ticker} className="up-row">
                  <div className="cal">
                    <div className="d">{String(d.getDate()).padStart(2, '0')}</div>
                    <div className="m">{MONTH[d.getMonth()]}</div>
                  </div>
                  <div className="body">
                    <div className="tk">{e.ticker}</div>
                    <div className="in">in {e.daysUntil}d{e.isProjected ? ' · est' : ''}</div>
                  </div>
                  <div className="right">
                    <div className="v">€{window.fmt(e.estimatedTotalLocal, 2)}</div>
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
            <span className="more">€{(CB.incomeTarget / 1000).toFixed(0)}k / yr</span>
          </div>
          <div className="fire-num">
            <span className="big"><span className="cur">€</span>{window.fmt(CB.summary.forwardAnnualIncome)}</span>
            <span className="of">/ €{window.fmt(CB.incomeTarget)}</span>
          </div>
          <div className="fire-track">
            <div className="fire-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="fire-foot">
            <span><span className="pct">{pct.toFixed(1)}%</span> of target</span>
            <span>~{Math.ceil(Math.log(CB.incomeTarget / CB.summary.forwardAnnualIncome) / Math.log(1.08))} yrs at 8%</span>
          </div>
        </div>

        <div className="scroll-pad-bottom" />
      </div>

      {navPattern === 'segmented'
        ? <window.SegBottomPlaceholder />
        : <window.TabBar onMore={() => setDrawer(true)} />
      }
      <window.Drawer open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}

window.V2Breathing = V2Breathing;

// ── StatStack — 4 stats with switchable visual treatment ──────────
const STAT_ROWS = [
  {
    l: 'Forward income',
    v: <><span className="cur">€</span>{window.fmt(CB.summary.forwardAnnualIncome)}</>,
    d: 'over the next 12 months',
    trend: '▲ +7.9% YoY',
    trendClass: '',
    sparkValues: CB.rhythm.slice(0, CB.nowIndex + 1).map((m) => m.received),
    sparkColor: 'var(--up)',
  },
  {
    l: 'Forward yield',
    v: <>{CB.summary.forwardYieldPct.toFixed(2)}<span className="pct">%</span></>,
    d: `on €${window.fmt(CB.summary.forwardAnnualIncome / (CB.summary.forwardYieldPct / 100))} invested`,
    trend: `YoC ${CB.summary.yieldOnCostPct.toFixed(2)}%`,
    trendClass: 'flat',
    sparkValues: [2.92, 2.98, 3.02, 3.05, 3.08, 3.10, 3.12, 3.14, 3.15, 3.16, 3.17, 3.17],
    sparkColor: 'var(--text)',
  },
  {
    l: 'YTD received',
    v: <><span className="cur">€</span>{window.fmt(CB.summary.ytdReceived)}</>,
    d: 'Jan 2026 → today',
    trend: `${((CB.summary.ytdReceived / CB.summary.forwardAnnualIncome) * 100).toFixed(0)}% of fwd`,
    trendClass: '',
    sparkValues: [0, 428, 940, 1629, 2109, 2667, 2940],
    sparkColor: 'var(--accent-soft)',
  },
  {
    l: 'T12M income',
    v: <><span className="cur">€</span>{window.fmt(CB.summary.t12mReceived)}</>,
    d: 'trailing 12 months',
    trend: '▲ +12.4%',
    trendClass: '',
    sparkValues: [4820, 4910, 5020, 5085, 5180, 5240, 5290, 5340, 5380, 5395, 5410, 5418],
    sparkColor: 'var(--up)',
  },
];

function StatStack({ statStyle = 'label-top' }) {
  if (statStyle === 'label-top') {
    return <StatPaired />;
  }
  return (
    <div className={'stat-stack cdn-anim t-' + statStyle} style={{ '--i': 1 }}>
      {STAT_ROWS.map((r, i) => (
        <div className="row" key={i}>
          {statStyle === 'spark' ? (
            <div className="body">
              <div className="left">
                <div className="head">
                  <div className="l">{r.l}</div>
                </div>
                <div className="v">{r.v}</div>
                <div className="d">{r.d}</div>
              </div>
              <div className="spark">
                <window.Sparkline
                  values={r.sparkValues}
                  width={96} height={44}
                  stroke={r.sparkColor}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="head">
                <div className="l">{r.l}</div>
                <div className={'trend ' + r.trendClass}>{r.trend}</div>
              </div>
              <div className="v">{r.v}</div>
              <div className="d">{r.d}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// Paired stat layout — two cards side-by-side, each merging multiple metrics.
function StatPaired() {
  const fwd = CB.summary.forwardAnnualIncome;
  const t12m = CB.summary.t12mReceived;
  const totalAB = fwd + t12m;
  const aPct = (t12m / totalAB) * 100;
  const bPct = (fwd / totalAB) * 100;

  return (
    <div className="stat-paired cdn-anim" style={{ '--i': 1 }}>
      {/* Card 1 — Annual income, paired (Trailing : Forward) with split bar */}
      <div className="pcard-mini">
        <div className="ph">
          Annual income
          <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9.3 6.3l5.7 5.7-5.7 5.7-1.4-1.4L11.2 12 7.9 7.7z"/></svg>
        </div>
        <div className="paired-vals">
          <span className="num a"><span className="cur">€</span>{window.fmt(t12m)}</span>
          <span className="sep">:</span>
          <span className="num b"><span className="cur">€</span>{window.fmt(fwd)}</span>
        </div>
        <div className="paired-bar">
          <div className="a" style={{ width: `${aPct}%` }} />
          <div className="b" style={{ width: `${bPct}%` }} />
        </div>
        <div className="paired-foot">
          <span>Trailing 12M</span>
          <span>Forward 12M</span>
        </div>
      </div>

      {/* Card 2 — Yield, stacked named rows */}
      <div className="pcard-mini">
        <div className="ph">
          Yield
          <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9.3 6.3l5.7 5.7-5.7 5.7-1.4-1.4L11.2 12 7.9 7.7z"/></svg>
        </div>
        <div className="stacked-rows">
          <div className="srow">
            <span className="name">Forward</span>
            <span className="val">{CB.summary.forwardYieldPct.toFixed(2)}%</span>
          </div>
          <div className="srow">
            <span className="name">YoC</span>
            <span className="val up">{CB.summary.yieldOnCostPct.toFixed(2)}%</span>
          </div>
          <div className="srow">
            <span className="name">YTD</span>
            <span className="val">€{window.fmt(CB.summary.ytdReceived)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.StatStack = StatStack;

// Re-export the segmented placeholder we used in the original variants since
// it isn't exposed by name in v1 (only used internally there).
if (!window.SegBottomPlaceholder) {
  window.SegBottomPlaceholder = function () {
    return (
      <div style={{ position: 'absolute', right: 16, bottom: 22, zIndex: 5 }}>
        <button style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
          border: 0, cursor: 'pointer',
          boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }} aria-label="Add holding">
          <window.Icon name="plus" size={22} />
        </button>
      </div>
    );
  };
}

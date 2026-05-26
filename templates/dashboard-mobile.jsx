// ─────────────────────────────────────────────────────────
// Mobile Dashboard — 5 variants
//   v1 standard      — current product translated to mobile
//   v2 big-number    — Apple-style breathing hero, swipe stats
//   v3 chart-first   — rhythm chart is the hero w/ overlay number
//   v4 summary       — dense glance card combines hero + 4 stats
//   v5 today-feed    — vertical story cards à la Apple Health Today
// ─────────────────────────────────────────────────────────

const { useState, useMemo } = React;

const C = window.Cadence;

// ───── number utils ─────
function fmt(n, d = 0) {
  return n.toLocaleString('en-IE', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function splitEuro(n) {
  const whole = Math.floor(n).toLocaleString('en-IE');
  const frac = (n % 1).toFixed(2).slice(2);
  return { whole, frac };
}

// ───── colored ticker logo ─────
function TickerLogo({ ticker, color = '#94a3b8', size = 32, radius = 8 }) {
  const letter = ticker.slice(0, 1);
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: color, color: 'rgba(0,0,0,0.85)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700, letterSpacing: '0.02em',
      flexShrink: 0,
      boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.06)',
    }}>
      {letter}
    </div>
  );
}

// ───── rhythm chart (bar) ─────
function RhythmChart({ months = C.rhythm, nowIndex = C.nowIndex, height = 96, condensed = false }) {
  const max = Math.max(...months.map((m) => Math.max(m.received, m.projected))) || 1;
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${months.length}, 1fr)`,
        gap: condensed ? 2 : 3,
        height,
        alignItems: 'end',
        padding: '6px 0 4px',
      }}>
        {months.map((m, i) => {
          const isFuture = i > nowIndex;
          const isNow = i === nowIndex;
          const v = isFuture ? m.projected : m.received;
          const h = Math.max(2, (v / max) * (height - 12));
          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'stretch',
              gap: 4, minWidth: 0,
            }} title={`${m.label} · €${fmt(v)}`}>
              <div style={{
                marginTop: 'auto',
                height: h,
                borderRadius: 3,
                background: isFuture
                  ? 'transparent'
                  : isNow ? 'var(--accent-soft)' : 'var(--text)',
                border: isFuture ? '1px dashed var(--border-strong)' : '0',
                opacity: isFuture ? 0.55 : (isNow ? 1 : 0.86),
                transition: 'height 240ms cubic-bezier(0.22,1,0.36,1)',
              }} />
            </div>
          );
        })}
      </div>
      {!condensed && (
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${months.length}, 1fr)`,
          gap: 3, marginTop: 4,
        }}>
          {months.map((m, i) => (
            <div key={i} style={{
              fontSize: 8.5, color: 'var(--text-dim)', textAlign: 'center',
              fontWeight: 500, letterSpacing: '0.02em',
              opacity: (i % 2 === 0 || i === nowIndex) ? 1 : 0,
            }}>{m.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───── tiny sparkline ─────
function Sparkline({ values, width = 120, height = 28, stroke = 'var(--up)' }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const pts = values.map((v, i) => `${i * stepX},${height - 2 - ((v - min) / span) * (height - 4)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ───── icons (24-line outline) ─────
const ICON = {
  dashboard: <path d="M4 13h7V4H4v9zm0 7h7v-5H4v5zm9 0h7V11h-7v9zm0-16v5h7V4h-7z" />,
  holdings:  <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z" />,
  dividends: <path d="M12 3l9 4.5v9L12 21 3 16.5v-9L12 3zm0 2.2L5 8.4v7.2l7 3.2 7-3.2V8.4l-7-3.2z" />,
  perf:      <path d="M3 17l6-6 4 4 8-9-1.4-1.4L13 12 9 8l-7 7L3 17z" />,
  diversification: <path d="M11 11V3.05A9 9 0 0 0 3.05 11H11zm2-7.95V11h7.95A9 9 0 0 0 13 3.05zM3.05 13A9 9 0 1 0 13 21.95V13H3.05z" />,
  bell:      <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11a6 6 0 0 0-5-5.91V5a1 1 0 1 0-2 0v.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z" />,
  more:      <circle cx="12" cy="12" r="1.6" />,
  search:    <path d="M10 2a8 8 0 1 1-5.3 14L1 19.7l1.4 1.4L6 17.3A8 8 0 0 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />,
  plus:      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z" />,
  menu:      <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />,
  chev:      <path d="M9.3 6.3l5.7 5.7-5.7 5.7-1.4-1.4L11.2 12 7.9 7.7z" />,
  user:      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3 0-8 1.5-8 4.5V21h16v-2.5C20 15.5 15 14 12 14z" />,
  tax:       <path d="M5 3h11l3 3v15H5V3zm2 4v2h10V7H7zm0 4v2h10v-2H7zm0 4v2h7v-2H7z" />,
  alerts:    <path d="M12 2a7 7 0 0 0-7 7v4l-2 3v2h18v-2l-2-3V9a7 7 0 0 0-7-7zm0 20a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3z" />,
  settings:  <path d="M19.4 13a7.5 7.5 0 0 0 .1-1 7.5 7.5 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.9 3h-3.8l-.4 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 1.7 1L11.1 21h3.8l.4-2.6a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6zM13 15.5A3.5 3.5 0 1 1 13 8.5a3.5 3.5 0 0 1 0 7z" />,
};
function Icon({ name, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {ICON[name]}
    </svg>
  );
}

// ───── topbar ─────
function TopBar({ onMenu, showMenu = true, portfolio = 'Main portfolio', live = true, dense = false }) {
  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {showMenu && (
          <button className="icon-btn no-bg" onClick={onMenu} aria-label="Menu">
            <Icon name="menu" size={20} />
          </button>
        )}
        <div className="portfolio-chip">
          <span className="dot" /> {portfolio}
          <svg className="chev" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
        </div>
      </div>
      <div className="actions">
        {!dense && (
          <button className="icon-btn no-bg" aria-label="Search">
            <Icon name="search" size={18} />
          </button>
        )}
        <button className="icon-btn no-bg" aria-label="Alerts" style={{ position: 'relative' }}>
          <Icon name="bell" size={18} />
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--down)', border: '1.5px solid var(--surface)',
          }} />
        </button>
        <div className="avatar" title="DM">DM</div>
      </div>
    </div>
  );
}

// ───── bottom tabs ─────
const BOTTOM_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'holdings',  label: 'Holdings',  icon: 'holdings' },
  { id: 'dividends', label: 'Dividends', icon: 'dividends' },
  { id: 'perf',      label: 'Perf',      icon: 'perf' },
  { id: 'more',      label: 'More',      icon: 'more' },
];
function TabBar({ active = 'dashboard', onPick, onMore }) {
  return (
    <div className="tabbar">
      {BOTTOM_TABS.map((t) => (
        <div
          key={t.id}
          className={'tab' + (active === t.id ? ' is-active' : '')}
          onClick={() => (t.id === 'more' ? onMore?.() : onPick?.(t.id))}
        >
          <span className="ico"><Icon name={t.icon} size={22} /></span>
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

// ───── segmented top nav (alt) ─────
const SEG_TABS = ['Dashboard', 'Holdings', 'Dividends', 'Performance', 'Diversification'];
function SegTop({ active = 'Dashboard', onPick }) {
  return (
    <div className="segtop">
      {SEG_TABS.map((s) => (
        <div key={s} className={'seg' + (active === s ? ' is-active' : '')} onClick={() => onPick?.(s)}>{s}</div>
      ))}
    </div>
  );
}

// ───── drawer (hamburger overflow) ─────
const DRAWER_GROUPS = [
  {
    h: 'Premium',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'holdings',  label: 'Holdings',  icon: 'holdings' },
      { id: 'dividends', label: 'Dividends', icon: 'dividends' },
      { id: 'perf',      label: 'Performance', icon: 'perf' },
      { id: 'div',       label: 'Diversification', icon: 'diversification' },
    ],
  },
  {
    h: 'Elite',
    items: [
      { id: 'tax',    label: 'Tax',    icon: 'tax' },
      { id: 'alerts', label: 'Alerts', icon: 'alerts' },
    ],
  },
  {
    h: 'Account',
    items: [
      { id: 'portfolios', label: 'Portfolios', icon: 'holdings' },
      { id: 'profile',    label: 'Profile',    icon: 'user' },
      { id: 'settings',   label: 'Settings',   icon: 'settings' },
    ],
  },
];
function Drawer({ open, onClose, active = 'dashboard' }) {
  return (
    <>
      <div className={'drawer-scrim' + (open ? ' open' : '')} onClick={onClose} />
      <div className={'drawer' + (open ? ' open' : '')}>
        <div className="brand"><span className="dot" /> Cadence</div>
        {DRAWER_GROUPS.map((g) => (
          <React.Fragment key={g.h}>
            <div className="group-h">{g.h}</div>
            {g.items.map((it) => (
              <div key={it.id} className={'navitem' + (it.id === active ? ' is-active' : '')}>
                <span className="ico"><Icon name={it.icon} size={18} /></span>
                {it.label}
              </div>
            ))}
          </React.Fragment>
        ))}
        <div className="plan-foot">
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>✦ Premium</div>
          <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>dm@cadence.io</div>
        </div>
      </div>
    </>
  );
}

// ───── stat tiles ─────
function StatGrid() {
  return (
    <div className="stat-grid cdn-anim" style={{ '--i': 1 }}>
      <div className="tile">
        <div className="l">Forward income</div>
        <div className="v"><span className="cur">€</span>{fmt(C.summary.forwardAnnualIncome)}</div>
        <div className="d">over next 12M</div>
      </div>
      <div className="tile">
        <div className="l">Forward yield</div>
        <div className="v">{C.summary.forwardYieldPct.toFixed(2)}<span className="pct">%</span></div>
        <div className="d">YoC <b style={{ color: 'var(--text)' }}>{C.summary.yieldOnCostPct.toFixed(2)}%</b></div>
      </div>
      <div className="tile">
        <div className="l">YTD income</div>
        <div className="v"><span className="cur">€</span>{fmt(C.summary.ytdReceived)}</div>
        <div className="d">Jan 2026 → today</div>
      </div>
      <div className="tile">
        <div className="l">T12M income</div>
        <div className="v"><span className="cur">€</span>{fmt(C.summary.t12mReceived)}</div>
        <div className="d">trailing 12 months</div>
      </div>
    </div>
  );
}
function StatScroll() {
  const items = [
    { l: 'Forward income', v: <><span className="cur">€</span>{fmt(C.summary.forwardAnnualIncome)}</>, d: 'over next 12M' },
    { l: 'Forward yield',  v: <>{C.summary.forwardYieldPct.toFixed(2)}<span style={{ color: 'var(--text-dim)', fontSize: 14, fontWeight: 400 }}>%</span></>, d: <>YoC <b style={{ color: 'var(--text)' }}>{C.summary.yieldOnCostPct.toFixed(2)}%</b></> },
    { l: 'YTD received',   v: <><span className="cur">€</span>{fmt(C.summary.ytdReceived)}</>, d: 'Jan 2026 → today' },
    { l: 'T12M income',    v: <><span className="cur">€</span>{fmt(C.summary.t12mReceived)}</>, d: 'trailing 12 months' },
  ];
  return (
    <div className="stat-scroll cdn-anim" style={{ '--i': 1 }}>
      {items.map((it, i) => (
        <div className="tile" key={i}>
          <div className="l">{it.l}</div>
          <div className="v">{it.v}</div>
          <div className="d">{it.d}</div>
        </div>
      ))}
    </div>
  );
}

// ───── contributors / upcoming / fire ─────
function ContributorsCard({ limit = 6 }) {
  const max = C.contributors[0].forwardAnnualLocal;
  return (
    <div className="pcard cdn-anim" style={{ '--i': 3 }}>
      <div className="pcard-h">
        <div>
          <div className="t">Top income contributors</div>
          <div className="sub">Forward 12M</div>
        </div>
        <span className="more">See all</span>
      </div>
      <div>
        {C.contributors.slice(0, limit).map((c) => {
          const w = (c.forwardAnnualLocal / max) * 100;
          return (
            <div key={c.ticker} className="listrow">
              <TickerLogo ticker={c.ticker} color={c.color} />
              <div className="body">
                <div className="t">{c.ticker} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· {c.name}</span></div>
                <div className="pbar" style={{ marginTop: 5 }}>
                  <i style={{ width: `${w}%` }} />
                </div>
              </div>
              <div className="right num">
                <div className="v">€{fmt(c.forwardAnnualLocal)}</div>
                <div className="s">{c.yieldPct.toFixed(2)}% yld</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingCard({ limit = 5 }) {
  const MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return (
    <div className="pcard cdn-anim" style={{ '--i': 4 }}>
      <div className="pcard-h">
        <div>
          <div className="t">Coming up · next {limit}</div>
          <div className="sub">Through next 60 days</div>
        </div>
        <span className="ppill">next {C.upcoming[limit - 1]?.daysUntil ?? 0}d</span>
      </div>
      {C.upcoming.slice(0, limit).map((e) => {
        const d = new Date(e.exDate);
        return (
          <div key={e.ticker} className="listrow">
            <div className="datebubble">
              <div className="d">{String(d.getDate()).padStart(2, '0')}</div>
              <div className="m">{MONTH[d.getMonth()]}</div>
            </div>
            <TickerLogo ticker={e.ticker} color={C.contributors.find(c => c.ticker === e.ticker)?.color ?? '#94a3b8'} size={28} />
            <div className="body">
              <div className="t">{e.ticker}</div>
              <div className="n">{e.name}</div>
            </div>
            <div className="right num">
              <div className="v">€{fmt(e.estimatedTotalLocal, 2)}</div>
              <div className="s">in {e.daysUntil}d{e.isProjected ? ' · est' : ''}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FireCard() {
  const pct = Math.min(100, (C.summary.forwardAnnualIncome / C.incomeTarget) * 100);
  const growth = 0.08;
  const years = Math.ceil(Math.log(C.incomeTarget / C.summary.forwardAnnualIncome) / Math.log(1 + growth));
  return (
    <div className="pcard cdn-anim" style={{ '--i': 5 }}>
      <div className="pcard-h">
        <div>
          <div className="t">Passive income progress</div>
          <div className="sub">€{(C.incomeTarget / 1000).toFixed(0)}k / yr target</div>
        </div>
        <span className="ppill">{pct.toFixed(1)}%</span>
      </div>
      <div className="num" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
        <span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 400 }}>€</span>{fmt(C.summary.forwardAnnualIncome)}
        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 400, marginLeft: 6 }}>/ €{fmt(C.incomeTarget)}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
        ~<b style={{ color: 'var(--text)' }}>{years} years</b> at 8% growth
      </div>
      <div style={{ position: 'relative', height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', marginTop: 12 }}>
        <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: 'var(--accent-soft)', borderRadius: 4, transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)' }} />
        {[0.25, 0.5, 0.75].map((p, i) => (
          <div key={i} style={{ position: 'absolute', top: -2, bottom: -2, left: `${p * 100}%`, width: 1, background: 'var(--surface)' }} />
        ))}
      </div>
      <div className="num" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 9.5, color: 'var(--text-dim)', fontWeight: 500 }}>
        <span>€0</span><span>€7.5k</span><span>€15k</span><span>€22.5k</span><span>€30k</span>
      </div>
    </div>
  );
}

// ───── hero treatments ─────
function HeroDefault() {
  const { whole, frac } = splitEuro(C.summary.totalValue);
  return (
    <div className="hero cdn-anim" style={{ '--i': 0 }}>
      <div className="eyebrow">Your portfolio · {C.todayLabel}</div>
      <h1>
        <span className="cur">€</span>{whole}<span className="frac">.{frac}</span>
      </h1>
      <div className="sub">
        Up <span className="up">€{fmt(C.summary.unrealizedPL)} (+{C.summary.unrealizedPLPct.toFixed(2)}%)</span> since you started · <b>{C.summary.positionsCount} stocks</b> across <b>{C.summary.countriesCount} countries</b> paying <b>€{fmt(C.summary.forwardAnnualIncome)}</b>/yr forward.
      </div>
    </div>
  );
}
function HeroBig() {
  const { whole, frac } = splitEuro(C.summary.totalValue);
  return (
    <div className="hero big center cdn-anim" style={{ '--i': 0 }}>
      <div className="eyebrow">Total value · {C.todayLabel}</div>
      <h1>
        <span className="cur">€</span>{whole}<span className="frac">.{frac}</span>
      </h1>
      <div style={{ marginTop: 12, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        <span className="ppill up">▲ €{fmt(C.summary.todayDeltaAbs, 2)} · +{C.summary.todayDeltaPct}%</span>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>today</span>
      </div>
      <div className="sub" style={{ marginTop: 14 }}>
        <b>€{fmt(C.summary.forwardAnnualIncome)}</b>/yr forward · <b>{C.summary.positionsCount}</b> positions
      </div>
    </div>
  );
}
function HeroChart() {
  const { whole, frac } = splitEuro(C.summary.totalValue);
  return (
    <div className="cdn-anim" style={{ '--i': 0, padding: '0 0 4px' }}>
      <div style={{
        position: 'relative',
        margin: '4px var(--pad) 0',
        padding: '16px 16px 12px',
        borderRadius: 18,
        background: 'linear-gradient(180deg, oklch(0.97 0.015 175) 0%, var(--surface) 100%)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Income rhythm · 12M past + 6M ahead</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            <span style={{ fontSize: 18, color: 'var(--text-dim)', fontWeight: 400 }}>€</span>{whole}<span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>.{frac}</span>
          </div>
        </div>
        <div className="num" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          <span style={{ color: 'var(--up)', fontWeight: 600 }}>+€{fmt(C.summary.unrealizedPL)} ({C.summary.unrealizedPLPct.toFixed(2)}%)</span> since start · paying <b style={{ color: 'var(--text)' }}>€{fmt(C.summary.forwardAnnualIncome)}</b>/yr
        </div>
        <div style={{ marginTop: 14 }}>
          <RhythmChart height={88} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 8, fontSize: 10, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums',
        }}>
          <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--text)', opacity: 0.86 }} /> received
          </span>
          <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, border: '1px dashed var(--border-strong)' }} /> projected
          </span>
        </div>
      </div>
    </div>
  );
}
function HeroSummary() {
  const { whole, frac } = splitEuro(C.summary.totalValue);
  const pct = Math.min(100, (C.summary.forwardAnnualIncome / C.incomeTarget) * 100);
  return (
    <div className="cdn-anim" style={{ '--i': 0, margin: '8px var(--pad) 0' }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Portfolio · {C.todayLabel}</div>
            <div className="num" style={{ marginTop: 4, fontSize: 34, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1 }}>
              <span style={{ fontSize: 18, color: 'var(--text-dim)', fontWeight: 400 }}>€</span>{whole}<span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>.{frac}</span>
            </div>
            <div className="num" style={{ marginTop: 6, fontSize: 12 }}>
              <span style={{ color: 'var(--up)', fontWeight: 600 }}>+€{fmt(C.summary.unrealizedPL)} ({C.summary.unrealizedPLPct.toFixed(2)}%)</span>
              <span style={{ color: 'var(--text-muted)' }}> since start</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Sparkline values={C.rhythm.slice(0, C.nowIndex + 1).map((m) => m.received)} width={84} height={34} />
            <div style={{ fontSize: 9.5, color: 'var(--text-dim)', marginTop: 2, letterSpacing: '0.04em' }}>12M INCOME</div>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '14px -16px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 500 }}>FORWARD INCOME</div>
            <div className="num" style={{ fontSize: 19, fontWeight: 600, marginTop: 2, letterSpacing: '-0.02em' }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 400 }}>€</span>{fmt(C.summary.forwardAnnualIncome)}
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 400, marginLeft: 4 }}>/yr</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{C.summary.forwardYieldPct.toFixed(2)}% fwd yld · YoC {C.summary.yieldOnCostPct.toFixed(2)}%</div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 500 }}>YTD RECEIVED</div>
            <div className="num" style={{ fontSize: 19, fontWeight: 600, marginTop: 2, letterSpacing: '-0.02em' }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 400 }}>€</span>{fmt(C.summary.ytdReceived)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>T12M €{fmt(C.summary.t12mReceived)}</div>
          </div>
        </div>

        <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>FIRE PROGRESS</div>
            <div className="num" style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>{pct.toFixed(1)}%</div>
          </div>
          <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', marginTop: 5 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-soft)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VARIANTS ───────────────────────────────────────────────

function V1Standard({ navPattern, density, hero }) {
  const [drawer, setDrawer] = useState(false);
  const HeroComp = pickHero(hero);
  return (
    <div className="mob" data-density={density}>
      <TopBar onMenu={() => setDrawer(true)} />
      <div className="scroll">
        <HeroComp />
        {hero !== 'summary' && <StatGrid />}
        {hero !== 'chart' && (
          <div className="pcard cdn-anim" style={{ '--i': 2 }}>
            <div className="pcard-h">
              <div>
                <div className="t">Income rhythm</div>
                <div className="sub">Received + expected</div>
              </div>
              <span className="ppill live">live</span>
            </div>
            <RhythmChart />
          </div>
        )}
        <ContributorsCard limit={4} />
        <UpcomingCard limit={4} />
        <FireCard />
        <div style={{ height: 24 }} />
      </div>
      {navPattern === 'segmented' ? (
        <SegBottomPlaceholder /> 
      ) : (
        <TabBar onMore={() => setDrawer(true)} />
      )}
      <Drawer open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}

function V2BigNumber({ navPattern, density, hero }) {
  const [drawer, setDrawer] = useState(false);
  const HeroComp = pickHero(hero || 'big');
  return (
    <div className="mob" data-density={density}>
      <TopBar onMenu={() => setDrawer(true)} dense />
      <div className="scroll">
        <HeroComp />
        <StatScroll />
        <div className="pcard cdn-anim" style={{ '--i': 2 }}>
          <div className="pcard-h">
            <div>
              <div className="t">Income rhythm</div>
              <div className="sub">Past 12 months · next 6 projected</div>
            </div>
          </div>
          <RhythmChart height={100} />
        </div>
        <ContributorsCard limit={4} />
        <UpcomingCard limit={3} />
        <FireCard />
        <div style={{ height: 24 }} />
      </div>
      {navPattern === 'segmented'
        ? <div style={{ paddingBottom: 8 }}><SegTop /></div>
        : <TabBar onMore={() => setDrawer(true)} />
      }
      <Drawer open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}

function V3ChartFirst({ navPattern, density, hero }) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="mob" data-density={density}>
      <TopBar onMenu={() => setDrawer(true)} />
      <div className="scroll">
        <HeroChart />
        <StatGrid />
        <ContributorsCard limit={4} />
        <UpcomingCard limit={4} />
        <FireCard />
        <div style={{ height: 24 }} />
      </div>
      {navPattern === 'segmented'
        ? <SegBottomPlaceholder />
        : <TabBar onMore={() => setDrawer(true)} />
      }
      <Drawer open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}

function V4Summary({ navPattern, density, hero }) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="mob" data-density={density}>
      <TopBar onMenu={() => setDrawer(true)} dense />
      {navPattern === 'segmented' && <SegTop />}
      <div className="scroll">
        <HeroSummary />
        <div className="pcard cdn-anim" style={{ '--i': 2 }}>
          <div className="pcard-h">
            <div>
              <div className="t">Income rhythm</div>
              <div className="sub">Hover any month for breakdown</div>
            </div>
            <span className="ppill">12M+6M</span>
          </div>
          <RhythmChart />
        </div>
        <ContributorsCard limit={5} />
        <UpcomingCard limit={4} />
        <div style={{ height: 24 }} />
      </div>
      {navPattern !== 'segmented' && <TabBar onMore={() => setDrawer(true)} />}
      <Drawer open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}

function V5TodayFeed({ navPattern, density }) {
  const [drawer, setDrawer] = useState(false);
  const { whole, frac } = splitEuro(C.summary.totalValue);
  const pct = Math.min(100, (C.summary.forwardAnnualIncome / C.incomeTarget) * 100);
  const sparkValues = C.rhythm.slice(0, C.nowIndex + 1).map((m) => m.received);

  return (
    <div className="mob" data-density={density}>
      {/* Today-style header */}
      <div style={{ padding: '8px var(--pad) 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {C.todayLabel}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', marginTop: 2 }}>
            Today
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="icon-btn no-bg" onClick={() => setDrawer(true)} aria-label="Menu">
            <Icon name="menu" size={20} />
          </button>
          <div className="avatar">DM</div>
        </div>
      </div>

      <div className="scroll" style={{ paddingTop: 6 }}>
        {/* Hero portfolio card (full-bleed feel) */}
        <div className="cdn-anim" style={{ '--i': 0, margin: '4px var(--pad) 12px', borderRadius: 22, overflow: 'hidden',
            background: 'linear-gradient(165deg, oklch(0.22 0.03 175) 0%, oklch(0.16 0.02 200) 100%)',
            color: '#fff', padding: 18, position: 'relative',
        }}>
          <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 500 }}>PORTFOLIO VALUE</div>
          <div className="num" style={{ marginTop: 4, fontSize: 42, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1 }}>
            <span style={{ fontSize: 22, opacity: 0.7, fontWeight: 400, verticalAlign: 'top' }}>€</span>{whole}<span style={{ opacity: 0.55, fontWeight: 400 }}>.{frac}</span>
          </div>
          <div className="num" style={{ marginTop: 8, fontSize: 12 }}>
            <span style={{ color: '#7ee0b8', fontWeight: 600 }}>▲ €{fmt(C.summary.todayDeltaAbs, 2)} · +{C.summary.todayDeltaPct}%</span>
            <span style={{ opacity: 0.5 }}> today</span>
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 9.5, opacity: 0.55, letterSpacing: '0.04em' }}>FWD INCOME</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>€{fmt(C.summary.forwardAnnualIncome)}/yr</div>
            </div>
            <div>
              <div style={{ fontSize: 9.5, opacity: 0.55, letterSpacing: '0.04em' }}>FWD YIELD</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{C.summary.forwardYieldPct.toFixed(2)}%</div>
            </div>
            <div>
              <div style={{ fontSize: 9.5, opacity: 0.55, letterSpacing: '0.04em' }}>POSITIONS</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{C.summary.positionsCount}</div>
            </div>
          </div>
        </div>

        {/* Story card — coming up THIS WEEK */}
        <div className="pcard cdn-anim" style={{ '--i': 1 }}>
          <div className="pcard-h">
            <div>
              <div className="t">Hitting your account this week</div>
              <div className="sub">2 dividends · €{fmt(C.upcoming.slice(0, 2).reduce((s, e) => s + e.estimatedTotalLocal, 0), 2)}</div>
            </div>
          </div>
          {C.upcoming.slice(0, 2).map((e) => {
            const d = new Date(e.exDate);
            const MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return (
              <div key={e.ticker} className="listrow">
                <div className="datebubble">
                  <div className="d">{String(d.getDate()).padStart(2, '0')}</div>
                  <div className="m">{MONTH[d.getMonth()]}</div>
                </div>
                <TickerLogo ticker={e.ticker} color={C.contributors.find(c => c.ticker === e.ticker)?.color ?? '#94a3b8'} size={28} />
                <div className="body">
                  <div className="t">{e.ticker}</div>
                  <div className="n">in {e.daysUntil} days</div>
                </div>
                <div className="right num">
                  <div className="v">€{fmt(e.estimatedTotalLocal, 2)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top mover spotlight */}
        <div className="pcard cdn-anim" style={{ '--i': 2 }}>
          <div className="pcard-h">
            <div>
              <div className="t">Top mover today</div>
              <div className="sub">From your holdings</div>
            </div>
            <span className="ppill up">+{C.movers[0].changePct.toFixed(2)}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <TickerLogo ticker={C.movers[0].ticker} color={C.movers[0].color} size={44} radius={11} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{C.movers[0].ticker} <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 12 }}>· {C.movers[0].name}</span></div>
              <div className="num" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>$ {C.movers[0].price.toFixed(2)} · 612 shares</div>
            </div>
            <Sparkline values={[50, 49.2, 49.7, 50.4, 51.1, 50.6, 51.4, 51.82]} stroke="var(--up)" width={64} height={28} />
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            {C.movers.slice(1).map((m) => (
              <div key={m.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <TickerLogo ticker={m.ticker} color={m.color} size={22} radius={6} />
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{m.ticker}</div>
                </div>
                <div className="num" style={{ fontSize: 12, fontWeight: 600, color: m.changePct >= 0 ? 'var(--up)' : 'var(--down)' }}>
                  {m.changePct >= 0 ? '+' : ''}{m.changePct.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Income rhythm */}
        <div className="pcard cdn-anim" style={{ '--i': 3 }}>
          <div className="pcard-h">
            <div>
              <div className="t">Your income rhythm</div>
              <div className="sub">May · €{fmt(C.rhythm[C.nowIndex].received)} so far</div>
            </div>
          </div>
          <RhythmChart height={80} />
        </div>

        {/* FIRE ring */}
        <div className="pcard cdn-anim" style={{ '--i': 4 }}>
          <div className="pcard-h">
            <div>
              <div className="t">Steps to financial independence</div>
              <div className="sub">€{(C.incomeTarget / 1000).toFixed(0)}k / yr · 8% growth</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <FireRing pct={pct} />
            <div style={{ flex: 1 }}>
              <div className="num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
                €{fmt(C.summary.forwardAnnualIncome)}
                <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 400, marginLeft: 4 }}>/ €{fmt(C.incomeTarget)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                You're <b style={{ color: 'var(--text)' }}>{pct.toFixed(1)}%</b> of the way.
                At 8% growth, you'll hit it in <b style={{ color: 'var(--text)' }}>~{Math.ceil(Math.log(C.incomeTarget / C.summary.forwardAnnualIncome) / Math.log(1.08))} yrs</b>.
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 24 }} />
      </div>

      {navPattern === 'segmented'
        ? <SegBottomPlaceholder />
        : <TabBar onMore={() => setDrawer(true)} />
      }
      <Drawer open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}

// ring widget for V5
function FireRing({ pct, size = 78 }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke="var(--accent-soft)" strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x="50%" y="51%" textAnchor="middle" dominantBaseline="middle"
        fontSize="15" fontWeight="600" fontFamily="var(--font-sans)"
        style={{ fontVariantNumeric: 'tabular-nums' }}>
        {pct.toFixed(0)}%
      </text>
    </svg>
  );
}

// segmented bottom placeholder — for the alt nav pattern,
// when segmented top is on we omit the bottom tab bar entirely
// (and add a floating + action so add-holding stays reachable).
function SegBottomPlaceholder() {
  return (
    <div style={{
      position: 'absolute', right: 16, bottom: 22, zIndex: 5,
    }}>
      <button style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
        border: 0, cursor: 'pointer',
        boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }} aria-label="Add holding">
        <Icon name="plus" size={22} />
      </button>
    </div>
  );
}

function pickHero(hero) {
  switch (hero) {
    case 'big':     return HeroBig;
    case 'chart':   return HeroChart;
    case 'summary': return HeroSummary;
    default:        return HeroDefault;
  }
}

// V4 forces summary hero regardless. Make the variant export know its
// "preferred" hero so the tweak can override on the others.
function MobileVariant({ variant, density, navPattern, hero }) {
  switch (variant) {
    case 'v1': return <V1Standard   density={density} navPattern={navPattern} hero={hero} />;
    case 'v2': return <V2BigNumber  density={density} navPattern={navPattern} hero={hero || 'big'} />;
    case 'v3': return <V3ChartFirst density={density} navPattern={navPattern} hero={hero || 'chart'} />;
    case 'v4': return <V4Summary    density={density} navPattern={navPattern} hero={hero || 'summary'} />;
    case 'v5': return <V5TodayFeed  density={density} navPattern={navPattern} />;
    default:   return <V1Standard   density={density} navPattern={navPattern} hero={hero} />;
  }
}

Object.assign(window, {
  MobileVariant,
  TickerLogo, RhythmChart, Sparkline, Icon,
  StatGrid, StatScroll, ContributorsCard, UpcomingCard, FireCard,
  TopBar, TabBar, SegTop, Drawer,
  HeroDefault, HeroBig, HeroChart, HeroSummary, FireRing,
  fmt, splitEuro,
  ICON_NAMES: Object.keys(ICON),
});

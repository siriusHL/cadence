// Free tier mobile pages — Home / Coming up / Your stocks / Your year
// Bottom tabs reflect Free-tier nav (Home / Next / Stocks / Year / More).

const { useState: useStateF } = React;
const DF = window.Cadence;

const FREE_TABS = [
  { id: 'home',    label: 'Home',     icon: 'dashboard' },
  { id: 'next',    label: 'Coming up', icon: 'dividends' },
  { id: 'stocks',  label: 'Stocks',   icon: 'holdings' },
  { id: 'year',    label: 'Year',     icon: 'perf' },
  { id: 'more',    label: 'More',     icon: 'more' },
];

function FreeTabBar({ active, onPick }) {
  return (
    <div className="tabbar">
      {FREE_TABS.map((t) => (
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

function FreeShell({ activeTab, density, navPattern, children }) {
  const [drawer, setDrawer] = useStateF(false);
  return (
    <div className="mob v2b" data-density={density}>
      <window.TopBar onMenu={() => setDrawer(true)} dense />
      <div className="scroll">{children}</div>
      {navPattern === 'segmented'
        ? <window.SegBottomPlaceholder />
        : <FreeTabBar active={activeTab} onPick={(id) => { if (id === 'more') setDrawer(true); }} />
      }
      <window.Drawer open={drawer} onClose={() => setDrawer(false)} active={activeTab} />
    </div>
  );
}

const fmtF = (n, d = 0) => window.fmt(n, d);

// Upsell strip (shared)
function UpsellStrip({ h, p }) {
  return (
    <div className="pcard cdn-anim" style={{ '--i': 6, background: 'linear-gradient(135deg, oklch(0.22 0.03 175) 0%, oklch(0.16 0.02 200) 100%)', color: '#fff', border: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1px solid rgba(255,255,255,0.18)' }}>✦</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{h}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, lineHeight: 1.45 }}>{p}</div>
        </div>
        <a href="Public.html#upgrade" style={{
          padding: '7px 14px', background: '#fff', color: '#1d1d1f',
          borderRadius: 999, fontSize: 11, fontWeight: 600, textDecoration: 'none',
          flexShrink: 0,
        }}>Upgrade</a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Home
// ─────────────────────────────────────────────────────────────────────
function FreeHomePage({ density, navPattern }) {
  const thisMonth = 558;
  const lastMonth = 480;
  const delta = thisMonth - lastMonth;
  const ytdReceived = 2940;
  const fwdAnnual = 5847;
  const next = DF.upcoming[0];
  const totalValue = 184732;

  const fixed = thisMonth.toFixed(2);
  const [whole, cents] = fixed.split('.');

  return (
    <FreeShell activeTab="home" density={density} navPattern={navPattern}>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 }}>
        <div className="eyebrow">This month, May 2026</div>
        <h1>
          <span className="cur">€</span>{Number(whole).toLocaleString('en-IE')}<span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>.{cents}</span>
        </h1>
        <div className="sub">
          Your stocks paid you in dividends.<br/>
          That's <b style={{ color: 'var(--up-fg)' }}>€{fmtF(delta)} more</b> than last month.
        </div>
      </div>

      {/* Paired stat: this year / looking ahead */}
      <div className="stat-paired cdn-anim" style={{ '--i': 1 }}>
        <div className="pcard-mini">
          <div className="ph">This year so far</div>
          <div className="paired-vals">
            <span className="num a">€{fmtF(ytdReceived)}</span>
            <span className="sep">:</span>
            <span className="num b">€{fmtF(fwdAnnual)}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: '50%' }} />
            <div className="b" style={{ width: '50%' }} />
          </div>
          <div className="paired-foot">
            <span>Received YTD</span>
            <span>Next 12 months</span>
          </div>
        </div>
        <div className="pcard-mini">
          <div className="ph">Next payment</div>
          <div className="stacked-rows">
            <div className="srow"><span className="name">Ticker</span><span className="val">{next.ticker}</span></div>
            <div className="srow"><span className="name">Amount</span><span className="val">€{fmtF(next.estimatedTotalLocal, 2)}</span></div>
            <div className="srow"><span className="name">When</span><span className="val">in {next.daysUntil}d</span></div>
          </div>
        </div>
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 2 }}>
        <div className="pcard-h">
          <div className="t">Your holdings</div>
          <a href="#" className="more" style={{ textDecoration: 'none' }}>See all →</a>
        </div>
        <div>
          {DF.holdings.slice(0, 6).map((h) => {
            const monthly = ((h.fwdDivLocal ?? 0) * h.qty) / 12;
            const value = h.price * h.qty;
            return (
              <div className="lr" key={h.ticker}>
                <div className="logo" style={{ background: h.color, width: 32, height: 32, fontSize: 12 }}>{h.ticker.slice(0, 1)}</div>
                <div className="body">
                  <div className="tk">{h.ticker}</div>
                  <div className="nm">{h.qty} sh · {h.name}</div>
                </div>
                <div className="right">
                  <div className="v">€{fmtF(Math.round(value))}</div>
                  <div className="s">€{fmtF(Math.round(monthly))}/mo</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <UpsellStrip
        h="See further ahead with Premium"
        p="Forecast 12 months of income, simulate dividend reinvestment, and track your passive-income goal."
      />
      <div style={{ height: 80 }} />
    </FreeShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Coming up
// ─────────────────────────────────────────────────────────────────────
function FreeNextPage({ density, navPattern }) {
  const next = DF.upcoming[0];
  const more = DF.upcoming.slice(1, 8);

  return (
    <FreeShell activeTab="next" density={density} navPattern={navPattern}>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 }}>
        <div className="eyebrow">Coming up</div>
        <h1>
          <span style={{ color: 'var(--accent-soft)' }}>{next.ticker}</span>
          <span style={{ fontSize: '0.42em', fontWeight: 400, color: 'var(--text-dim)', marginLeft: 10 }}>pays you in</span>
        </h1>
        <div style={{ marginTop: 14, fontSize: 36, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text)' }}>
          {next.daysUntil} <span style={{ fontSize: 18, color: 'var(--text-dim)', fontWeight: 400 }}>days</span>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          marginTop: 18, padding: '10px 16px',
          background: 'var(--surface)', borderRadius: 999,
          border: '1px solid var(--border)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.04)',
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: DF.contributors.find(c=>c.ticker===next.ticker)?.color || '#94a3b8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{next.ticker.slice(0,1)}</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{next.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{next.isProjected ? 'Projected · not yet declared' : 'Dividend payment'}</div>
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>€{fmtF(next.estimatedTotalLocal, 2)}</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>arriving Jun 3</div>
          </div>
        </div>
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 1 }}>
        <div className="pcard-h">
          <div className="t">More on the way</div>
          <span className="more">{more.length} payments</span>
        </div>
        <div>
          {more.map((p) => {
            const color = DF.contributors.find((c) => c.ticker === p.ticker)?.color ?? '#94a3b8';
            const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const d = new Date(p.exDate);
            return (
              <div className="lr" key={p.ticker + p.exDate}>
                <div className="cal">
                  <div className="d">{String(d.getDate()).padStart(2, '0')}</div>
                  <div className="m">{M[d.getMonth()]}</div>
                </div>
                <div className="logo" style={{ background: color, width: 30, height: 30, fontSize: 12 }}>{p.ticker.slice(0,1)}</div>
                <div className="body">
                  <div className="tk">{p.ticker} {p.isProjected && <span style={{ fontSize: 9, padding: '1px 5px', background: 'var(--surface-2)', color: 'var(--text-muted)', borderRadius: 4, marginLeft: 4, verticalAlign: 'middle' }}>EST</span>}</div>
                  <div className="nm">in {p.daysUntil} days</div>
                </div>
                <div className="right">
                  <div className="v">€{fmtF(p.estimatedTotalLocal, 2)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <UpsellStrip
        h="See your full payment calendar"
        p="Premium shows every payment for 12 months and reminds you 3 days before each one."
      />
      <div style={{ height: 80 }} />
    </FreeShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Your stocks
// ─────────────────────────────────────────────────────────────────────
function safetyForYield(p) {
  if (p == null) return { label: 'New', cls: '' };
  if (p < 3) return { label: 'Very safe', cls: 'safe' };
  if (p < 5) return { label: 'Safe', cls: 'safe' };
  if (p < 7) return { label: 'OK', cls: '' };
  return { label: 'Watch', cls: 'watch' };
}

function FreeStocksPage({ density, navPattern }) {
  const totalValue = DF.holdings.reduce((s, h) => s + h.price * h.qty, 0);
  const totalMonthly = DF.holdings.reduce((s, h) => s + ((h.fwdDivLocal ?? 0) * h.qty) / 12, 0);

  return (
    <FreeShell activeTab="stocks" density={density} navPattern={navPattern}>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0, paddingTop: 32 }}>
        <div className="eyebrow">Your stocks</div>
        <h1>{DF.holdings.length} <span className="light">dividend stocks</span></h1>
        <div className="sub">
          Worth <b>€{fmtF(Math.round(totalValue))}</b>, paying you{' '}
          <b>€{fmtF(Math.round(totalMonthly))} every month</b>.
        </div>
      </div>

      {/* Stocks grid — 2 columns of cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '12px var(--pad) 0' }} className="cdn-anim">
        {DF.holdings.slice(0, 8).map((h) => {
          const monthly = ((h.fwdDivLocal ?? 0) * h.qty) / 12;
          const value = h.price * h.qty;
          const sym = h.currency === 'EUR' ? '€' : h.currency === 'USD' ? '$' : h.currency === 'GBP' ? '£' : h.currency === 'CAD' ? 'C$' : '';
          const safety = safetyForYield(h.fwdYieldPct);
          return (
            <div key={h.ticker} style={{
              background: 'var(--surface)', borderRadius: 14,
              border: '1px solid var(--border)',
              padding: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: h.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{h.ticker.slice(0,1)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{h.ticker}</div>
                </div>
                {safety.label !== 'New' && (
                  <span style={{ fontSize: 8.5, padding: '1px 5px', borderRadius: 999, background: safety.cls === 'safe' ? 'var(--up-bg)' : 'var(--surface-2)', color: safety.cls === 'safe' ? 'var(--up-fg)' : 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>{safety.label}</span>
                )}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-dim)', marginBottom: 2 }}>Pays you</div>
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {sym}{fmtF(monthly)}
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 400 }}> /mo</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                {sym}{fmtF((h.fwdDivLocal ?? 0) * h.qty)}/yr
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4,
                paddingTop: 8, marginTop: 8, borderTop: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: 8.5, color: 'var(--text-dim)' }}>Shares</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 1 }}>{h.qty}</div>
                </div>
                <div>
                  <div style={{ fontSize: 8.5, color: 'var(--text-dim)' }}>Value</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 1 }}>{sym}{fmtF(Math.round(value / 1000))}k</div>
                </div>
                <div>
                  <div style={{ fontSize: 8.5, color: 'var(--text-dim)' }}>Yield</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 1 }}>{h.fwdYieldPct.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {DF.holdings.length > 8 && (
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', padding: 12 }}>
          Showing 8 of {DF.holdings.length} · See all →
        </div>
      )}

      <UpsellStrip
        h="Unlock deeper research"
        p="Premium shows safety scores, dividend history, payout ratios, and analyst views for every stock."
      />
      <div style={{ height: 80 }} />
    </FreeShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Your year
// ─────────────────────────────────────────────────────────────────────
function FreeYearPage({ density, navPattern }) {
  const months = DF.rhythm.slice(0, 12);
  const receivedSoFar = months.slice(0, DF.nowIndex + 1).reduce((s, m) => s + m.received, 0);
  const fullYear = months.reduce((s, m) => s + Math.max(m.received, m.projected || 0), 0);
  const expectedRemaining = Math.max(0, fullYear - receivedSoFar);
  const dailyAvg = receivedSoFar / 146;

  let biggest = -1; let biggestVal = 0;
  months.forEach((m, i) => { const v = Math.max(m.received, m.projected || 0); if (v > biggestVal) { biggestVal = v; biggest = i; } });
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <FreeShell activeTab="year" density={density} navPattern={navPattern}>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 }}>
        <div className="eyebrow">Your 2026 so far</div>
        <h1><span className="cur">€</span>{fmtF(Math.round(receivedSoFar))}</h1>
        <div className="sub">
          in dividends, just from your stocks.<br/>
          That's like <b>€{dailyAvg.toFixed(2)} every day</b>, on autopilot.
        </div>
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 1 }}>
        <div className="pcard-h">
          <div className="t">Income by month</div>
          <span className="more">2026</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10, marginTop: -8 }}>
          Solid blocks are received. Faded blocks are expected.
        </div>
        <window.RhythmChart months={months} nowIndex={DF.nowIndex} height={130} />
      </div>

      <div className="stat-paired cdn-anim" style={{ '--i': 2 }}>
        <div className="pcard-mini">
          <div className="ph">Year total</div>
          <div className="paired-vals">
            <span className="num a">€{fmtF(Math.round(receivedSoFar))}</span>
            <span className="sep">:</span>
            <span className="num b">€{fmtF(Math.round(expectedRemaining))}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: `${(receivedSoFar / fullYear) * 100}%` }} />
            <div className="b" style={{ width: `${(expectedRemaining / fullYear) * 100}%` }} />
          </div>
          <div className="paired-foot">
            <span>Received</span>
            <span>Expected</span>
          </div>
        </div>
        <div className="pcard-mini">
          <div className="ph">Highlights</div>
          <div className="stacked-rows">
            <div className="srow"><span className="name">Biggest month</span><span className="val">{M[biggest]}</span></div>
            <div className="srow"><span className="name">Active months</span><span className="val">{months.filter((m) => m.received > 0).length}</span></div>
            <div className="srow"><span className="name">Daily avg</span><span className="val">€{dailyAvg.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      <UpsellStrip
        h="See 5, 10, 25 years ahead"
        p="Premium projects how dividend income compounds with reinvestment, contributions, and growth."
      />
      <div style={{ height: 80 }} />
    </FreeShell>
  );
}

Object.assign(window, { FreeHomePage, FreeNextPage, FreeStocksPage, FreeYearPage, FreeShell, FreeTabBar });

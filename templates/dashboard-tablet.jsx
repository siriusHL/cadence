// Tablet (iPad portrait ~820×1180) dashboard — matches desktop layout density
// with a left sidebar that subsumes the full nav (no hamburger needed).

const C2 = window.Cadence;

function TabletDashboard({ density = 'regular', accent }) {
  const { whole, frac } = window.splitEuro(C2.summary.totalValue);
  const pct = Math.min(100, (C2.summary.forwardAnnualIncome / C2.incomeTarget) * 100);
  const growth = 0.08;
  const years = Math.ceil(Math.log(C2.incomeTarget / C2.summary.forwardAnnualIncome) / Math.log(1 + growth));
  const maxContrib = C2.contributors[0].forwardAnnualLocal;

  return (
    <div className="tab cdn-pro-scope" data-density={density}>
      {/* Sidebar */}
      <div className="sidebar">
        <div className="brand"><span className="dot" /> Cadence</div>

        <div className="group-h">Free</div>
        <div className="navitem"><span className="ico"><window.Icon name="dashboard" size={16} /></span>Home</div>
        <div className="navitem"><span className="ico"><window.Icon name="dividends" size={16} /></span>Coming up</div>
        <div className="navitem"><span className="ico"><window.Icon name="holdings" size={16} /></span>Your stocks</div>
        <div className="navitem"><span className="ico"><window.Icon name="perf" size={16} /></span>Your year</div>

        <div className="group-h">Premium</div>
        <div className="navitem is-active"><span className="ico"><window.Icon name="dashboard" size={16} /></span>Dashboard</div>
        <div className="navitem"><span className="ico"><window.Icon name="holdings" size={16} /></span>Holdings</div>
        <div className="navitem"><span className="ico"><window.Icon name="dividends" size={16} /></span>Dividends</div>
        <div className="navitem"><span className="ico"><window.Icon name="perf" size={16} /></span>Performance</div>
        <div className="navitem"><span className="ico"><window.Icon name="diversification" size={16} /></span>Diversification</div>

        <div className="group-h">Elite</div>
        <div className="navitem"><span className="ico"><window.Icon name="tax" size={16} /></span>Tax</div>
        <div className="navitem"><span className="ico"><window.Icon name="alerts" size={16} /></span>Alerts</div>

        <div className="foot">
          <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>DM</div>
          <div className="body">
            <div>Daniel M.</div>
            <div className="e">dm@cadence.io · ✦ Premium</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="main">
        {/* Pro hero */}
        <div className="pro-hero cdn-anim" style={{ '--i': 0 }}>
          <div>
            <div className="eyebrow">Your portfolio · {C2.todayLabel}</div>
            <h1 className="num">€{whole}<span className="frac">.{frac}</span></h1>
            <div className="sub">
              Up <b style={{ color: 'var(--up)' }}>€{window.fmt(C2.summary.unrealizedPL)} (+{C2.summary.unrealizedPLPct.toFixed(2)}%)</b> since you started ·{' '}
              <b>{C2.summary.positionsCount} stocks</b> across <b>{C2.summary.countriesCount} countries</b> paying{' '}
              <b>€{window.fmt(C2.summary.forwardAnnualIncome)}</b>/year forward.
            </div>
          </div>
          <div className="right-meta">
            <span className="live">Live · synced just now</span>
            <span>{C2.summary.positionsCount} positions</span>
            <span>updated 26 May 2026, 14:32</span>
          </div>
        </div>

        {/* Stat strip */}
        <div className="hero-stats cdn-anim" style={{ '--i': 1 }}>
          <div className="tile">
            <div className="l">Forward income</div>
            <div className="v"><span className="cur">€</span>{window.fmt(C2.summary.forwardAnnualIncome)}</div>
            <div className="d">over the next 12 months</div>
          </div>
          <div className="tile">
            <div className="l">Forward yield</div>
            <div className="v">{C2.summary.forwardYieldPct.toFixed(2)}<span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 400 }}>%</span></div>
            <div className="d">YoC <b style={{ color: 'var(--text)' }}>{C2.summary.yieldOnCostPct.toFixed(2)}%</b></div>
          </div>
          <div className="tile">
            <div className="l">YTD income</div>
            <div className="v"><span className="cur">€</span>{window.fmt(C2.summary.ytdReceived)}</div>
            <div className="d">received Jan 2026 → today</div>
          </div>
          <div className="tile">
            <div className="l">T12M income</div>
            <div className="v"><span className="cur">€</span>{window.fmt(C2.summary.t12mReceived)}</div>
            <div className="d">trailing 12 months</div>
          </div>
        </div>

        {/* Rhythm */}
        <div className="pcard cdn-anim" style={{ '--i': 2, marginTop: 14 }}>
          <div className="pcard-h">
            <div>
              <div className="t">Income rhythm</div>
              <div className="sub">Dividends received and expected. Hover any month for the breakdown.</div>
            </div>
            <span className="tag">12M past · 6M forward</span>
          </div>
          <div style={{ paddingTop: 4 }}>
            <window.RhythmChart height={140} />
          </div>
        </div>

        {/* 3-col */}
        <div className="row-3">
          {/* Contributors */}
          <div className="pcard cdn-anim" style={{ '--i': 3 }}>
            <div className="pcard-h">
              <div className="t">Top income contributors</div>
              <span className="tag">Forward 12M</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {C2.contributors.map((c) => {
                const w = (c.forwardAnnualLocal / maxContrib) * 100;
                return (
                  <div key={c.ticker} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <window.TickerLogo ticker={c.ticker} color={c.color} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.ticker}<span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 11 }}> · {c.name}</span>
                      </div>
                      <div style={{ marginTop: 5, height: 3, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${w}%`, height: '100%', background: 'var(--text)', opacity: 0.75 }} />
                      </div>
                    </div>
                    <div className="num" style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>€{window.fmt(c.forwardAnnualLocal)}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{c.yieldPct.toFixed(2)}% yld</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coming up */}
          <div className="pcard cdn-anim" style={{ '--i': 4 }}>
            <div className="pcard-h">
              <div className="t">Coming up · next 5</div>
              <span className="tag">next {C2.upcoming[4].daysUntil}d</span>
            </div>
            <div>
              {C2.upcoming.map((e, i) => {
                const d = new Date(e.exDate);
                const MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0',
                    borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ width: 36, textAlign: 'center' }}>
                      <div className="num" style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>{String(d.getDate()).padStart(2, '0')}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{MONTH[d.getMonth()]}</div>
                    </div>
                    <window.TickerLogo ticker={e.ticker} color={C2.contributors.find(c => c.ticker === e.ticker)?.color ?? '#94a3b8'} size={26} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{e.ticker}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                    </div>
                    <div className="num" style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>€{window.fmt(e.estimatedTotalLocal, 2)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>in {e.daysUntil}d{e.isProjected ? ' · est' : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FIRE */}
          <div className="pcard cdn-anim" style={{ '--i': 5 }}>
            <div className="pcard-h">
              <div className="t">Passive income progress</div>
              <span className="tag">€{(C2.incomeTarget / 1000).toFixed(0)}k / yr</span>
            </div>
            <div className="num" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
              <span style={{ fontSize: 15, color: 'var(--text-dim)', fontWeight: 400 }}>€</span>{window.fmt(C2.summary.forwardAnnualIncome)}
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 400, marginLeft: 6 }}>/ €{window.fmt(C2.incomeTarget)}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {pct.toFixed(1)}% of target · est. <b style={{ color: 'var(--text)' }}>~{years} years</b> at 8% growth
            </div>
            <div style={{ position: 'relative', height: 8, background: 'var(--surface-hover)', borderRadius: 4, overflow: 'hidden', marginTop: 14 }}>
              <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: 'var(--accent-soft)', borderRadius: 4 }} />
              {[0.25, 0.5, 0.75].map((p, i) => (
                <div key={i} style={{ position: 'absolute', top: -2, bottom: -2, left: `${p * 100}%`, width: 1, background: 'var(--surface)' }} />
              ))}
            </div>
            <div className="num" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10, color: 'var(--text-dim)', fontWeight: 500 }}>
              <span>€0</span><span>€7.5k</span><span>€15k</span><span>€22.5k</span><span>€30k</span>
            </div>
            <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginBottom: 2 }}>YTD received</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="num" style={{ fontSize: 17, fontWeight: 600 }}>€{window.fmt(C2.summary.ytdReceived)}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)' }}>
                  {((C2.summary.ytdReceived / C2.summary.forwardAnnualIncome) * 100).toFixed(0)}% of forward annual
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.TabletDashboard = TabletDashboard;

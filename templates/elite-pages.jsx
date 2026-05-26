// Elite tier mobile pages — Tax · Alerts
// Reuses Pro's bottom-tab pattern (Dashboard / Holdings / Dividends / Perf / More)
// since Elite users still have Pro access; Tax/Alerts live under "More".

const { useState: useStateE } = React;
const DE = window.Cadence;

function EliteShell({ activeTab, density, navPattern, children }) {
  const [drawer, setDrawer] = useStateE(false);
  return (
    <div className="mob v2b" data-density={density}>
      <window.TopBar onMenu={() => setDrawer(true)} dense />
      <div className="scroll">{children}</div>
      {navPattern === 'segmented'
        ? <window.SegBottomPlaceholder />
        : <ProTabBarE active={activeTab} onMore={() => setDrawer(true)} />
      }
      <window.Drawer open={drawer} onClose={() => setDrawer(false)} active={activeTab} />
    </div>
  );
}

function ProTabBarE({ active, onMore }) {
  const T = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'holdings',  label: 'Holdings',  icon: 'holdings' },
    { id: 'dividends', label: 'Dividends', icon: 'dividends' },
    { id: 'perf',      label: 'Perf',      icon: 'perf' },
    { id: 'more',      label: 'More',      icon: 'more' },
  ];
  return (
    <div className="tabbar">
      {T.map((t) => (
        <div key={t.id}
          className={'tab' + (active === t.id || (active === 'tax' || active === 'alerts') && t.id === 'more' ? ' is-active' : '')}
          onClick={() => t.id === 'more' && onMore?.()}>
          <span className="ico"><window.Icon name={t.icon} size={22} /></span>
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

const fmtE = (n, d = 0) => window.fmt(n, d);

// ─────────────────────────────────────────────────────────────────────
// Tax page
// ─────────────────────────────────────────────────────────────────────
function EliteTaxPage({ density, navPattern }) {
  const t = DE.tax;
  const reclaimable = t.rows.filter((r) => r.reclaimableEur > 0).sort((a, b) => b.reclaimableEur - a.reclaimableEur);

  return (
    <EliteShell activeTab="tax" density={density} navPattern={navPattern}>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 }}>
        <div className="eyebrow">Withholding · {t.fiscalYear} · {t.residenceName}</div>
        <h1 style={{ color: 'var(--up-fg)' }}>
          <span className="cur" style={{ color: 'var(--text-dim)' }}>€</span>{fmtE(t.finalNetEur)}
        </h1>
        <div className="sub">
          Gross <b>€{fmtE(t.totalGrossEur)}</b> →{' '}
          <b style={{ color: 'var(--down)' }}>−€{fmtE(t.totalWithheldEur)}</b> WH →{' '}
          <b style={{ color: 'var(--down)' }}>−€{fmtE(t.domesticTax.final)}</b> {t.residenceName} tax.
        </div>
      </div>

      {/* Paired: gross→net + reclaimable */}
      <div className="stat-paired cdn-anim" style={{ '--i': 1 }}>
        <div className="pcard-mini">
          <div className="ph">Gross vs net</div>
          <div className="paired-vals">
            <span className="num a">€{fmtE(t.totalGrossEur)}</span>
            <span className="sep">:</span>
            <span className="num b">€{fmtE(t.finalNetEur)}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: `${((t.totalGrossEur - t.finalNetEur) / t.totalGrossEur) * 100}%` }} />
            <div className="b" style={{ width: `${(t.finalNetEur / t.totalGrossEur) * 100}%` }} />
          </div>
          <div className="paired-foot">
            <span>Taxes</span>
            <span>Net to you</span>
          </div>
        </div>
        <div className="pcard-mini">
          <div className="ph">Tax stack</div>
          <div className="stacked-rows">
            <div className="srow"><span className="name">Effective</span><span className="val">{t.effectiveRatePct.toFixed(1)}%</span></div>
            <div className="srow"><span className="name">Foreign WH</span><span className="val" style={{ color: 'var(--down)' }}>€{fmtE(t.totalWithheldEur)}</span></div>
            <div className="srow"><span className="name">Reclaimable</span><span className="val" style={{ color: 'var(--up-fg)' }}>€{fmtE(t.totalReclaimableEur)}</span></div>
          </div>
        </div>
      </div>

      {/* Withholding by jurisdiction */}
      <div className="pcard cdn-anim" style={{ '--i': 2 }}>
        <div className="pcard-h">
          <div className="t">Withholding by jurisdiction</div>
          <span className="more">{t.fiscalYear}</span>
        </div>
        <table className="ptable">
          <thead>
            <tr><th>Country</th><th className="r">Gross</th><th className="r">Eff.</th><th className="r">Net</th></tr>
          </thead>
          <tbody>
            {t.rows.map((r) => (
              <tr key={r.country}>
                <td className="b">{r.country}</td>
                <td className="r b">€{fmtE(r.grossEur)}</td>
                <td className={'r ' + (r.reclaimableEur > 0 ? 'down' : 'up')}>{r.effective.toFixed(1)}%</td>
                <td className="r b up">€{fmtE(r.netEur)}</td>
              </tr>
            ))}
            <tr style={{ background: 'var(--surface-2)' }}>
              <td className="b" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>Σ totals</td>
              <td className="r b">€{fmtE(t.totalGrossEur)}</td>
              <td className="r b">{t.effectiveRatePct.toFixed(1)}%</td>
              <td className="r b up">€{fmtE(t.totalNetEur)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Domestic tax breakdown */}
      <div className="pcard cdn-anim" style={{ '--i': 3 }}>
        <div className="pcard-h">
          <div className="t">{t.residenceName} tax · {t.fiscalYear}</div>
          <span className="more">{t.domesticTax.model}</span>
        </div>
        <table className="ptable">
          <tbody>
            <tr><td className="lbl">Gross dividends</td><td className="r b">€{fmtE(t.totalGrossEur)}</td></tr>
            <tr><td className="lbl">Box 3 @ {t.domesticTax.rate}% × forfaitair</td><td className="r b">€{fmtE(t.domesticTax.final + t.domesticTax.foreignCredit)}</td></tr>
            <tr><td className="lbl" style={{ color: 'var(--up-fg)' }}>Foreign WH credit</td><td className="r b" style={{ color: 'var(--up-fg)' }}>−€{fmtE(t.domesticTax.foreignCredit)}</td></tr>
            <tr style={{ background: 'var(--surface-2)' }}><td className="b" style={{ fontSize: 12 }}>{t.residenceName} tax due</td><td className="r b" style={{ color: 'var(--down)', fontSize: 14 }}>€{fmtE(t.domesticTax.final)}</td></tr>
          </tbody>
        </table>
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'oklch(0.97 0.03 165)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Net kept after all taxes</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--up-fg)' }}>€{fmtE(t.finalNetEur)}</span>
        </div>
      </div>

      {/* Reclaim opportunities */}
      <div className="pcard cdn-anim" style={{ '--i': 4 }}>
        <div className="pcard-h">
          <div className="t">Reclaim opportunities</div>
          <span className="more">treaty vs effective</span>
        </div>
        {reclaimable.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 0' }}>You're already at treaty rates. 🎉</div>
        ) : (
          <div>
            {reclaimable.map((r) => (
              <div key={r.country} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.countryName}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--up-fg)' }}>+€{fmtE(r.reclaimableEur)}</div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                  Effective {r.effective.toFixed(1)}% · treaty {r.treaty}% · statutory {r.statutory}%
                </div>
              </div>
            ))}
            <div style={{ marginTop: 12, paddingTop: 12, fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', lineHeight: 1.5 }}>
              <b>€{fmtE(t.totalReclaimableEur)}</b> of foreign tax could be reclaimed via treaty paperwork.
            </div>
          </div>
        )}
      </div>
      <div style={{ height: 80 }} />
    </EliteShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Alerts page
// ─────────────────────────────────────────────────────────────────────
const SEV_COLOR = {
  negative: 'var(--down)',
  warning:  'oklch(0.55 0.10 75)',
  positive: 'var(--up)',
  info:     'oklch(0.55 0.08 235)',
};
const SEV_ICON = { negative: '!', warning: '⚠', positive: '↑', info: 'i' };

function EliteAlertsPage({ density, navPattern }) {
  const alerts = DE.alerts;
  const sevCounts = { negative: 0, warning: 0, positive: 0, info: 0 };
  for (const a of alerts) sevCounts[a.severity]++;
  const negative = sevCounts.negative + sevCounts.warning;
  const positive = sevCounts.positive;

  return (
    <EliteShell activeTab="alerts" density={density} navPattern={navPattern}>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 }}>
        <div className="eyebrow">Watching {DE.holdings.length} positions</div>
        <h1>
          <span style={{ color: negative > 0 ? 'var(--down)' : 'var(--text)' }}>{alerts.length}</span>{' '}
          <span className="light">alerts to review</span>
        </h1>
        <div className="sub">
          <b style={{ color: 'var(--down)' }}>{negative}</b> need action ·{' '}
          <b style={{ color: 'var(--up-fg)' }}>{positive}</b> positive
        </div>
      </div>

      <div className="stat-paired cdn-anim" style={{ '--i': 1 }}>
        <div className="pcard-mini">
          <div className="ph">Alert mix</div>
          <div className="paired-vals">
            <span className="num a" style={{ color: 'var(--down)' }}>{negative}</span>
            <span className="sep">:</span>
            <span className="num b">{positive}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: `${(negative / alerts.length) * 100}%`, background: 'var(--down)' }} />
            <div className="b" style={{ width: `${(positive / alerts.length) * 100}%` }} />
          </div>
          <div className="paired-foot">
            <span>Need action</span>
            <span>Positive</span>
          </div>
        </div>
        <div className="pcard-mini">
          <div className="ph">By severity</div>
          <div className="stacked-rows">
            <div className="srow"><span className="name">Negative</span><span className="val" style={{ color: 'var(--down)' }}>{sevCounts.negative}</span></div>
            <div className="srow"><span className="name">Warning</span><span className="val" style={{ color: 'oklch(0.55 0.10 75)' }}>{sevCounts.warning}</span></div>
            <div className="srow"><span className="name">Positive</span><span className="val" style={{ color: 'var(--up-fg)' }}>{sevCounts.positive}</span></div>
          </div>
        </div>
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 2 }}>
        <div className="pcard-h">
          <div className="t">All alerts</div>
          <span className="more">read live</span>
        </div>
        <div>
          {alerts.map((a) => (
            <div key={a.id} style={{
              display: 'flex', gap: 10, padding: '12px 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 999,
                background: SEV_COLOR[a.severity], color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>{SEV_ICON[a.severity]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                  {a.amountEur != null && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: SEV_COLOR[a.severity], flexShrink: 0 }}>€{a.amountEur}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.45 }}>{a.body}</div>
                {a.action && (
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 500, color: SEV_COLOR[a.severity] }}>
                    {a.action.label} →
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 3, background: 'var(--surface-2)', border: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <b style={{ color: 'var(--text)' }}>Thresholds:</b> ex-dates within 7 days · cuts/raises ≥5% ·
          single-position ≥10% · HHI ≥1500 · reclaimable foreign WH ≥€50 · 1-year drawdown ≤−10%.
        </div>
      </div>
      <div style={{ height: 80 }} />
    </EliteShell>
  );
}

Object.assign(window, { EliteTaxPage, EliteAlertsPage });

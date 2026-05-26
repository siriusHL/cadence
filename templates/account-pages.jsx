// Account tier mobile pages — Portfolios · Profile · Settings
// Reaches via drawer "More" → Account section. Bottom tabs reflect Pro nav
// since these are accessible from any tier; the active tab is "more".

const { useState: useStateA } = React;
const DA = window.Cadence;

function AccountShell({ activeTab, density, navPattern, children }) {
  const [drawer, setDrawer] = useStateA(false);
  return (
    <div className="mob v2b" data-density={density}>
      <window.TopBar onMenu={() => setDrawer(true)} dense />
      <div className="scroll">{children}</div>
      {navPattern === 'segmented'
        ? <window.SegBottomPlaceholder />
        : <ProTabBarA active={activeTab} onMore={() => setDrawer(true)} />
      }
      <window.Drawer open={drawer} onClose={() => setDrawer(false)} active={activeTab} />
    </div>
  );
}

function ProTabBarA({ active, onMore }) {
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
          className={'tab' + ((t.id === 'more' && ['portfolios','profile','settings'].includes(active)) || t.id === active ? ' is-active' : '')}
          onClick={() => t.id === 'more' && onMore?.()}>
          <span className="ico"><window.Icon name={t.icon} size={22} /></span>
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

const fmtA = (n, d = 0) => window.fmt(n, d);

// ─────────────────────────────────────────────────────────────────────
// Portfolios
// ─────────────────────────────────────────────────────────────────────
function AccountPortfoliosPage({ density, navPattern }) {
  const tier = DA.user.tier;
  const cap = tier === 'free' ? 1 : tier === 'premium' ? 3 : Infinity;

  return (
    <AccountShell activeTab="portfolios" density={density} navPattern={navPattern}>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 }}>
        <div className="eyebrow">Account</div>
        <h1>Portfolios</h1>
        <div className="sub">
          Group holdings into separate portfolios — retirement, taxable, watchlist,
          whatever suits how you think about your money.
        </div>
      </div>

      <div className="stat-paired cdn-anim" style={{ '--i': 1 }}>
        <div className="pcard-mini">
          <div className="ph">Usage</div>
          <div className="paired-vals">
            <span className="num a">{DA.portfolios.length}</span>
            <span className="sep">/</span>
            <span className="num b">{Number.isFinite(cap) ? cap : '∞'}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: `${(DA.portfolios.length / (Number.isFinite(cap) ? cap : DA.portfolios.length)) * 100}%` }} />
            <div className="b" style={{ width: `${100 - ((DA.portfolios.length / (Number.isFinite(cap) ? cap : DA.portfolios.length)) * 100)}%` }} />
          </div>
          <div className="paired-foot">
            <span>In use</span>
            <span>Available</span>
          </div>
        </div>
        <div className="pcard-mini">
          <div className="ph">Plan</div>
          <div className="stacked-rows">
            <div className="srow"><span className="name">Tier</span><span className="val">{DA.user.tierLabel}</span></div>
            <div className="srow"><span className="name">Cap</span><span className="val">{Number.isFinite(cap) ? `${cap} portfolios` : 'Unlimited'}</span></div>
            <div className="srow"><span className="name">Renews</span><span className="val">{new Date(DA.user.renewsOn).toLocaleDateString('en', { month: 'short', day: '2-digit' })}</span></div>
          </div>
        </div>
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 2 }}>
        <div className="pcard-h">
          <div className="t">Your portfolios</div>
          <span className="more">+ New</span>
        </div>
        <div>
          {DA.portfolios.map((p) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: p.active ? 'var(--accent-soft)' : 'var(--surface-2)',
                color: p.active ? '#fff' : 'var(--text-muted)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>{p.name.slice(0, 1)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  {p.active && <span style={{ fontSize: 9, padding: '1px 6px', background: 'var(--up-bg)', color: 'var(--up-fg)', borderRadius: 999, fontWeight: 600 }}>Active</span>}
                  {p.isDefault && <span style={{ fontSize: 9, padding: '1px 6px', background: 'var(--surface-2)', color: 'var(--text-dim)', borderRadius: 999, fontWeight: 600 }}>Default</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  {p.holdings} holdings · €{fmtA(Math.round(p.value / 1000))}k
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>€{fmtA(p.fwdIncome)}</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>/ yr fwd</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 80 }} />
    </AccountShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────────────
function AccountProfilePage({ density, navPattern }) {
  const u = DA.user;
  return (
    <AccountShell activeTab="profile" density={density} navPattern={navPattern}>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 }}>
        <div className="eyebrow">Account</div>
        <h1>Profile</h1>
        <div className="sub">
          Display name, base currency, and tax residence drive how Cadence formats
          numbers and computes your dividend tax.
        </div>
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 1 }}>
        <div className="pcard-h">
          <div className="t">Personal details</div>
          <span className="more">Edit</span>
        </div>
        <FormRow label="Display name" value={u.displayName} placeholder="Your name" />
        <FormRow label="Email" value={u.email} disabled />
        <FormRow label="Base currency" value={u.baseCurrency} select={['EUR', 'USD', 'GBP', 'CAD']} />
        <FormRow label="Tax residence" value={u.taxCountryName} select={['Netherlands', 'France', 'Germany', 'Ireland', 'Belgium']} />
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 2 }}>
        <div className="pcard-h">
          <div className="t">Subscription</div>
          <span className="more">Manage</span>
        </div>
        <div className="stacked-rows">
          <div className="srow"><span className="name">Plan</span><span className="val">{u.tierLabel}</span></div>
          <div className="srow"><span className="name">Status</span><span className="val" style={{ color: 'var(--up-fg)' }}>Active</span></div>
          <div className="srow"><span className="name">Renews</span><span className="val">{new Date(u.renewsOn).toLocaleDateString('en', { month: 'short', day: '2-digit', year: 'numeric' })}</span></div>
        </div>
      </div>
      <div style={{ height: 80 }} />
    </AccountShell>
  );
}

function FormRow({ label, value, placeholder, disabled, select }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '12px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, flexShrink: 0, width: 110 }}>{label}</div>
      <div style={{
        flex: 1,
        fontSize: 13,
        fontWeight: 500,
        textAlign: 'right',
        color: disabled ? 'var(--text-dim)' : 'var(--text)',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
      }}>
        {value || <span style={{ color: 'var(--text-dim)' }}>{placeholder}</span>}
        {select && <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-dim)' }}><path d="M7 10l5 5 5-5z"/></svg>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────
function AccountSettingsPage({ density, navPattern }) {
  const s = DA.settings;
  const [contrast, setContrast] = useStateA(s.contrast);
  const [bgTone, setBgTone] = useStateA(s.bgTone);
  const [target, setTarget] = useStateA(s.incomeTarget);

  return (
    <AccountShell activeTab="settings" density={density} navPattern={navPattern}>
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 }}>
        <div className="eyebrow">Account</div>
        <h1>Settings</h1>
        <div className="sub">
          Personal preferences for how Cadence looks and behaves on this account.
        </div>
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 1 }}>
        <div className="pcard-h">
          <div className="t">Appearance</div>
        </div>
        <FormRow label="Contrast" value={contrast.charAt(0).toUpperCase() + contrast.slice(1)} select={['Soft', 'Standard', 'Sharp']} />
        <FormRow label="Background" value={bgTone.charAt(0).toUpperCase() + bgTone.slice(1)} select={['Cream', 'Neutral', 'Cool']} />
        <SegRow label="Theme" options={[{ id: 'light', label: 'Light' }, { id: 'auto', label: 'Auto' }, { id: 'dark', label: 'Dark' }]} value="light" />
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 2 }}>
        <div className="pcard-h">
          <div className="t">Goal</div>
        </div>
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>Passive income target</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em' }}>
              <span style={{ fontSize: 16, color: 'var(--text-dim)', fontWeight: 400 }}>€</span>{fmtA(target)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>/ year</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <input
              type="range" min="5000" max="100000" step="1000" value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-soft)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
              <span>€5k</span><span>€100k</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 3 }}>
        <div className="pcard-h">
          <div className="t">Default screen</div>
        </div>
        <FormRow label="On sign-in, go to" value="Dashboard" select={['Home', 'Dashboard', 'Holdings', 'Dividends']} />
      </div>

      <div className="pcard cdn-anim" style={{ '--i': 4 }}>
        <div className="pcard-h">
          <div className="t">Sign out</div>
        </div>
        <button style={{
          width: '100%', height: 38, marginTop: 6,
          background: 'transparent',
          border: '1px solid var(--down)',
          color: 'var(--down)',
          borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>Sign out of all devices</button>
      </div>
      <div style={{ height: 80 }} />
    </AccountShell>
  );
}

function SegRow({ label, options, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '12px 0',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, flexShrink: 0 }}>{label}</div>
      <div style={{ display: 'inline-flex', padding: 3, background: 'var(--surface-2)', borderRadius: 999, gap: 2 }}>
        {options.map((o) => (
          <div key={o.id} style={{
            padding: '5px 12px', fontSize: 11, fontWeight: 500,
            color: value === o.id ? 'var(--text)' : 'var(--text-muted)',
            background: value === o.id ? 'var(--surface)' : 'transparent',
            borderRadius: 999,
            boxShadow: value === o.id ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
            cursor: 'pointer',
          }}>{o.label}</div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { AccountPortfoliosPage, AccountProfilePage, AccountSettingsPage });

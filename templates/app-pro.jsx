// App — Pro tier mobile pages on a single canvas.
//   Dashboard · Holdings · Dividends · Performance · Diversification
// Shares Tweaks (density / accent / nav) globally across all pages.

const { useEffect: useEffectPro } = React;

const TWEAK_DEFAULTS_PRO = /*EDITMODE-BEGIN*/{
  "density": "regular",
  "accent": "#3a857e",
  "navPattern": "tabs"
}/*EDITMODE-END*/;

const ACCENT_PRESETS_PRO = {
  '#3a857e': { accent: 'oklch(0.48 0.08 175)', soft: 'oklch(0.55 0.10 175)' },
  '#c97a4b': { accent: 'oklch(0.62 0.13 50)',  soft: 'oklch(0.68 0.14 55)'  },
  '#5b6cc6': { accent: 'oklch(0.55 0.12 265)', soft: 'oklch(0.62 0.13 265)' },
  '#8856a3': { accent: 'oklch(0.50 0.13 305)', soft: 'oklch(0.58 0.14 305)' },
};

const TIER_FILES = [
  { id: 'pro',     label: 'Pro',     href: 'Pro.html',     active: true },
  { id: 'free',    label: 'Free',    href: 'Free.html' },
  { id: 'elite',   label: 'Elite',   href: 'Elite.html' },
  { id: 'account', label: 'Account', href: 'Account.html' },
  { id: 'add',     label: 'Add / Edit', href: 'AddEdit.html' },
  { id: 'public',  label: 'Public',  href: 'Public.html' },
];

function TierBar() {
  return (
    <div style={{
      position: 'fixed', top: 14, left: 14, zIndex: 50,
      display: 'inline-flex', gap: 4,
      padding: 3,
      background: 'rgba(255,255,255,0.9)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 999,
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
    }}>
      {TIER_FILES.map((t) => (
        <a
          key={t.id}
          href={t.href}
          style={{
            padding: '5px 12px',
            borderRadius: 999,
            fontWeight: 500,
            color: t.active ? '#1d1d1f' : '#86868b',
            background: t.active ? '#ffffff' : 'transparent',
            boxShadow: t.active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
            textDecoration: 'none',
          }}
        >{t.label}</a>
      ))}
    </div>
  );
}

function AppPro() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS_PRO);

  useEffectPro(() => {
    const preset = ACCENT_PRESETS_PRO[t.accent] || ACCENT_PRESETS_PRO['#3a857e'];
    document.documentElement.style.setProperty('--accent', preset.accent);
    document.documentElement.style.setProperty('--accent-soft', preset.soft);
  }, [t.accent]);

  const pages = [
    { id: 'dashboard',       label: 'Dashboard',       Component: (p) => <window.V2Breathing {...p} statStyle="label-top" /> },
    { id: 'holdings',        label: 'Holdings',        Component: window.HoldingsPage },
    { id: 'dividends',       label: 'Dividends',       Component: window.DividendsPage },
    { id: 'performance',     label: 'Performance',     Component: window.PerformancePage },
    { id: 'diversification', label: 'Diversification', Component: window.DiversificationPage },
  ];

  return (
    <>
      <TierBar />
      <window.DesignCanvas defaultPan={{ x: 80, y: 80 }} defaultZoom={0.7}>
        <window.DCSection
          id="pro-tier"
          title="Cadence · Pro tier"
          subtitle="5 mobile screens · 402 × 874 · paired-card pattern, V2 chassis"
        >
          {pages.map((p) => (
            <window.DCArtboard
              key={p.id}
              id={p.id}
              label={p.label}
              width={402}
              height={874}
              style={{ background: 'var(--bg)', borderRadius: 24, overflow: 'hidden' }}
            >
              <p.Component density={t.density} navPattern={t.navPattern} />
            </window.DCArtboard>
          ))}
        </window.DCSection>
      </window.DesignCanvas>

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="Layout" />
        <window.TweakRadio
          label="Density"
          value={t.density}
          options={['compact', 'regular', 'comfy']}
          onChange={(v) => setTweak('density', v)}
        />
        <window.TweakRadio
          label="Nav pattern"
          value={t.navPattern}
          options={['tabs', 'segmented']}
          onChange={(v) => setTweak('navPattern', v)}
        />

        <window.TweakSection label="Brand" />
        <window.TweakColor
          label="Accent"
          value={t.accent}
          options={['#3a857e', '#c97a4b', '#5b6cc6', '#8856a3']}
          onChange={(v) => setTweak('accent', v)}
        />
      </window.TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppPro />);

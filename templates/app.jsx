// App.jsx — DesignCanvas wrapping 5 mobile variants + 1 tablet, plus Tweaks.

const { useEffect } = React;

const VARIANT_META = [
  { id: 'v1', label: 'V1 · Standard stack',  defaultHero: 'default' },
  { id: 'v2', label: 'V2 · Big number',      defaultHero: 'big' },
  { id: 'v3', label: 'V3 · Chart-first',     defaultHero: 'chart' },
  { id: 'v4', label: 'V4 · Summary card',    defaultHero: 'summary' },
  { id: 'v5', label: 'V5 · Today feed',      defaultHero: 'big' },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "regular",
  "accent": "#3a857e",
  "navPattern": "tabs",
  "hero": "auto"
}/*EDITMODE-END*/;

// Translate a hex accent → both accent + accent-soft oklch.
const ACCENT_PRESETS = {
  '#3a857e': { accent: 'oklch(0.48 0.08 175)', soft: 'oklch(0.55 0.10 175)' }, // teal (default)
  '#c97a4b': { accent: 'oklch(0.62 0.13 50)',  soft: 'oklch(0.68 0.14 55)'  }, // orange/sun
  '#5b6cc6': { accent: 'oklch(0.55 0.12 265)', soft: 'oklch(0.62 0.13 265)' }, // indigo
  '#8856a3': { accent: 'oklch(0.50 0.13 305)', soft: 'oklch(0.58 0.14 305)' }, // violet
};

function App() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  // apply accent to root
  useEffect(() => {
    const preset = ACCENT_PRESETS[t.accent] || ACCENT_PRESETS['#3a857e'];
    document.documentElement.style.setProperty('--accent', preset.accent);
    document.documentElement.style.setProperty('--accent-soft', preset.soft);
  }, [t.accent]);

  return (
    <>
      <window.DesignCanvas defaultPan={{ x: 80, y: 60 }} defaultZoom={0.78}>
        <window.DCSection
          id="mobile"
          title="Cadence · Mobile dashboard"
          subtitle="iPhone — 5 layout directions · /app/dashboard (Pro)"
        >
          {VARIANT_META.map((v) => {
            const hero = t.hero === 'auto' ? v.defaultHero : t.hero;
            return (
              <window.DCArtboard
                key={v.id}
                id={v.id}
                label={v.label}
                width={402}
                height={874}
              >
                <window.IOSDevice width={402} height={874} title="">
                  <window.MobileVariant
                    variant={v.id}
                    density={t.density}
                    navPattern={t.navPattern}
                    hero={t.hero === 'auto' ? null : t.hero}
                  />
                </window.IOSDevice>
              </window.DCArtboard>
            );
          })}
        </window.DCSection>

        <window.DCSection
          id="tablet"
          title="Cadence · Tablet dashboard"
          subtitle="iPad portrait · 820 × 1180"
        >
          <window.DCArtboard id="ipad" label="Tablet · expanded nav" width={820} height={1180}>
            <window.TabletDashboard density={t.density} accent={t.accent} />
          </window.DCArtboard>
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
        <window.TweakSelect
          label="Hero (override)"
          value={t.hero}
          options={['auto', 'default', 'big', 'chart', 'summary']}
          onChange={(v) => setTweak('hero', v)}
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

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// App v2 — focused, single refined V2 mobile dashboard on a canvas.

const { useEffect: useEffectV2 } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "regular",
  "accent": "#3a857e",
  "navPattern": "tabs"
}/*EDITMODE-END*/;

const ACCENT_PRESETS = {
  '#3a857e': { accent: 'oklch(0.48 0.08 175)', soft: 'oklch(0.55 0.10 175)' },
  '#c97a4b': { accent: 'oklch(0.62 0.13 50)',  soft: 'oklch(0.68 0.14 55)'  },
  '#5b6cc6': { accent: 'oklch(0.55 0.12 265)', soft: 'oklch(0.62 0.13 265)' },
  '#8856a3': { accent: 'oklch(0.50 0.13 305)', soft: 'oklch(0.58 0.14 305)' },
};

function AppV2() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  useEffectV2(() => {
    const preset = ACCENT_PRESETS[t.accent] || ACCENT_PRESETS['#3a857e'];
    document.documentElement.style.setProperty('--accent', preset.accent);
    document.documentElement.style.setProperty('--accent-soft', preset.soft);
  }, [t.accent]);

  return (
    <>
      <window.DesignCanvas defaultPan={{ x: 360, y: 60 }} defaultZoom={1}>
        <window.DCSection
          id="mobile-v2"
          title="Cadence · Mobile dashboard"
          subtitle="V2 Breathing — paired stat cards"
        >
          <window.DCArtboard id="label-top" label="V2 · Paired stats" width={402} height={874}>
            <window.IOSDevice width={402} height={874} title="">
              <window.V2Breathing
                density={t.density}
                navPattern={t.navPattern}
                statStyle="label-top"
              />
            </window.IOSDevice>
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

ReactDOM.createRoot(document.getElementById('root')).render(<AppV2 />);

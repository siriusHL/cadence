// app.jsx — wires design canvas + tweaks + all screens

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "tier": "all",
  "showNote": true,
  "blurAmounts": false
}/*EDITMODE-END*/;

// Inject blur stylesheet once. Toggled via a body-level class.
(function ensureBlurStyles() {
  if (document.getElementById("__cadence_blur_styles")) return;
  const s = document.createElement("style");
  s.id = "__cadence_blur_styles";
  s.textContent = `
    body.blur-amounts .num,
    body.blur-amounts .v,
    body.blur-amounts .big,
    body.blur-amounts .hero h1,
    body.blur-amounts .pro-hero h1,
    body.blur-amounts .tile .v,
    body.blur-amounts .pcard .num {
      filter: blur(6px);
      user-select: none;
      transition: filter .15s ease;
    }
  `;
  document.head.appendChild(s);
})();

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply blur class to body
  React.useEffect(() => {
    document.body.classList.toggle("blur-amounts", !!t.blurAmounts);
  }, [t.blurAmounts]);

  const showFree = t.tier === "all" || t.tier === "free";
  const showPro  = t.tier === "all" || t.tier === "pro";

  const W = 1280, H = 820;

  return (
    <>
      <DesignCanvas>
        {showFree && (
          <DCSection id="free" title="Free tier · for everyone" subtitle="Apple-style · big, friendly, beginner-first">
            <DCArtboard id="free-home" label="Home — Your money" width={1280} height={820}>
              <FreeHomeScreen />
            </DCArtboard>
            <DCArtboard id="free-next" label="Coming up — Next payment" width={1280} height={820}>
              <FreeNextScreen />
            </DCArtboard>
            <DCArtboard id="free-stocks" label="Your stocks" width={1280} height={820}>
              <FreeStocksScreen />
            </DCArtboard>
            <DCArtboard id="free-year" label="Your year" width={1280} height={820}>
              <FreeYearScreen />
            </DCArtboard>
          </DCSection>
        )}

        {showPro && (
          <DCSection id="overview" title="Pro tier · Overview" subtitle="Apple aesthetic · denser data · forward yield + safety score everywhere">
            <DCArtboard id="dashboard" label="Dashboard — Portfolio at a glance" width={W} height={H}>
              <ProDashboard />
            </DCArtboard>
          </DCSection>
        )}

        {showPro && (
          <DCSection id="holdings" title="Pro · Holdings & research" subtitle="Dense table · single-stock drilldown">
            <DCArtboard id="table" label="Holdings — full table" width={W} height={H}>
              <ProHoldings />
            </DCArtboard>
            <DCArtboard id="stock" label="Stock detail — Realty Income (O)" width={W} height={H}>
              <ProStock />
            </DCArtboard>
          </DCSection>
        )}

        {showPro && (
          <DCSection id="income" title="Pro · Income engine" subtitle="Calendar · 12-month forecast · DRIP snowball">
            <DCArtboard id="calendar" label="Dividend calendar — year heatmap" width={W} height={H}>
              <ProCalendar />
            </DCArtboard>
            <DCArtboard id="forecast" label="12-month income forecast" width={W} height={H}>
              <ProForecast />
            </DCArtboard>
            <DCArtboard id="drip" label="DRIP simulator — snowball" width={W} height={H}>
              <ProDrip />
            </DCArtboard>
          </DCSection>
        )}

        {showPro && (
          <DCSection id="analysis" title="Pro · Analysis & risk" subtitle="Performance vs benchmark · diversification">
            <DCArtboard id="perf" label="Performance vs benchmarks" width={W} height={H}>
              <ProPerformance />
            </DCArtboard>
            <DCArtboard id="div" label="Diversification — sector · geo · ccy" width={W} height={H}>
              <ProDiversification />
            </DCArtboard>
          </DCSection>
        )}

        {showPro && (
          <DCSection id="tax" title="Pro · Tax & treaty" subtitle="Withholding · reclaim opportunities · NL Box 3">
            <DCArtboard id="taxrep" label="Withholding report — 2026 YTD" width={W} height={H}>
              <ProTax />
            </DCArtboard>
          </DCSection>
        )}

        {t.showNote && (
          <DCPostIt top={20} right={70} rotate={2.5} width={260}>
            Two tiers, one elegant brand. Free is consumer-friendly with 4 essentials. Pro keeps the Apple aesthetic but packs in 9 dense screens of data — for the same person, just on a heavier-research day.
          </DCPostIt>
        )}
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Which tier to show" />
        <TweakRadio label="Tier" value={t.tier}
          options={[
            { value: "all",  label: "Both" },
            { value: "free", label: "Free" },
            { value: "pro",  label: "Pro" },
          ]}
          onChange={(v) => setTweak("tier", v)} />

        <TweakSection label="Canvas" />
        <TweakToggle label="Show designer note"
          value={t.showNote} onChange={(v) => setTweak("showNote", v)} />

        <TweakSection label="Privacy" />
        <TweakToggle label="Blur sensitive amounts"
          value={t.blurAmounts} onChange={(v) => setTweak("blurAmounts", v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

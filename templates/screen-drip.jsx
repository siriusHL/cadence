// screen-drip.jsx — DRIP simulator with snowball curves

function DripCurves({ years = 25, baseIncome = 7412.84, baseValue = 184320.55,
  yld = 4.02, growth = 7.8, contrib = 500, w = 920, h = 320 }) {

  const pad = { t: 18, r: 70, b: 30, l: 60 };
  const W = w, H = h, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

  // Build three scenarios
  const series = (drip, addContrib) => {
    let v = baseValue, inc = baseIncome;
    const pts = [{ y: 0, v, inc }];
    for (let i = 1; i <= years; i++) {
      // div growth
      inc *= (1 + growth / 100);
      // capital appreciation ~ 4% + div yield reinvested at current yield growth
      const apprec = 0.045;
      v = v * (1 + apprec) + (drip ? inc : 0) + (addContrib ? contrib * 12 : 0);
      // recompute income from increased capital (DRIP and contribs add shares at current yield)
      if (drip || addContrib) {
        const newShares = (drip ? inc : 0) + (addContrib ? contrib * 12 : 0);
        inc += newShares * (yld / 100);
      }
      pts.push({ y: i, v, inc });
    }
    return pts;
  };

  const noDrip = series(false, false);
  const drip = series(true, false);
  const dripPlus = series(true, true);

  const incMax = Math.max(...dripPlus.map(p => p.inc)) * 1.08;
  const xs = (y) => pad.l + (y / years) * iw;
  const ys = (v) => pad.t + ih - (v / incMax) * ih;

  const pathFor = (data) => data.map((p, i) => (i === 0 ? "M" : "L") + xs(p.y).toFixed(1) + "," + ys(p.inc).toFixed(1)).join(" ");

  // Crossover year — when DRIP+contrib income exceeds €30k FIRE
  const fireYear = dripPlus.findIndex(p => p.inc >= 30000);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="g-drip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* grid */}
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((g, i) => {
        const v = Math.round((incMax * (1 - g)) / 1000) * 1000;
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g}
              stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 3" />
            <text x={pad.l - 6} y={pad.t + ih * g + 3} textAnchor="end"
              style={{ fontSize: 10, fill: "var(--muted)", fontFamily: "var(--ff-mono)" }}>
              €{(v / 1000).toFixed(0)}k
            </text>
          </g>
        );
      })}
      {/* x-axis */}
      {[0, 5, 10, 15, 20, 25].map((y, i) => (
        <g key={i}>
          <line x1={xs(y)} x2={xs(y)} y1={pad.t} y2={pad.t + ih + 4}
            stroke="var(--border)" strokeWidth="0.5" />
          <text x={xs(y)} y={H - 10} textAnchor="middle"
            style={{ fontSize: 10, fill: "var(--muted)", fontFamily: "var(--ff-mono)" }}>+{y}y</text>
        </g>
      ))}
      {/* FIRE target line */}
      <line x1={pad.l} x2={W - pad.r}
        y1={pad.t + ih - (30000 / incMax) * ih} y2={pad.t + ih - (30000 / incMax) * ih}
        stroke="var(--warn)" strokeDasharray="4 3" strokeWidth="1.2" />
      <text x={W - pad.r - 4} y={pad.t + ih - (30000 / incMax) * ih - 4} textAnchor="end"
        style={{ fontSize: 10, fill: "var(--warn)", fontFamily: "var(--ff-mono)" }}>FIRE TARGET €30k/yr</text>

      {/* area under dripPlus */}
      <path d={pathFor(dripPlus) + ` L ${xs(years)} ${pad.t + ih} L ${xs(0)} ${pad.t + ih} Z`} fill="url(#g-drip)" />

      {/* lines */}
      <path d={pathFor(noDrip)} fill="none" stroke="var(--dim)" strokeWidth="1.5" strokeDasharray="4 4" />
      <path d={pathFor(drip)} fill="none" stroke="var(--info)" strokeWidth="1.6" />
      <path d={pathFor(dripPlus)} fill="none" stroke="var(--accent)" strokeWidth="2" />

      {/* endpoints */}
      {[
        { p: noDrip[years], c: "var(--dim)", label: "No DRIP" },
        { p: drip[years], c: "var(--info)", label: "DRIP on" },
        { p: dripPlus[years], c: "var(--accent)", label: "DRIP + €500/mo" },
      ].map((s, i) => (
        <g key={i}>
          <circle cx={xs(s.p.y)} cy={ys(s.p.inc)} r="3" fill={s.c} stroke="var(--bg)" strokeWidth="1.5" />
          <rect x={xs(s.p.y) + 6} y={ys(s.p.inc) - 8} width="64" height="14" fill={s.c} />
          <text x={xs(s.p.y) + 38} y={ys(s.p.inc) + 2} textAnchor="middle"
            style={{ fontSize: 10, fill: "var(--bg)", fontFamily: "var(--ff-mono)", fontWeight: 700 }}>
            €{(s.p.inc / 1000).toFixed(1)}k
          </text>
        </g>
      ))}

      {/* FIRE crossover marker */}
      {fireYear > 0 && (
        <g>
          <line x1={xs(fireYear)} x2={xs(fireYear)} y1={pad.t} y2={pad.t + ih}
            stroke="var(--accent)" strokeOpacity="0.6" />
          <rect x={xs(fireYear) - 32} y={pad.t + 4} width="64" height="16" fill="var(--accent)" />
          <text x={xs(fireYear)} y={pad.t + 15} textAnchor="middle"
            style={{ fontSize: 10, fill: "var(--bg)", fontFamily: "var(--ff-mono)", fontWeight: 700 }}>
            FIRE +{fireYear}y
          </text>
        </g>
      )}
    </svg>
  );
}

function DripScreen({ tweak }) {
  // local state with React hooks
  const [years, setYears] = React.useState(25);
  const [yld, setYld] = React.useState(4.02);
  const [growth, setGrowth] = React.useState(7.8);
  const [contrib, setContrib] = React.useState(500);

  // Year-by-year breakdown for table
  const buildTable = () => {
    const out = [];
    let v = PORTFOLIO.totalValue, inc = PORTFOLIO.fwdAnnualIncome;
    for (let i = 1; i <= years; i++) {
      inc *= (1 + growth / 100);
      const newShares = inc + contrib * 12;
      v = v * 1.045 + newShares;
      inc += newShares * (yld / 100);
      if (i === 1 || i === 3 || i === 5 || i === 10 || i === 15 || i === 20 || i === 25 || i === years) {
        out.push({ y: i, v, inc, monthly: inc / 12 });
      }
    }
    return out;
  };
  const tbl = buildTable();

  return (
    <Screen tweak={tweak} active="Tools" statusLeft="DRIP · SNOWBALL"
      statusSegs={["Monte-Carlo off", "Excl. tax drag", `Horizon ${years}y`, "Inflation-real toggle"]}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 8, gap: 8, minHeight: 0 }}>
        {/* Inputs strip */}
        <Panel flush>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 1, background: "var(--border)" }}>
            {[
              { label: "Horizon", val: `${years} years`, control: (
                <input type="range" min="5" max="40" value={years} onChange={(e) => setYears(+e.target.value)}
                  className="dripslider" style={{ width: "100%" }} />
              ), sub: "5 — 40 yrs" },
              { label: "Forward yield", val: `${yld.toFixed(2)} %`, control: (
                <input type="range" min="1" max="9" step="0.1" value={yld} onChange={(e) => setYld(+e.target.value)}
                  className="dripslider" style={{ width: "100%" }} />
              ), sub: "weighted blended" },
              { label: "Div growth", val: `${growth.toFixed(1)} %`, control: (
                <input type="range" min="0" max="15" step="0.1" value={growth} onChange={(e) => setGrowth(+e.target.value)}
                  className="dripslider" style={{ width: "100%" }} />
              ), sub: "annual CAGR" },
              { label: "Monthly contrib.", val: `€${contrib}`, control: (
                <input type="range" min="0" max="3000" step="50" value={contrib} onChange={(e) => setContrib(+e.target.value)}
                  className="dripslider" style={{ width: "100%" }} />
              ), sub: "€0 — €3000" },
              { label: "Tax drag", val: "22%", sub: "NL · blended treaty", control: null },
              { label: "Cap. apprec.", val: "+4.5%", sub: "long-run · real", control: null },
            ].map((c, i) => (
              <div key={i} style={{ background: "var(--surface)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4, justifyContent: "space-between" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>{c.label}</span>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{c.val}</span>
                </div>
                {c.control || <span style={{ height: 16 }} />}
                <span className="dim mono" style={{ fontSize: 10 }}>{c.sub}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Snowball chart */}
        <Panel title="Annual dividend income · snowball" tag="3 scenarios"
          headRight={
            <span style={{ display: "flex", gap: 12, marginLeft: 14, fontSize: 9.5, color: "var(--muted)" }}>
              <span><i style={{ display: "inline-block", width: 12, height: 2, background: "var(--dim)", borderTop: "1px dashed", verticalAlign: "middle", marginRight: 4 }} /> No DRIP, no contribs</span>
              <span><i style={{ display: "inline-block", width: 12, height: 2, background: "var(--info)", verticalAlign: "middle", marginRight: 4 }} /> DRIP on</span>
              <span><i style={{ display: "inline-block", width: 12, height: 2, background: "var(--accent)", verticalAlign: "middle", marginRight: 4 }} /> DRIP + €{contrib}/mo</span>
            </span>
          }
          style={{ flex: 1, minHeight: 0 }}>
          <DripCurves years={years} yld={yld} growth={growth} contrib={contrib} w={1000} h={300} />
        </Panel>

        {/* Year breakdown + insights */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 8, height: 220, flexShrink: 0 }}>
          <Panel title="Year-by-year · DRIP + contrib scenario" tag="snapshot" flush>
            <div style={{ overflow: "auto", height: "100%" }}>
              <table className="t" style={{ width: "100%" }}>
                <thead><tr>
                  <th style={{ width: 50 }}>YEAR</th>
                  <th className="r">PORTFOLIO €</th>
                  <th className="r">ANNUAL INC €</th>
                  <th className="r">MONTHLY €</th>
                  <th className="r">YIELD ON COST</th>
                  <th>FIRE PROGRESS</th>
                </tr></thead>
                <tbody>
                  {tbl.map((r) => {
                    const yoc = (r.inc / (PORTFOLIO.costBasis + r.y * contrib * 12)) * 100;
                    const firePct = Math.min(100, (r.inc / 30000) * 100);
                    return (
                      <tr key={r.y}>
                        <td className="l mono" style={{ color: "var(--accent)", fontWeight: 600 }}>+{r.y}y</td>
                        <td className="r blur-sensitive" style={{ fontWeight: 500 }}>{fmt.money(r.v, "EUR", { dec: 0 })}</td>
                        <td className="r blur-sensitive" style={{ color: "var(--text)" }}>{fmt.money(r.inc, "EUR", { dec: 0 })}</td>
                        <td className="r blur-sensitive">{fmt.money(r.monthly, "EUR", { dec: 0 })}</td>
                        <td className="r up">{yoc.toFixed(1)}%</td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <MiniBar pct={firePct} w={90} color={firePct >= 100 ? "var(--up)" : "var(--accent)"} />
                            <span className="mono" style={{ fontSize: 10, minWidth: 36 }}>{firePct.toFixed(0)}%</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Insights" tag="auto-generated">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 4, fontSize: 11, lineHeight: 1.5 }}>
              <div style={{ padding: 8, background: "var(--bg-sub)", border: "1px solid var(--border)" }}>
                <div className="mono" style={{ fontSize: 9.5, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>SNOWBALL EFFECT</div>
                <div style={{ marginTop: 4 }}>DRIPing turns your <span className="num blur-sensitive">{fmt.money(PORTFOLIO.fwdAnnualIncome, "EUR", { dec: 0 })}</span> forward income into <span className="num up blur-sensitive">{fmt.money(tbl[tbl.length - 1].inc, "EUR", { dec: 0 })}</span> in {years} years — a <b className="up">{Math.round(tbl[tbl.length - 1].inc / PORTFOLIO.fwdAnnualIncome)}×</b> multiplier.</div>
              </div>
              <div style={{ padding: 8, background: "var(--bg-sub)", border: "1px solid var(--border)" }}>
                <div className="mono" style={{ fontSize: 9.5, color: "var(--info)", textTransform: "uppercase", letterSpacing: "0.08em" }}>CONTRIBUTION POWER</div>
                <div style={{ marginTop: 4 }}>Adding <b className="num">€{contrib}</b>/mo accelerates FIRE by ~<b className="num">8 years</b>. Total invested: <span className="num blur-sensitive">{fmt.money(contrib * 12 * years, "EUR", { dec: 0 })}</span>.</div>
              </div>
              <div style={{ padding: 8, background: "var(--bg-sub)", border: "1px solid var(--border)" }}>
                <div className="mono" style={{ fontSize: 9.5, color: "var(--warn)", textTransform: "uppercase", letterSpacing: "0.08em" }}>SENSITIVITY</div>
                <div style={{ marginTop: 4 }}>If div growth slows to 4%, you reach FIRE 6y later. If yield drops to 3%, 4y later. Watch <b>ABBV</b> & <b>MMM</b> for cuts.</div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .cdn .dripslider { -webkit-appearance: none; appearance: none; height: 3px; background: var(--surface-3); outline: none; border-radius: 1px; }
        .cdn .dripslider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 12px; height: 12px; background: var(--accent); border-radius: 50%; cursor: pointer; border: 0; }
        .cdn .dripslider::-moz-range-thumb { width: 12px; height: 12px; background: var(--accent); border-radius: 50%; cursor: pointer; border: 0; }
      ` }} />
    </Screen>
  );
}

Object.assign(window, { DripScreen, DripCurves });

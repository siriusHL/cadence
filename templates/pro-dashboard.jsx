// pro-dashboard.jsx — Pro Overview, Apple-style

function ProCadenceChart({ width = 880, height = 220 }) {
  // 12 actual months + 6 forecast, with bars + equity overlay
  const pad = { t: 16, r: 44, b: 26, l: 36 };
  const W = width, H = height;
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const months = INCOME_HIST_24M.slice(-12);
  const forecast = FORECAST_12M.slice(0, 6);
  const series = [
    ...months.map((eur) => ({ eur, type: "actual" })),
    ...forecast.map((m) => ({ eur: m.eur, type: "forecast" })),
  ];
  const N = series.length;
  const maxBar = Math.max(...series.map(s => s.eur)) * 1.2;
  const bw = iw / N;

  const eq = PERF.slice(-N).map(p => p.p);
  const eqMin = Math.min(...eq), eqMax = Math.max(...eq);
  const eqRange = eqMax - eqMin || 1;
  const xCenter = (i) => pad.l + (i + 0.5) * bw;
  const eqY = (v) => pad.t + ih * 0.12 + (1 - (v - eqMin) / eqRange) * (ih * 0.4);
  const eqPath = eq.map((v, i) => (i === 0 ? "M" : "L") + xCenter(i).toFixed(1) + "," + eqY(v).toFixed(1)).join(" ");

  const monLab = ["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov"];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {[0, 0.5, 1].map((g, i) => (
        <line key={i} x1={pad.l} x2={W - pad.r}
          y1={pad.t + ih * g} y2={pad.t + ih * g}
          stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
      ))}
      {[0, 0.5, 1].map((g, i) => {
        const v = Math.round((maxBar * (1 - g)) / 50) * 50;
        return <text key={i} x={pad.l - 6} y={pad.t + ih * g + 3} textAnchor="end"
          style={{ fontSize: 10, fill: "#86868b", fontWeight: 500 }}>€{v}</text>;
      })}
      {series.map((s, i) => {
        const h = (s.eur / maxBar) * ih;
        const x = pad.l + i * bw + 3;
        const y = pad.t + ih - h;
        const isF = s.type === "forecast";
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw - 6} height={h}
              rx="3" ry="3"
              fill={isF ? "oklch(0.86 0.04 175)" : "oklch(0.55 0.10 175)"}
              opacity={isF ? 0.6 : 1} />
            {i % 2 === 0 && (
              <text x={x + (bw - 6) / 2} y={H - 8} textAnchor="middle"
                style={{ fontSize: 10, fill: isF ? "#86868b" : "#6e6e73", fontWeight: 500 }}>
                {monLab[i]}
              </text>
            )}
          </g>
        );
      })}
      {/* divider between actual and forecast */}
      <line x1={pad.l + 12 * bw} x2={pad.l + 12 * bw}
        y1={pad.t} y2={pad.t + ih}
        stroke="rgba(0,0,0,0.12)" strokeDasharray="3 3" strokeWidth="1" />
      <text x={pad.l + 12 * bw + 4} y={pad.t + 10}
        style={{ fontSize: 10, fill: "#86868b", fontWeight: 500 }}>Now</text>

      <path d={eqPath} fill="none" stroke="oklch(0.40 0.06 235)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx={xCenter(eq.length - 1)} cy={eqY(eq[eq.length - 1])} r="4"
        fill="#fff" stroke="oklch(0.40 0.06 235)" strokeWidth="2" />
    </svg>
  );
}

function ProSparkline({ data, w = 90, h = 28, up = true }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const xs = (i) => (i / (data.length - 1)) * w;
  const ys = (v) => h - 2 - ((v - min) / range) * (h - 4);
  const path = data.map((v, i) => (i === 0 ? "M" : "L") + xs(i).toFixed(1) + "," + ys(v).toFixed(1)).join(" ");
  const color = up ? "oklch(0.48 0.08 165)" : "oklch(0.50 0.16 25)";
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProDashboard() {
  // Top contributors
  const contribs = HOLDINGS.map(h => ({ ...h, eur: fwdIncomeEUR(h), yld: fwdYield(h) }))
    .sort((a, b) => b.eur - a.eur).slice(0, 6);
  const max = contribs[0].eur;

  // Upcoming pays — next 5 events
  const today = { mo: 5, day: 21 };
  const evts = DIV_EVENTS
    .map(e => ({ ...e, dist: e.mo < today.mo ? (e.mo + 12 - today.mo) * 31 + (e.day - today.day) : (e.mo - today.mo) * 31 + (e.day - today.day) }))
    .sort((a, b) => a.dist - b.dist).slice(0, 5);

  return (
    <ProScreen active="Dashboard">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Your portfolio · Wed 21 May 2026</div>
          <h1>€184,320<span style={{ color: "#86868b", fontWeight: 400 }}>.55</span></h1>
          <div className="sub">Up <b style={{ color: "oklch(0.48 0.08 165)" }}>€41,450 (+29.01%)</b> since you started · <b>20 stocks</b> across 8 countries paying <b>€7,413</b>/year forward.</div>
        </div>
        <div className="right-meta">
          <span className="live">Live · synced 17:35 CET</span>
          <span>Cash balance · €4,280.10</span>
          <span>Next sync in 2 min</span>
        </div>
      </div>

      <div className="hero-stats" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div className="tile">
          <div className="l">Forward income</div>
          <div className="v"><span className="cur">€</span>7,413</div>
          <div className="d"><span className="up">+€612</span> vs 30d ago</div>
        </div>
        <div className="tile">
          <div className="l">Forward yield</div>
          <div className="v">4.02<span style={{ fontSize: 16, color: "#86868b", fontWeight: 400 }}>%</span></div>
          <div className="d">YoC <b style={{ color: "#1d1d1f" }}>5.19%</b></div>
        </div>
        <div className="tile">
          <div className="l">YTD total return</div>
          <div className="v up">+11.42<span style={{ fontSize: 16, fontWeight: 400 }}>%</span></div>
          <div className="d">vs STOXX 600 +6.84%</div>
        </div>
        <div className="tile">
          <div className="l">T12M income</div>
          <div className="v"><span className="cur">€</span>6,984</div>
          <div className="d"><span className="up">+12.4%</span> vs prior</div>
        </div>
        <div className="tile">
          <div className="l">Avg safety</div>
          <div className="v">A<span style={{ fontSize: 16, color: "#86868b", fontWeight: 400, marginLeft: 6 }}>· 83.2</span></div>
          <div className="d">20 positions · 0 watch</div>
        </div>
      </div>

      {/* Cadence chart */}
      <div className="pcard" style={{ marginBottom: 10 }}>
        <div className="pcard-h">
          <div>
            <div className="t">Income rhythm · 18 months</div>
            <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>Dividends received (solid) and expected (faded), with portfolio return overlay.</div>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#6e6e73" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "oklch(0.55 0.10 175)" }} /> Dividends
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#6e6e73" }}>
              <span style={{ width: 14, height: 2, background: "oklch(0.40 0.06 235)", borderRadius: 1 }} /> Total return
            </span>
            <div className="seg">
              <button>6M</button><button>1Y</button><button className="on">18M</button><button>3Y</button><button>All</button>
            </div>
          </div>
        </div>
        <ProCadenceChart width={1180} height={150} />
      </div>

      {/* 3-column bottom row */}
      <div className="row-3" style={{ gridTemplateColumns: "1.2fr 1.1fr 1fr", maxHeight: 290 }}>
        <div className="pcard">
          <div className="pcard-h">
            <div className="t">Top income contributors</div>
            <span className="tag">Forward 12M · EUR</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {contribs.map((h, i) => (
              <div key={h.t} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 11 }}>{h.t.slice(0, 2)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{h.t} <span style={{ color: "#86868b", fontWeight: 400, fontSize: 11.5 }}>· {h.n}</span></div>
                  <div className="pbar" style={{ marginTop: 5 }}>
                    <i style={{ width: `${(h.eur / max) * 100}%` }} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }} className="num">
                  <div style={{ fontSize: 13, fontWeight: 600 }}>€{h.eur.toFixed(0)}</div>
                  <div style={{ fontSize: 11, color: "#86868b" }}>{h.yld.toFixed(2)}% yld</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pcard">
          <div className="pcard-h">
            <div className="t">Coming up · next 5</div>
            <span className="tag">21 May → 24 Jun</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {evts.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", borderBottom: i < evts.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                <div style={{ width: 44, textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }} className="num">{String(e.day).padStart(2, "0")}</div>
                  <div style={{ fontSize: 9.5, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][e.mo - 1]}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{e.t}</div>
                  <div style={{ fontSize: 11, color: "#86868b" }}>{e.n.slice(0, 24)}</div>
                </div>
                <div style={{ textAlign: "right" }} className="num">
                  <div style={{ fontSize: 13, fontWeight: 600 }}>€{e.grossEUR.toFixed(2)}</div>
                  <div style={{ fontSize: 10.5, color: "#86868b" }}>{e.dist === 0 ? "today" : "in " + e.dist + "d"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pcard">
          <div className="pcard-h">
            <div className="t">FIRE progress</div>
            <span className="tag">€30k/yr target</span>
          </div>
          <div className="num" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05 }}>
            <span style={{ fontSize: 17, color: "#86868b", fontWeight: 400 }}>€</span>7,413
            <span style={{ fontSize: 14, color: "#86868b", fontWeight: 400, marginLeft: 8 }}>/ €30,000</span>
          </div>
          <div style={{ fontSize: 11.5, color: "#6e6e73", marginTop: 4 }}>24.7% of FIRE · est. <b style={{ color: "#1d1d1f" }}>~14 years</b> at 7.8% income growth</div>

          <div style={{ position: "relative", height: 8, background: "rgba(0,0,0,0.06)", borderRadius: 4, overflow: "hidden", marginTop: 16 }}>
            <div style={{ position: "absolute", inset: 0, width: "24.7%", background: "oklch(0.55 0.10 175)", borderRadius: 4 }} />
            {[0.25, 0.5, 0.75].map((p, i) => (
              <div key={i} style={{ position: "absolute", top: -2, bottom: -2, left: `${p * 100}%`, width: 1, background: "#fff" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10, color: "#86868b", fontWeight: 500 }} className="num">
            <span>€0</span><span>€7.5k</span><span>€15k</span><span>€22.5k</span><span>€30k</span>
          </div>

          <div style={{ marginTop: 18, padding: "10px 12px", background: "rgba(0,0,0,0.025)", borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: "#86868b", marginBottom: 2 }}>This month</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>€612.40</span>
              <span className="ppill up">↑ €74 vs Apr</span>
              <span style={{ marginLeft: "auto", fontSize: 10.5, color: "#86868b" }}>vs €700 target · 87%</span>
            </div>
          </div>
        </div>
      </div>
    </ProScreen>
  );
}

Object.assign(window, { ProDashboard, ProCadenceChart, ProSparkline });

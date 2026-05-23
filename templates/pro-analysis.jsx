// pro-analysis.jsx — Performance, Diversification, Tax — Apple-style

// ─── Performance ─────────────────────────────────────────────
function ProPerfChart({ series, w = 1180, h = 240 }) {
  const pad = { t: 16, r: 90, b: 26, l: 12 };
  const W = w, H = h, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const all = series.flatMap(s => [s.p, s.b, s.s]);
  const min = Math.min(0, ...all), max = Math.max(...all);
  const range = max - min || 1;
  const xs = (i) => pad.l + (i / (series.length - 1)) * iw;
  const ys = (v) => pad.t + ih - ((v - min) / range) * ih;
  const path = (key) => series.map((s, i) => (i === 0 ? "M" : "L") + xs(i).toFixed(1) + "," + ys(s[key]).toFixed(1)).join(" ");
  const last = series[series.length - 1];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="g-perf-pro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.55 0.10 175)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="oklch(0.55 0.10 175)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad.l} x2={W - pad.r} y1={ys(0)} y2={ys(0)} stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
      {[max, max * 0.5, min * 0.5].filter(v => v >= min && v <= max).map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={ys(v)} y2={ys(v)} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
          <text x={W - pad.r + 6} y={ys(v) + 3} style={{ fontSize: 10.5, fill: "#86868b", fontWeight: 500 }}>{(v >= 0 ? "+" : "") + v.toFixed(1) + "%"}</text>
        </g>
      ))}
      <path d={path("p") + ` L ${xs(series.length - 1)},${pad.t + ih} L ${xs(0)},${pad.t + ih} Z`} fill="url(#g-perf-pro)" />
      <path d={path("s")} fill="none" stroke="oklch(0.40 0.06 235)" strokeWidth="1.6" strokeDasharray="4 3" />
      <path d={path("b")} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.6" />
      <path d={path("p")} fill="none" stroke="oklch(0.55 0.10 175)" strokeWidth="2.4" strokeLinecap="round" />
      {[
        { v: last.p, c: "oklch(0.55 0.10 175)", l: "Yours" },
        { v: last.b, c: "rgba(0,0,0,0.5)", l: "STOXX" },
        { v: last.s, c: "oklch(0.40 0.06 235)", l: "S&P" },
      ].map((p, i) => (
        <g key={i}>
          <circle cx={xs(series.length - 1)} cy={ys(p.v)} r="4" fill="#fff" stroke={p.c} strokeWidth="2" />
          <text x={W - pad.r + 6} y={ys(p.v) + 3} style={{ fontSize: 10.5, fontWeight: 600, fill: p.c, fontVariantNumeric: "tabular-nums" }}>{(p.v >= 0 ? "+" : "") + p.v.toFixed(1) + "%"}</text>
        </g>
      ))}
      {[0, 6, 12, 18, 23].map((i, k) => (
        <text key={k} x={xs(i)} y={H - 6} textAnchor="middle" style={{ fontSize: 10.5, fill: "#86868b", fontWeight: 500 }}>
          {["May '24","Nov '24","May '25","Nov '25","May '26"][k]}
        </text>
      ))}
    </svg>
  );
}

function ProPerformance() {
  const last = PERF[PERF.length - 1];
  const contribs = HOLDINGS.map(h => ({ ...h, pl: valueEUR(h) - costEUR(h), plP: ((h.p - h.cp) / h.cp) * 100 }));
  const winners = [...contribs].sort((a, b) => b.pl - a.pl).slice(0, 5);
  const losers  = [...contribs].sort((a, b) => a.pl - b.pl).filter(l => l.pl < 0).slice(0, 3);

  const periods = [
    { l: "1M",  p: 1.42, b: 0.88, s: 1.21 },
    { l: "3M",  p: 4.36, b: 3.12, s: 4.85 },
    { l: "YTD", p: 11.42, b: 6.84, s: 9.74 },
    { l: "1Y",  p: 18.84, b: 11.20, s: 16.45 },
    { l: "3Y",  p: 38.20, b: 22.40, s: 31.80 },
    { l: "5Y",  p: 74.65, b: 41.20, s: 68.30 },
  ];

  return (
    <ProScreen active="Performance">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Performance · 24 months</div>
          <h1>+{last.p.toFixed(1)}% <span className="light">total return</span></h1>
          <div className="sub">You're <b style={{ color: "oklch(0.36 0.08 165)" }}>{(last.p - last.b).toFixed(1)}pp ahead</b> of STOXX 600 and <b style={{ color: "oklch(0.36 0.08 165)" }}>{(last.p - last.s).toFixed(1)}pp</b> ahead of the S&P 500 (EUR-hedged) — net of fees, time-weighted.</div>
        </div>
        <div className="right-meta">
          <span className="live">IRR +12.4% · annualised</span>
          <span>Sharpe 1.32 · Sortino 1.84</span>
          <span>Max DD −14.2% · recovered Mar '24</span>
        </div>
      </div>

      <div className="hero-stats" style={{ gridTemplateColumns: "repeat(6, 1fr)", marginBottom: 14 }}>
        <div className="tile"><div className="l">YTD</div><div className="v up">+11.42<span style={{ fontSize: 14, fontWeight: 400 }}>%</span></div><div className="d up">+4.58pp vs STOXX</div></div>
        <div className="tile"><div className="l">1 year</div><div className="v up">+18.84<span style={{ fontSize: 14, fontWeight: 400 }}>%</span></div><div className="d up">+7.64pp vs STOXX</div></div>
        <div className="tile"><div className="l">Sharpe (1y)</div><div className="v">1.32</div><div className="d">rf 3.5%</div></div>
        <div className="tile"><div className="l">Max drawdown</div><div className="v down">−14.2<span style={{ fontSize: 14, fontWeight: 400 }}>%</span></div><div className="d">Oct '23</div></div>
        <div className="tile"><div className="l">Beta · 5y</div><div className="v">0.82</div><div className="d">defensive tilt</div></div>
        <div className="tile"><div className="l">Win rate</div><div className="v">67<span style={{ fontSize: 14, fontWeight: 400 }}>%</span></div><div className="d">16 / 24 months</div></div>
      </div>

      <div className="pcard" style={{ marginBottom: 14 }}>
        <div className="pcard-h">
          <div>
            <div className="t">Cumulative total return</div>
            <div style={{ fontSize: 11.5, color: "#86868b", marginTop: 2 }}>Net of fees · reinvested dividends · EUR-hedged where applicable.</div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {[
              { c: "oklch(0.55 0.10 175)", l: "Your portfolio" },
              { c: "rgba(0,0,0,0.5)", l: "STOXX 600 TR", style: "solid" },
              { c: "oklch(0.40 0.06 235)", l: "S&P 500 €H", style: "dashed" },
            ].map((g, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#6e6e73" }}>
                <span style={{ width: 16, height: 2, background: g.c, borderRadius: 1 }} /> {g.l}
              </span>
            ))}
          </div>
        </div>
        <ProPerfChart series={PERF} w={1180} h={160} />
      </div>

      <div className="row-3" style={{ gridTemplateColumns: "1.4fr 1fr 1fr", maxHeight: 250 }}>
        <div className="pcard flush" style={{ overflow: "hidden" }}>
          <div className="pcard-h">
            <div className="t">Period returns vs benchmarks</div>
          </div>
          <div style={{ overflow: "auto", maxHeight: 200 }}>
          <table className="pt">
            <thead>
              <tr>
                <th>Period</th>
                <th className="r">Yours</th>
                <th className="r">STOXX 600</th>
                <th className="r">S&P 500 €H</th>
                <th className="r">vs STOXX</th>
                <th style={{ width: 130 }}>Spread</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => {
                const aE = p.p - p.b;
                return (
                  <tr key={p.l}>
                    <td className="b">{p.l}</td>
                    <td className="r up b">+{p.p.toFixed(2)}%</td>
                    <td className="r">+{p.b.toFixed(2)}%</td>
                    <td className="r">+{p.s.toFixed(2)}%</td>
                    <td className={"r b " + (aE >= 0 ? "up" : "down")}>{aE >= 0 ? "+" : ""}{aE.toFixed(2)}pp</td>
                    <td>
                      <div style={{ position: "relative", height: 16, background: "rgba(0,0,0,0.04)", borderRadius: 8 }}>
                        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.15)" }} />
                        <div style={{ position: "absolute", top: 2, bottom: 2,
                          [aE >= 0 ? "left" : "right"]: "50%",
                          width: `${Math.min(50, Math.abs(aE) * 1.5)}%`,
                          background: aE >= 0 ? "oklch(0.55 0.10 175)" : "oklch(0.50 0.16 25)",
                          borderRadius: 6 }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>

        <div className="pcard flush" style={{ overflow: "hidden" }}>
          <div className="pcard-h">
            <div className="t">Top contributors · YTD</div>
          </div>
          <div style={{ overflow: "auto", maxHeight: 200 }}>
          <table className="pt">
            <thead><tr><th>Ticker</th><th className="r">P/L €</th><th className="r">Return</th></tr></thead>
            <tbody>
              {winners.map((w) => (
                <tr key={w.t}>
                  <td className="ticker">{w.t}<span className="name">{w.n}</span></td>
                  <td className="r up b">+€{w.pl.toFixed(0)}</td>
                  <td className="r up">+{w.plP.toFixed(1)}%</td>
                </tr>
              ))}
              {losers.map((w) => (
                <tr key={w.t}>
                  <td className="ticker">{w.t}<span className="name">{w.n}</span></td>
                  <td className="r down b">−€{Math.abs(w.pl).toFixed(0)}</td>
                  <td className="r down">{w.plP.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div className="pcard flush" style={{ overflow: "hidden" }}>
          <div className="pcard-h">
            <div className="t">Risk & ratios · rolling 1y</div>
          </div>
          <div style={{ overflow: "auto", maxHeight: 200 }}>
          <table className="pt">
            <tbody>
              {[
                ["Volatility (σ)", "11.4%",   "vs 13.8% bench", "up"],
                ["Sortino",        "1.84",    "downside σ 6.2%", ""],
                ["Calmar",         "0.87",    "rtn / max DD", ""],
                ["Alpha (Jensen)", "+3.2%",   "annualised", "up"],
                ["Correlation",    "0.71",    "moderate", ""],
                ["Tracking error", "5.4%",    "active", ""],
                ["Info ratio",     "0.92",    "skill > noise", "up"],
              ].map((r, i) => (
                <tr key={i}>
                  <td className="muted">{r[0]}</td>
                  <td className={"r b " + r[3]}>{r[1]}</td>
                  <td className="muted" style={{ fontSize: 11 }}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </ProScreen>
  );
}

// ─── Diversification ─────────────────────────────────────────
function Donut({ data, size = 180, thickness = 26, colors }) {
  const r = size / 2 - thickness / 2 - 2;
  const cx = size / 2, cy = size / 2;
  const total = data.reduce((s, d) => s + d.v, 0);
  let acc = 0;
  return (
    <svg width={size} height={size}>
      {data.map((d, i) => {
        const frac = d.v / total;
        const start = acc * 2 * Math.PI - Math.PI / 2;
        const end = (acc + frac) * 2 * Math.PI - Math.PI / 2;
        const large = frac > 0.5 ? 1 : 0;
        const x0 = cx + r * Math.cos(start), y0 = cy + r * Math.sin(start);
        const x1 = cx + r * Math.cos(end),   y1 = cy + r * Math.sin(end);
        acc += frac;
        return (
          <path key={i} d={`M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`}
            fill="none" stroke={colors[i % colors.length]} strokeWidth={thickness}
            strokeLinecap="butt" />
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle"
        style={{ fontSize: 22, fontWeight: 600, fill: "#1d1d1f", letterSpacing: "-0.02em" }}>{data.length}</text>
      <text x={cx} y={cy + 14} textAnchor="middle"
        style={{ fontSize: 10.5, fill: "#86868b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>buckets</text>
    </svg>
  );
}

function ProDiversification() {
  const sumPos = HOLDINGS.reduce((s, h) => s + valueEUR(h), 0);
  const hhi = HOLDINGS.reduce((s, h) => s + Math.pow((valueEUR(h) / sumPos) * 100, 2), 0);
  const top5 = HOLDINGS.map(h => valueEUR(h)).sort((a, b) => b - a).slice(0, 5).reduce((s, v) => s + v, 0) / sumPos * 100;
  const top10 = HOLDINGS.map(h => valueEUR(h)).sort((a, b) => b - a).slice(0, 10).reduce((s, v) => s + v, 0) / sumPos * 100;

  const ccyMix = {};
  HOLDINGS.forEach(h => { ccyMix[h.x] = (ccyMix[h.x] || 0) + fwdIncomeEUR(h); });
  const totIncome = Object.values(ccyMix).reduce((a, b) => a + b, 0);
  const ccyData = Object.entries(ccyMix).map(([k, v]) => ({ k, v: (v / totIncome) * 100 })).sort((a, b) => b.v - a.v);

  const sectorColors = ["oklch(0.55 0.10 175)","oklch(0.60 0.09 145)","oklch(0.62 0.10 110)","oklch(0.62 0.10 85)","oklch(0.65 0.10 60)","oklch(0.62 0.10 35)","oklch(0.55 0.09 320)","oklch(0.55 0.08 270)","oklch(0.58 0.08 235)","oklch(0.55 0.08 200)"];
  const geoColors = ["oklch(0.42 0.07 175)","oklch(0.55 0.10 200)","oklch(0.58 0.10 220)","oklch(0.62 0.09 240)","oklch(0.60 0.08 260)","oklch(0.58 0.08 195)","oklch(0.62 0.08 180)","oklch(0.55 0.08 150)"];
  const ccyColors  = ["oklch(0.55 0.10 175)","oklch(0.62 0.10 110)","oklch(0.60 0.10 50)","oklch(0.55 0.10 320)","oklch(0.55 0.10 250)","oklch(0.60 0.08 200)"];

  return (
    <ProScreen active="Holdings">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Diversification · by value</div>
          <h1>Well spread <span className="light">across 8 countries</span></h1>
          <div className="sub">HHI of <b style={{ color: "oklch(0.36 0.08 165)" }}>{hhi.toFixed(0)}</b> is comfortably below the 1500 concentration threshold. Single largest position is <b>JNJ at 5.7%</b>.</div>
        </div>
        <div className="right-meta">
          <span className="live">20 positions · 10 sectors</span>
          <span>8 currencies · 35% EUR</span>
          <span>Effective N = {(10000 / hhi).toFixed(1)}</span>
        </div>
      </div>

      <div className="row-3" style={{ marginBottom: 14 }}>
        <div className="pcard">
          <div className="pcard-h"><div className="t">Sectors</div><span className="tag">GICS · by value</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Donut data={SECTORS} colors={sectorColors} size={130} thickness={20} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              {SECTORS.slice(0, 6).map((s, i) => (
                <div key={s.k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: sectorColors[i] }} />
                  <span style={{ flex: 1, color: "#1d1d1f" }}>{s.k}</span>
                  <span className="num" style={{ fontWeight: 500 }}>{s.v.toFixed(1)}%</span>
                </div>
              ))}
              <div style={{ fontSize: 10.5, color: "#86868b", marginTop: 4 }}>+ 4 more · 10.7%</div>
            </div>
          </div>
        </div>

        <div className="pcard">
          <div className="pcard-h"><div className="t">Geography</div><span className="tag">Domicile</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Donut data={GEO} colors={geoColors} size={130} thickness={20} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              {GEO.slice(0, 6).map((g, i) => (
                <div key={g.k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: geoColors[i] }} />
                  <span style={{ flex: 1, color: "#1d1d1f" }}>{g.k}</span>
                  <span className="num" style={{ fontWeight: 500 }}>{g.v.toFixed(1)}%</span>
                </div>
              ))}
              <div style={{ fontSize: 10.5, color: "#86868b", marginTop: 4 }}>+ {GEO.length - 6} more</div>
            </div>
          </div>
        </div>

        <div className="pcard">
          <div className="pcard-h"><div className="t">Currencies</div><span className="tag">By forward income</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Donut data={ccyData} colors={ccyColors} size={130} thickness={20} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              {ccyData.map((c, i) => (
                <div key={c.k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: ccyColors[i] }} />
                  <span style={{ flex: 1, color: "#1d1d1f" }}>{c.k}</span>
                  <span className="num" style={{ fontWeight: 500 }}>{c.v.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="row-2" style={{ gridTemplateColumns: "1.5fr 1fr", maxHeight: 280 }}>
        <div className="pcard flush" style={{ overflow: "hidden" }}>
          <div className="pcard-h"><div className="t">Sector detail · vs benchmark</div><span className="tag">+ / − pp</span></div>
          <div style={{ overflow: "auto", maxHeight: 240 }}>
          <table className="pt">
            <thead><tr>
              <th>Sector</th>
              <th className="r">% value</th>
              <th className="r">% income</th>
              <th className="r">Yield</th>
              <th style={{ width: 180 }}>vs STOXX 600</th>
            </tr></thead>
            <tbody>
              {SECTORS.map((s, i) => {
                const bench = [11, 13, 22, 3, 5, 12, 17, 9, 4, 4][i] || 8;
                const diff = s.v - bench;
                return (
                  <tr key={s.k}>
                    <td className="ticker"><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: sectorColors[i] }} />{s.k}</div></td>
                    <td className="r b">{s.v.toFixed(1)}%</td>
                    <td className="r muted">{((s.i / totIncome) * 100).toFixed(1)}%</td>
                    <td className="r">{((s.i / (s.v * sumPos / 100)) * 100).toFixed(2)}%</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 12, background: "rgba(0,0,0,0.04)", borderRadius: 6, position: "relative" }}>
                          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.15)" }} />
                          <div style={{ position: "absolute", top: 2, bottom: 2,
                            [diff >= 0 ? "left" : "right"]: "50%",
                            width: `${Math.min(50, Math.abs(diff) * 3)}%`,
                            background: diff >= 0 ? "oklch(0.55 0.10 175)" : "oklch(0.50 0.16 25)",
                            borderRadius: 4 }} />
                        </div>
                        <span className={"num " + (diff >= 0 ? "up" : "down")} style={{ fontSize: 11, fontWeight: 500, minWidth: 46, textAlign: "right" }}>
                          {diff >= 0 ? "+" : ""}{diff.toFixed(1)}pp
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>

        <div className="pcard">
          <div className="pcard-h"><div className="t">Concentration check</div><span className="tag">thresholds</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { l: "HHI", v: hhi.toFixed(0), pct: (hhi / 2500) * 100, max: "2500 (high)", color: "oklch(0.48 0.08 165)" },
              { l: "Top 5 weight", v: top5.toFixed(1) + "%", pct: top5, max: "Target < 40%", color: "#1d1d1f" },
              { l: "Top 10 weight", v: top10.toFixed(1) + "%", pct: top10, max: "Target < 60%", color: "#1d1d1f" },
              { l: "Single largest", v: "5.7%", pct: 5.7 * 5, max: "Target < 10%", color: "oklch(0.48 0.08 165)" },
            ].map((g, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 12, color: "#1d1d1f", fontWeight: 500 }}>{g.l}</span>
                  <span className="num" style={{ fontSize: 18, fontWeight: 600, color: g.color, letterSpacing: "-0.015em" }}>{g.v}</span>
                </div>
                <div className="pbar" style={{ marginTop: 6 }}>
                  <i style={{ width: `${Math.min(100, g.pct)}%`, background: g.color }} />
                </div>
                <div style={{ fontSize: 10.5, color: "#86868b", marginTop: 3 }}>{g.max}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProScreen>
  );
}

// ─── Tax ─────────────────────────────────────────────────────
function ProTax() {
  const totalGross = TAX.reduce((s, t) => s + t.gross * (FX[t.ccy] || 1), 0);
  const totalWith = TAX.reduce((s, t) => s + t.withheld * (FX[t.ccy] || 1), 0);
  const totalNet = totalGross - totalWith;

  const treaty = [
    { c: "Switzerland", n: "NESN", recover: "+€88.48", action: "File DA-1 via broker" },
    { c: "Germany",     n: "ALV",  recover: "+€69.79", action: "Treaty reclaim · BZSt" },
    { c: "France",      n: "MC, OR", recover: "+€22.74", action: "Form 5000 + 5001" },
  ];

  return (
    <ProScreen active="Tax">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Withholding · 2026 YTD</div>
          <h1>€{totalNet.toFixed(0)} <span className="light">net received</span></h1>
          <div className="sub">€{totalWith.toFixed(0)} withheld at source ({((totalWith / totalGross) * 100).toFixed(1)}% effective) — <b style={{ color: "oklch(0.36 0.08 165)" }}>€181 reclaimable</b> via treaty filings.</div>
        </div>
        <div className="right-meta">
          <span className="live">Resident · Netherlands</span>
          <span>Box 3 filing · Feb '27</span>
          <span>3 reclaims unfiled</span>
        </div>
      </div>

      <div className="hero-stats" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: 14 }}>
        <div className="tile"><div className="l">Gross dividends</div><div className="v"><span className="cur">€</span>{totalGross.toFixed(0)}</div><div className="d">8 jurisdictions</div></div>
        <div className="tile"><div className="l">Withheld</div><div className="v down"><span className="cur">€</span>{totalWith.toFixed(0)}</div><div className="d">{((totalWith / totalGross) * 100).toFixed(1)}% effective</div></div>
        <div className="tile"><div className="l">Net received</div><div className="v"><span className="cur">€</span>{totalNet.toFixed(0)}</div><div className="d up">15% NL credit</div></div>
        <div className="tile"><div className="l">Reclaimable</div><div className="v up"><span className="cur">€</span>181</div><div className="d">3 treaty filings</div></div>
        <div className="tile"><div className="l">Est. Box 3 tax</div><div className="v"><span className="cur">€</span>{(totalGross * 0.265).toFixed(0)}</div><div className="d">NL marginal 36.97%</div></div>
      </div>

      <div className="row-2" style={{ gridTemplateColumns: "1.5fr 1fr", maxHeight: 380 }}>
        <div className="pcard flush" style={{ overflow: "hidden" }}>
          <div className="pcard-h">
            <div className="t">Withholding by jurisdiction</div>
            <span className="tag">2026 YTD · EUR equiv.</span>
          </div>
          <div style={{ overflow: "auto", maxHeight: 340 }}>
          <table className="pt">
            <thead>
              <tr>
                <th>Country</th>
                <th>Ccy</th>
                <th className="r">Gross local</th>
                <th className="r">Gross €</th>
                <th className="r">Statutory</th>
                <th className="r">Treaty</th>
                <th className="r">Withheld €</th>
                <th className="r">Net €</th>
                <th className="c">Status</th>
              </tr>
            </thead>
            <tbody>
              {TAX.map((row) => {
                const grossEur = row.gross * (FX[row.ccy] || 1);
                const withEur  = row.withheld * (FX[row.ccy] || 1);
                const netEur   = grossEur - withEur;
                const stat = { "United States": 30, "Switzerland": 35, "Germany": 26.375, "France": 25, "Canada": 25, "Spain": 19, "United Kingdom": 0, "Netherlands": 15 }[row.c] || row.rate;
                return (
                  <tr key={row.c}>
                    <td className="b">{row.c}</td>
                    <td className="muted">{row.ccy}</td>
                    <td className="r">{row.gross.toFixed(2)}</td>
                    <td className="r b">€{grossEur.toFixed(2)}</td>
                    <td className="r muted">{stat.toFixed(1)}%</td>
                    <td className="r">{row.rate.toFixed(1)}%</td>
                    <td className="r down">−€{withEur.toFixed(2)}</td>
                    <td className="r b">€{netEur.toFixed(2)}</td>
                    <td className="c">
                      {row.rate < stat
                        ? <span className="ppill up">treaty ✓</span>
                        : ["Switzerland","Germany","France"].includes(row.c)
                          ? <span className="ppill warn">reclaim</span>
                          : <span className="ppill">final</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="b">Total</td>
                <td className="r b">€{totalGross.toFixed(2)}</td>
                <td className="r muted">—</td>
                <td className="r muted">{((totalWith / totalGross) * 100).toFixed(1)}%</td>
                <td className="r down b">−€{totalWith.toFixed(2)}</td>
                <td className="r b">€{totalNet.toFixed(2)}</td>
                <td className="c muted">—</td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="pcard">
            <div className="pcard-h">
              <div className="t">Reclaim opportunities</div>
              <span className="ppill up">+€181 unclaimed</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {treaty.map((o, i) => (
                <div key={i} style={{ padding: "10px 12px", background: "rgba(0,0,0,0.025)", borderRadius: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{o.c}</span>
                    <span className="num" style={{ color: "oklch(0.42 0.07 175)", fontSize: 14, fontWeight: 600 }}>{o.recover}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#6e6e73", display: "flex", justifyContent: "space-between" }}>
                    <span>Holdings: <b style={{ color: "#1d1d1f" }}>{o.n}</b></span>
                    <span style={{ color: "#86868b" }}>{o.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pcard">
            <div className="pcard-h"><div className="t">NL Box 3 · FY 2026 simulation</div></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              {[
                ["Assets · 1 Jan 2026", "€178,420"],
                ["Heffingvrij vermogen", "−€57,000", "muted"],
                ["Belastbare grondslag", "€121,420"],
                ["Forfaitair rendement · 6.04%", "€7,333"],
                ["Box 3 tax · 36%", "−€2,640", "down"],
                ["Foreign WTH credit", "+€" + totalWith.toFixed(0), "up"],
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < 5 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                  <span style={{ color: "#6e6e73" }}>{r[0]}</span>
                  <span className={"num b " + (r[2] || "")} style={{ fontWeight: 500 }}>{r[1]}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#1d1d1f", color: "#fff", borderRadius: 10, marginTop: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Net Box 3 due</span>
                <span className="num" style={{ fontSize: 15, fontWeight: 700 }}>−€{(2640 - totalWith).toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProScreen>
  );
}

Object.assign(window, { ProPerformance, ProDiversification, ProTax, Donut, ProPerfChart });

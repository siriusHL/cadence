// screen-stock.jsx — Single stock detail (Realty Income · O)

function PriceChart({ series, w = 720, h = 220, color = "var(--accent)" }) {
  const pad = { t: 14, r: 56, b: 22, l: 8 };
  const W = w, H = h, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const min = Math.min(...series), max = Math.max(...series);
  const range = max - min || 1;
  const xs = (i) => pad.l + (i / (series.length - 1)) * iw;
  const ys = (v) => pad.t + ih - ((v - min) / range) * ih;
  const path = series.map((v, i) => (i === 0 ? "M" : "L") + xs(i).toFixed(1) + "," + ys(v).toFixed(1)).join(" ");
  const area = `${path} L ${xs(series.length - 1)},${pad.t + ih} L ${xs(0)},${pad.t + ih} Z`;

  // ex-div markers — pretend last 4 quarterly ex-divs at evenly spaced positions
  const exDivs = [0.18, 0.43, 0.68, 0.93];
  // simulated buy points
  const buys = [{ i: 8, p: series[8] }, { i: 38, p: series[38] }];

  // y-axis labels
  const ticks = 4;
  const yLabels = Array.from({ length: ticks + 1 }, (_, i) => min + (range * i) / ticks);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="g-px" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* grid */}
      {yLabels.map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={ys(v)} y2={ys(v)}
            stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 3" />
          <text x={W - pad.r + 4} y={ys(v) + 3} style={{ fontSize: 9.5, fill: "var(--muted)", fontFamily: "var(--ff-mono)" }}>{v.toFixed(2)}</text>
        </g>
      ))}
      {/* area + line */}
      <path d={area} fill="url(#g-px)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
      {/* ex-div ticks */}
      {exDivs.map((p, i) => (
        <g key={i}>
          <line x1={pad.l + iw * p} x2={pad.l + iw * p}
            y1={pad.t} y2={pad.t + ih}
            stroke="var(--accent)" strokeOpacity="0.45" strokeDasharray="2 2" />
          <rect x={pad.l + iw * p - 7} y={pad.t - 10} width="14" height="11" rx="2" fill="var(--accent)" />
          <text x={pad.l + iw * p} y={pad.t - 2} textAnchor="middle"
            style={{ fontSize: 7.5, fill: "var(--bg)", fontFamily: "var(--ff-mono)", fontWeight: 700 }}>EX</text>
        </g>
      ))}
      {/* buys */}
      {buys.map((b, i) => (
        <g key={i}>
          <circle cx={xs(b.i)} cy={ys(b.p)} r="3.5" fill="var(--info)" stroke="var(--bg)" strokeWidth="1.5" />
          <text x={xs(b.i) + 5} y={ys(b.p) - 6} style={{ fontSize: 9, fill: "var(--info)", fontFamily: "var(--ff-mono)" }}>BUY</text>
        </g>
      ))}
      {/* current value pill */}
      <g>
        <rect x={W - pad.r - 4} y={ys(series[series.length - 1]) - 7}
          width="50" height="14" fill={color} />
        <text x={W - pad.r + 21} y={ys(series[series.length - 1]) + 3}
          textAnchor="middle" style={{ fontSize: 9.5, fill: "var(--bg)", fontFamily: "var(--ff-mono)", fontWeight: 700 }}>
          {series[series.length - 1].toFixed(2)}
        </text>
      </g>
      {/* x labels */}
      {["3M ago", "2M", "1M", "Today"].map((l, i) => (
        <text key={i} x={pad.l + (iw * i) / 3} y={H - 6}
          style={{ fontSize: 9, fill: "var(--muted)", fontFamily: "var(--ff-mono)" }}>{l}</text>
      ))}
    </svg>
  );
}

function DivHistChart({ data, w = 720, h = 160 }) {
  const pad = { t: 14, r: 16, b: 28, l: 36 };
  const W = w, H = h, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(...data.map(d => d.a)) * 1.18;
  const bw = iw / data.length;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
        const v = max * (1 - g);
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g}
              stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 3" />
            <text x={pad.l - 6} y={pad.t + ih * g + 3} textAnchor="end"
              style={{ fontSize: 9, fill: "var(--muted)", fontFamily: "var(--ff-mono)" }}>${v.toFixed(2)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const bh = (d.a / max) * ih;
        const x = pad.l + i * bw + 1;
        const y = pad.t + ih - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw - 2} height={bh} fill="var(--accent)" opacity={0.8 + (i / data.length) * 0.2} />
            {i % 4 === 0 && (
              <text x={x + (bw - 2) / 2} y={H - 14} textAnchor="middle"
                style={{ fontSize: 9, fill: "var(--text-2)", fontFamily: "var(--ff-mono)" }}>{d.y}</text>
            )}
          </g>
        );
      })}
      {/* trend line */}
      <line x1={pad.l + bw / 2} y1={pad.t + ih - (data[0].a / max) * ih}
        x2={pad.l + (data.length - 0.5) * bw} y2={pad.t + ih - (data[data.length - 1].a / max) * ih}
        stroke="var(--info)" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x={W - pad.r - 4} y={pad.t + ih - (data[data.length - 1].a / max) * ih - 4} textAnchor="end"
        style={{ fontSize: 9.5, fill: "var(--info)", fontFamily: "var(--ff-mono)" }}>+12.4% 5y</text>
    </svg>
  );
}

function StockScreen({ tweak }) {
  const s = STOCK_O;
  const priceEUR = s.px * FX.USD;
  // safety pillars
  const pillars = [
    { k: "Payout ratio",          v: 76.8, score: 78, hint: "AFFO basis · healthy for REIT" },
    { k: "Debt / EBITDA",         v: 5.9,  score: 80, hint: "Investment grade A-" },
    { k: "Free cash flow cover",  v: 1.31, score: 88, hint: "1.31× current dividend" },
    { k: "Growth streak",         v: 30,   score: 92, hint: "30y consecutive raises · Aristocrat" },
    { k: "Recession resilience",  v: "B+", score: 76, hint: "Cut none in '08, '20" },
    { k: "Yield vs history",      v: "+0.4σ", score: 82, hint: "Slightly cheap vs 5y avg" },
  ];

  return (
    <Screen tweak={tweak} active="Research" statusLeft="O · REALTY INCOME"
      statusSegs={["NYSE · Tape A", "Bid 58.83×400", "Ask 58.86×320", "Spread 0.05%", "VWAP 58.74"]}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 8, gap: 8, minHeight: 0 }}>
        {/* Header */}
        <Panel flush>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr", gap: 1, background: "var(--border)" }}>
            <div style={{ background: "var(--surface)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.5px" }}>{s.t}</span>
                <Flag c="US" />
                <span className="chip">{s.exch}</span>
                <span className="chip">{s.industry}</span>
                <span className="chip solid mono" style={{ background: "var(--accent)", color: "var(--bg)", borderColor: "var(--accent)" }}>OWNED · 540 sh</span>
              </div>
              <div style={{ color: "var(--text-2)", fontSize: 12 }}>{s.n} · The Monthly Dividend Company<sup style={{ fontSize: 7, color: "var(--muted)" }}>®</sup></div>
              <div style={{ display: "flex", gap: 16, alignItems: "baseline", marginTop: 2 }}>
                <span className="num" style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-0.5px" }}>${s.px.toFixed(2)}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--dim)" }}>€{priceEUR.toFixed(2)}</span>
                <Chg v={s.chgPct} withPct />
                <span className="dim mono" style={{ fontSize: 10 }}>after-hours +0.02 (0.03%)</span>
              </div>
            </div>
            <div className="stat">
              <div className="label">Forward yield</div>
              <div className="val" style={{ color: "var(--accent)" }}>{s.fwdYield.toFixed(2)}%</div>
              <div className="sub">TTM <span className="mono">{s.ttmYield.toFixed(2)}%</span> · 5y avg 4.84%</div>
            </div>
            <div className="stat">
              <div className="label">Next pay · {s.payDate}</div>
              <div className="val blur-sensitive">$0.2635</div>
              <div className="sub">540 sh → <span className="mono blur-sensitive">$142.29 / €130.62</span></div>
            </div>
            <div className="stat">
              <div className="label">Streak · monthly</div>
              <div className="val">30<span style={{ fontSize: 14, color: "var(--muted)" }}>y</span></div>
              <div className="sub">125 consec. raises · Aristocrat</div>
            </div>
            <div style={{ background: "var(--surface)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 14 }}>
              <SafetyMeter score={s.safetyScore} grade={s.safetyGrade} size={84} label="SAFETY" />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Cadence score</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--up)" }}>VERY SAFE</div>
                <div className="dim mono" style={{ fontSize: 10 }}>last cut: never</div>
                <div className="dim mono" style={{ fontSize: 10 }}>cushion: 1.31× FCF</div>
              </div>
            </div>
          </div>
        </Panel>

        {/* Main 2-col body */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8, flex: 1, minHeight: 0 }}>
          {/* Left: chart + div hist */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Panel title="Price · 3M · ex-div markers" tag="USD"
              headRight={
                <span style={{ display: "flex", gap: 4, marginLeft: 12 }}>
                  {["1D","1W","1M","3M","6M","1Y","5Y","MAX"].map((r, i) =>
                    <span key={r} className={"chip" + (r === "3M" ? " solid" : "")} style={{ cursor: "default" }}>{r}</span>
                  )}
                </span>
              }>
              <PriceChart series={s.series} w={720} h={210} color="var(--accent)" />
            </Panel>
            <Panel title="Dividend history · 5y quarterly" tag="USD/sh"
              headRight={
                <span style={{ marginLeft: 12, fontSize: 9.5, color: "var(--muted)" }}>
                  Growth <span className="up mono">2.4% CAGR</span> · last raise <span className="mono">+0.4% (Mar '26)</span>
                </span>
              }>
              <DivHistChart data={s.divHist} w={720} h={150} />
            </Panel>
          </div>

          {/* Right: safety pillars + key stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Panel title="Safety pillars" tag="6 factors">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pillars.map((p, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "108px 50px 1fr 26px", alignItems: "center", gap: 8, padding: "3px 4px" }}>
                    <span style={{ fontSize: 10.5, color: "var(--text-2)" }}>{p.k}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--text)", textAlign: "right" }}>{p.v}</span>
                    <MiniBar pct={p.score} w={150} color={p.score >= 80 ? "var(--grade-a)" : p.score >= 65 ? "var(--grade-b)" : "var(--grade-c)"} />
                    <span className="mono" style={{ fontSize: 9.5, color: "var(--muted)", textAlign: "right" }}>{p.score}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4, padding: 8, background: "var(--bg-sub)", borderTop: "1px solid var(--border)", fontSize: 10.5, color: "var(--text-2)", lineHeight: 1.45 }}>
                  <span className="mono" style={{ color: "var(--up)" }}>VERDICT </span>
                  Cadence rates O a <b>Very Safe</b> monthly payer. 30y of growth, 1.31× FCF cover, and conservative AFFO payout. Watch refinancing in 2027 if 10y stays {">"}4.5%.
                </div>
              </div>
            </Panel>

            <Panel title="Key statistics" flush style={{ flex: 1 }}>
              <table className="t" style={{ width: "100%" }}>
                <tbody>
                  {[
                    ["Market cap", "$" + (s.marketCap / 1e9).toFixed(1) + "B", "P/E", s.peRatio.toFixed(1)],
                    ["P / AFFO", "16.2", "P / Book", s.pb.toFixed(2)],
                    ["Beta · 5y", s.beta.toFixed(2), "Debt / Eq", s.debtEq.toFixed(2)],
                    ["AFFO payout", "76.8%", "FCF payout", "76.0%"],
                    ["Net debt / EBITDA", "5.9×", "Interest cover", "3.4×"],
                    ["52w range", "$50.71 – $62.40", "RSI · 14", "54.2"],
                    ["Ex-div", s.exDiv, "Pay date", s.payDate],
                    ["Frequency", s.freq, "Decl. by", "BOD"],
                    ["Domicile", "US · Delaware", "Withhold (NL)", "15%"],
                  ].map((row, i) => (
                    <tr key={i}>
                      <td className="l dim" style={{ fontSize: 10, width: "26%" }}>{row[0]}</td>
                      <td className="r" style={{ width: "24%" }}>{row[1]}</td>
                      <td className="l dim" style={{ fontSize: 10, width: "26%", borderLeft: "1px solid var(--border)", paddingLeft: 12 }}>{row[2]}</td>
                      <td className="r" style={{ width: "24%" }}>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, { StockScreen, PriceChart, DivHistChart });

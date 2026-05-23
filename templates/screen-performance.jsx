// screen-performance.jsx — Performance vs benchmark

function PerfChart({ series, w = 920, h = 280 }) {
  const pad = { t: 18, r: 64, b: 24, l: 8 };
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
        <linearGradient id="g-p" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* zero line */}
      <line x1={pad.l} x2={W - pad.r} y1={ys(0)} y2={ys(0)} stroke="var(--border-strong)" strokeWidth="0.8" />
      {/* grid */}
      {[max, max * 0.5, 0, min * 0.5].filter(v => v >= min && v <= max).map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={ys(v)} y2={ys(v)}
            stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 3" />
          <text x={W - pad.r + 6} y={ys(v) + 3}
            style={{ fontSize: 10, fill: "var(--muted)", fontFamily: "var(--ff-mono)" }}>
            {(v >= 0 ? "+" : "") + v.toFixed(1) + "%"}
          </text>
        </g>
      ))}
      {/* area of portfolio */}
      <path d={path("p") + ` L ${xs(series.length - 1)},${pad.t + ih} L ${xs(0)},${pad.t + ih} Z`} fill="url(#g-p)" />
      <path d={path("s")} fill="none" stroke="var(--info)" strokeWidth="1.4" strokeDasharray="4 3" />
      <path d={path("b")} fill="none" stroke="var(--dim)" strokeWidth="1.4" />
      <path d={path("p")} fill="none" stroke="var(--accent)" strokeWidth="2" />

      {/* endpoint pills */}
      {[
        { v: last.p, c: "var(--accent)", l: "PORT" },
        { v: last.b, c: "var(--dim)", l: "STOXX 600" },
        { v: last.s, c: "var(--info)", l: "S&P 500 €H" },
      ].map((p, i) => (
        <g key={i}>
          <rect x={W - pad.r - 6} y={ys(p.v) - 7} width="64" height="14" fill={p.c} />
          <text x={W - pad.r + 26} y={ys(p.v) + 3} textAnchor="middle"
            style={{ fontSize: 10, fill: "var(--bg)", fontFamily: "var(--ff-mono)", fontWeight: 700 }}>
            {(p.v >= 0 ? "+" : "") + p.v.toFixed(1) + "%"}
          </text>
        </g>
      ))}

      {/* x labels */}
      {[0, 6, 12, 18, 23].map((i, k) => (
        <text key={k} x={xs(i)} y={H - 8} textAnchor="middle"
          style={{ fontSize: 9.5, fill: "var(--muted)", fontFamily: "var(--ff-mono)" }}>
          {["May '24","Nov '24","May '25","Nov '25","May '26"][k]}
        </text>
      ))}
    </svg>
  );
}

function PerformanceScreen({ tweak }) {
  const last = PERF[PERF.length - 1];
  // Best/worst contributors
  const contribs = HOLDINGS.map(h => ({
    ...h,
    pl: (valueEUR(h) - costEUR(h)),
    plP: ((h.p - h.cp) / h.cp) * 100,
  }));
  const winners = [...contribs].sort((a, b) => b.pl - a.pl).slice(0, 5);
  const losers  = [...contribs].sort((a, b) => a.pl - b.pl).slice(0, 5);

  const periodMetrics = [
    { l: "1M",  p: 1.42, b: 0.88, s: 1.21 },
    { l: "3M",  p: 4.36, b: 3.12, s: 4.85 },
    { l: "YTD", p: 11.42, b: 6.84, s: 9.74 },
    { l: "1Y",  p: 18.84, b: 11.20, s: 16.45 },
    { l: "3Y",  p: 38.20, b: 22.40, s: 31.80 },
    { l: "5Y",  p: 74.65, b: 41.20, s: 68.30 },
    { l: "Inc.", p: 142.30, b: 88.40, s: 124.50 },
  ];

  return (
    <Screen tweak={tweak} active="Portfolio" statusLeft="PERFORMANCE"
      statusSegs={["Net of fees", "Time-weighted", "Reinv. divs", "Hedged EUR"]}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 8, gap: 8, minHeight: 0 }}>
        <StatStrip cols={6} items={[
          { label: "TWR · YTD", value: <span className="up">+{last.p.toFixed(2)}%</span>, sub: <span className="up">+{(last.p - last.b).toFixed(2)}pp vs STOXX 600</span> },
          { label: "IRR · since incept.", value: <span className="up">+12.4%</span>, sub: <span className="dim">annualised · 4y 2m</span> },
          { label: "Sharpe · 1y", value: "1.32", sub: <span className="dim">rf 3.5% · Sortino 1.84</span> },
          { label: "Max drawdown", value: <span className="down">−14.2%</span>, sub: <span className="dim">Oct '23 · recovered Mar '24</span> },
          { label: "Beta · 5y", value: "0.82", sub: <span className="dim">vs STOXX 600</span> },
          { label: "Win rate · monthly", value: "67%", sub: <span className="dim">16 / 24 months</span> },
        ]} />

        <Panel title="Cumulative total return · 24 months" tag="time-weighted · gross"
          headRight={
            <span style={{ display: "flex", gap: 14, marginLeft: 14, fontSize: 9.5, color: "var(--muted)" }}>
              <span><i style={{ display: "inline-block", width: 14, height: 2, background: "var(--accent)", verticalAlign: "middle", marginRight: 4 }} /> Portfolio</span>
              <span><i style={{ display: "inline-block", width: 14, height: 2, background: "var(--dim)", verticalAlign: "middle", marginRight: 4 }} /> STOXX 600 TR</span>
              <span><i style={{ display: "inline-block", width: 14, height: 2, background: "var(--info)", verticalAlign: "middle", marginRight: 4 }} /> S&P 500 EUR-hedged</span>
            </span>
          }
          style={{ flex: "0 0 320px" }}>
          <PerfChart series={PERF} w={1200} h={290} />
        </Panel>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8, flex: 1, minHeight: 0 }}>
          <Panel title="Period returns" tag="vs benchmarks" flush>
            <table className="t" style={{ width: "100%" }}>
              <thead><tr>
                <th>PERIOD</th>
                <th className="r">PORT.</th>
                <th className="r">STOXX 600</th>
                <th className="r">S&P €H</th>
                <th className="r">ALPHA EU</th>
                <th className="r">ALPHA US</th>
                <th style={{ width: 130 }}>VS STOXX</th>
              </tr></thead>
              <tbody>
                {periodMetrics.map((p, i) => {
                  const aE = p.p - p.b, aS = p.p - p.s;
                  return (
                    <tr key={p.l}>
                      <td className="l" style={{ fontWeight: 600 }}>{p.l}</td>
                      <td className="r up">+{p.p.toFixed(2)}%</td>
                      <td className="r">+{p.b.toFixed(2)}%</td>
                      <td className="r">+{p.s.toFixed(2)}%</td>
                      <td className={"r " + (aE >= 0 ? "up" : "down")}>{aE >= 0 ? "+" : ""}{aE.toFixed(2)}pp</td>
                      <td className={"r " + (aS >= 0 ? "up" : "down")}>{aS >= 0 ? "+" : ""}{aS.toFixed(2)}pp</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 4, height: 16, background: aE >= 0 ? "var(--up)" : "var(--down)" }} />
                          <div style={{ flex: 1, height: 14, background: "var(--surface-3)", position: "relative" }}>
                            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--text-2)" }} />
                            <div style={{ position: "absolute", top: 1, bottom: 1,
                              [aE >= 0 ? "left" : "right"]: "50%",
                              width: `${Math.min(50, Math.abs(aE) * 1.5)}%`,
                              background: aE >= 0 ? "var(--up)" : "var(--down)", opacity: 0.6 }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          <Panel title="Top contributors" tag="YTD P/L €" flush>
            <table className="t" style={{ width: "100%" }}>
              <thead><tr>
                <th>TICKER</th>
                <th className="r">P/L €</th>
                <th className="r">RTN%</th>
                <th>IMPACT</th>
              </tr></thead>
              <tbody>
                {winners.map((w) => {
                  const impact = (w.pl / 41450) * 100;
                  return (
                    <tr key={w.t}>
                      <td className="l" style={{ fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Flag c={w.c} />{w.t}
                        </span>
                      </td>
                      <td className="r up blur-sensitive">+{fmt.money(w.pl, "EUR", { dec: 0 })}</td>
                      <td className="r up">+{w.plP.toFixed(1)}%</td>
                      <td><MiniBar pct={Math.min(100, impact * 2.5)} w={70} color="var(--up)" /></td>
                    </tr>
                  );
                })}
                <tr style={{ height: 6 }}><td colSpan={4} style={{ background: "var(--bg-sub)" }}></td></tr>
                {losers.filter(l => l.pl < 0).map((w) => {
                  const impact = (Math.abs(w.pl) / 41450) * 100;
                  return (
                    <tr key={w.t}>
                      <td className="l" style={{ fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Flag c={w.c} />{w.t}
                        </span>
                      </td>
                      <td className="r down blur-sensitive">{fmt.money(w.pl, "EUR", { dec: 0 })}</td>
                      <td className="r down">{w.plP.toFixed(1)}%</td>
                      <td><MiniBar pct={Math.min(100, impact * 2.5)} w={70} color="var(--down)" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          <Panel title="Risk · ratios" tag="rolling 1y" flush>
            <div style={{ display: "flex", flexDirection: "column", padding: 0 }}>
              <table className="t" style={{ width: "100%" }}>
                <tbody>
                  {[
                    ["Volatility (σ)", "11.4%", "↓ vs 13.8% bench", "var(--up)"],
                    ["Sharpe", "1.32", "↑ vs 0.94", "var(--up)"],
                    ["Sortino", "1.84", "good · downside σ 6.2%", "var(--up)"],
                    ["Calmar", "0.87", "rtn / max DD", "var(--text-2)"],
                    ["Beta vs STOXX", "0.82", "defensive tilt", "var(--text-2)"],
                    ["Alpha (Jensen)", "+3.2%", "annualised", "var(--up)"],
                    ["Correl. vs STOXX", "0.71", "moderate", "var(--text-2)"],
                    ["Tracking error", "5.4%", "active", "var(--text-2)"],
                    ["Info ratio", "0.92", "skill > noise", "var(--up)"],
                    ["Max drawdown", "−14.2%", "recovered in 5mo", "var(--down)"],
                  ].map((r, i) => (
                    <tr key={i}>
                      <td className="l dim" style={{ fontSize: 10 }}>{r[0]}</td>
                      <td className="r" style={{ color: r[3], fontWeight: 500 }}>{r[1]}</td>
                      <td className="l dim" style={{ fontSize: 9.5, paddingLeft: 8 }}>{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, { PerformanceScreen, PerfChart });

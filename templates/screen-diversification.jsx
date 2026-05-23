// screen-diversification.jsx — sector + geo + concentration analysis

// Simple slice-and-dice treemap (row-based, not optimal but readable + dense)
function Treemap({ data, w = 600, h = 280, valueKey = "v", labelKey = "k", colorAt }) {
  const total = data.reduce((s, d) => s + d[valueKey], 0);
  // group into rows of ~2-3 items
  const rows = [];
  let cur = [], curSum = 0;
  const targetRowFrac = 0.34;
  for (let i = 0; i < data.length; i++) {
    cur.push(data[i]);
    curSum += data[i][valueKey];
    if (curSum / total >= targetRowFrac || i === data.length - 1) {
      rows.push({ items: cur, sum: curSum });
      cur = []; curSum = 0;
    }
  }
  let y = 0;
  const cells = [];
  rows.forEach((row, ri) => {
    const rowH = (row.sum / total) * h;
    let x = 0;
    row.items.forEach((it, ii) => {
      const cellW = (it[valueKey] / row.sum) * w;
      cells.push({ x, y, w: cellW, h: rowH, d: it, ri, ii });
      x += cellW;
    });
    y += rowH;
  });
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      {cells.map((c, i) => (
        <g key={i}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h}
            fill={colorAt(c.d, i)} stroke="var(--bg)" strokeWidth="1" />
          {c.w > 40 && c.h > 24 && (
            <>
              <text x={c.x + 6} y={c.y + 14}
                style={{ fontSize: Math.min(12, Math.max(9, c.w * 0.08)), fill: "var(--bg)", fontWeight: 600 }}>
                {c.d[labelKey]}
              </text>
              <text x={c.x + 6} y={c.y + c.h - 6}
                style={{ fontSize: 10, fill: "var(--bg)", opacity: 0.85, fontFamily: "var(--ff-mono)" }}>
                {c.d[valueKey].toFixed(1)}%
              </text>
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

function ConcentrationGauge({ value, label, max = 100, color }) {
  // horizontal slim gauge with thresholds
  return (
    <div style={{ padding: "8px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>{label}</span>
        <span className="num" style={{ fontSize: 14, fontWeight: 500, color }}>{value.toFixed(2)}</span>
      </div>
      <div style={{ position: "relative", height: 8, background: "var(--surface-3)", marginTop: 6 }}>
        <div style={{ position: "absolute", inset: 0, width: `${(value / max) * 100}%`, background: color }} />
        {/* threshold ticks at 25, 50, 75 */}
        {[0.25, 0.5, 0.75].map((t, i) => (
          <div key={i} style={{ position: "absolute", top: -2, bottom: -2, left: `${t*100}%`, width: 1, background: "var(--bg)" }} />
        ))}
      </div>
    </div>
  );
}

function DiversificationScreen({ tweak }) {
  // HHI calculations
  const sumPos = HOLDINGS.reduce((s, h) => s + valueEUR(h), 0);
  const hhi = HOLDINGS.reduce((s, h) => s + Math.pow((valueEUR(h) / sumPos) * 100, 2), 0);
  const top5 = HOLDINGS.map(h => valueEUR(h)).sort((a, b) => b - a).slice(0, 5).reduce((s, v) => s + v, 0) / sumPos * 100;
  const top10 = HOLDINGS.map(h => valueEUR(h)).sort((a, b) => b - a).slice(0, 10).reduce((s, v) => s + v, 0) / sumPos * 100;

  // Currency mix (by income source)
  const ccyMix = {};
  HOLDINGS.forEach(h => { ccyMix[h.x] = (ccyMix[h.x] || 0) + fwdIncomeEUR(h); });
  const totIncome = Object.values(ccyMix).reduce((a, b) => a + b, 0);
  const ccyData = Object.entries(ccyMix).map(([k, v]) => ({ k, v: (v / totIncome) * 100 })).sort((a, b) => b.v - a.v);

  return (
    <Screen tweak={tweak} active="Research" statusLeft="DIVERSIFICATION"
      statusSegs={["By value · €", "Excl. cash", "HHI 1043 · low conc.", "32 positions · 8 ccy"]}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 8, gap: 8, minHeight: 0 }}>
        <StatStrip cols={6} items={[
          { label: "HHI · concentration", value: hhi.toFixed(0), sub: <span className="up">low · ideal {"<"} 1500</span> },
          { label: "Top 5 weight", value: top5.toFixed(1) + "%", sub: <span className="dim">target {"<"} 40%</span> },
          { label: "Top 10 weight", value: top10.toFixed(1) + "%", sub: <span className="dim">target {"<"} 60%</span> },
          { label: "Effective N", value: (10000 / hhi).toFixed(1), sub: <span className="dim">vs nominal {HOLDINGS.length}</span> },
          { label: "Currencies", value: Object.keys(ccyMix).length, sub: <span className="dim">EUR 35% · non-EUR 65%</span> },
          { label: "Single largest", value: "5.7%", sub: <span className="mono dim">JNJ · Healthcare · US</span> },
        ]} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, flex: 1, minHeight: 0 }}>
          <Panel title="Sectors · % of portfolio value" tag="GICS" flush>
            <div style={{ padding: 8, height: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                <Treemap data={SECTORS} w={720} h={340}
                  colorAt={(d, i) => {
                    const hues = [148, 130, 110, 90, 60, 35, 20, 245, 270, 300];
                    return `oklch(0.65 0.14 ${hues[i % hues.length]})`;
                  }} />
              </div>
              <table className="t" style={{ width: "100%" }}>
                <thead><tr>
                  <th>SECTOR</th>
                  <th className="r">VALUE %</th>
                  <th className="r">INCOME %</th>
                  <th className="r">YIELD</th>
                  <th>VS BENCH</th>
                </tr></thead>
                <tbody>
                  {SECTORS.slice(0, 5).map((s, i) => {
                    const bench = [11, 13, 22, 3, 5][i] || 8;
                    const diff = s.v - bench;
                    return (
                      <tr key={s.k}>
                        <td className="l">{s.k}</td>
                        <td className="r">{s.v.toFixed(1)}%</td>
                        <td className="r blur-sensitive mono">{((s.i / 7412.84) * 100).toFixed(1)}%</td>
                        <td className="r mono">{((s.i / (s.v * sumPos / 100)) * 100).toFixed(2)}%</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <div style={{ flex: 1, height: 12, background: "var(--surface-3)", position: "relative" }}>
                              <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: "var(--text-2)" }} />
                              <div style={{ position: "absolute", top: 0, bottom: 0,
                                [diff >= 0 ? "left" : "right"]: "50%",
                                width: `${Math.min(50, Math.abs(diff) * 3)}%`,
                                background: diff >= 0 ? "var(--up)" : "var(--down)" }} />
                            </div>
                            <span className={"mono " + (diff >= 0 ? "up" : "down")} style={{ marginLeft: 6, fontSize: 9.5, minWidth: 38, textAlign: "right" }}>
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
          </Panel>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Panel title="Geographic exposure" tag="domicile" flush>
              <div style={{ padding: 8, display: "flex", gap: 8 }}>
                <div style={{ flex: 1.4 }}>
                  <Treemap data={GEO} w={420} h={180}
                    colorAt={(d, i) => {
                      const hues = [245, 250, 235, 220, 210, 200, 260, 195];
                      return `oklch(0.62 0.12 ${hues[i % hues.length]})`;
                    }} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, fontSize: 10.5 }}>
                  {GEO.map((g, i) => (
                    <div key={g.k} style={{ display: "flex", alignItems: "center", gap: 6, padding: "1px 2px" }}>
                      <span style={{ width: 8, height: 8, background: `oklch(0.62 0.12 ${[245, 250, 235, 220, 210, 200, 260, 195][i]})`, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: "var(--text-2)" }}>{g.k}</span>
                      <span className="mono" style={{ minWidth: 36, textAlign: "right" }}>{g.v.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel title="Currency mix · by income €" tag="forward 12m" flush>
              <div style={{ padding: 10 }}>
                {/* horizontal stacked bar */}
                <div style={{ display: "flex", height: 22, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 8 }}>
                  {ccyData.map((c, i) => (
                    <div key={c.k} style={{ width: `${c.v}%`, background: `oklch(0.62 0.12 ${[148, 245, 95, 35, 280, 200][i]})`, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg)", fontSize: 10, fontFamily: "var(--ff-mono)", fontWeight: 600 }}>
                      {c.v > 6 ? c.k : ""}
                    </div>
                  ))}
                </div>
                <table className="t" style={{ width: "100%" }}>
                  <thead><tr>
                    <th>CCY</th>
                    <th className="r">FWD INC €</th>
                    <th className="r">SHARE</th>
                    <th className="r">FX → EUR</th>
                    <th className="r">WTH</th>
                  </tr></thead>
                  <tbody>
                    {ccyData.map((c) => (
                      <tr key={c.k}>
                        <td className="l" style={{ fontWeight: 600 }}>{c.k}</td>
                        <td className="r blur-sensitive">{fmt.money(ccyMix[c.k], "EUR", { dec: 0 })}</td>
                        <td className="r">{c.v.toFixed(1)}%</td>
                        <td className="r dim">{FX[c.k].toFixed(4)}</td>
                        <td className="r mono dim">{c.k === "CHF" ? "35%" : c.k === "USD" ? "15%" : c.k === "GBP" ? "0%" : c.k === "CAD" ? "15%" : "0%"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Concentration check" tag="thresholds" flush>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--border)" }}>
                <div style={{ background: "var(--surface)" }}>
                  <ConcentrationGauge label="HHI" value={hhi} max={2500} color="var(--up)" />
                </div>
                <div style={{ background: "var(--surface)" }}>
                  <ConcentrationGauge label="Top 5 weight" value={top5} max={100} color="var(--text)" />
                </div>
                <div style={{ background: "var(--surface)" }}>
                  <ConcentrationGauge label="Top 10 weight" value={top10} max={100} color="var(--text)" />
                </div>
                <div style={{ background: "var(--surface)" }}>
                  <ConcentrationGauge label="Single largest %" value={5.7} max={20} color="var(--up)" />
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, { DiversificationScreen, Treemap });

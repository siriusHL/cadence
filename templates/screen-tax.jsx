// screen-tax.jsx — Tax / withholding report

function TaxScreen({ tweak }) {
  const totalGross = TAX.reduce((s, t) => s + t.gross * (FX[t.ccy] || 1), 0);
  const totalWith = TAX.reduce((s, t) => s + t.withheld * (FX[t.ccy] || 1), 0);
  const totalNet = totalGross - totalWith;

  const treatyOpps = [
    { c: "Switzerland", n: "NESN", recover: 0.20, amt: 88.48, action: "File DA-1 form via broker" },
    { c: "Germany",     n: "ALV",  recover: 0.11, amt: 69.79, action: "Treaty reclaim · BZSt" },
    { c: "France",      n: "MC, OR", recover: 0.028, amt: 22.74, action: "Form 5000 + 5001 to French tax auth." },
  ];

  return (
    <Screen tweak={tweak} active="Tax" statusLeft="WITHHOLDING · 2026 YTD"
      statusSegs={["Resident: NL", "Box 3 ready: Feb '27", "Recovery filed: 0/3", "Reclaimable €180.99"]}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 8, gap: 8, minHeight: 0 }}>
        <StatStrip cols={5} items={[
          { label: "Gross dividends · YTD", value: <span className="blur-sensitive">{fmt.money(totalGross, "EUR", { dec: 0 })}</span>, sub: <span className="dim">across 8 jurisdictions</span> },
          { label: "Withheld at source", value: <span className="blur-sensitive">{fmt.money(totalWith, "EUR", { dec: 0 })}</span>, sub: <span className="mono">{((totalWith / totalGross) * 100).toFixed(1)}% effective</span> },
          { label: "Net received", value: <span className="blur-sensitive">{fmt.money(totalNet, "EUR", { dec: 0 })}</span>, sub: <span className="up">15% NL Box 1 credit</span> },
          { label: "Reclaimable", value: <span className="up blur-sensitive">€180.99</span>, sub: <span className="warn">3 unfiled · CH, DE, FR</span> },
          { label: "Est. final tax", value: <span className="blur-sensitive">{fmt.money(totalGross * 0.265, "EUR", { dec: 0 })}</span>, sub: <span className="dim">NL Box 1 marginal 36.97%</span> },
        ]} />

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8, flex: 1, minHeight: 0 }}>
          <Panel title="Withholding by jurisdiction" tag="2026 YTD · EUR equiv." flush>
            <div style={{ height: "100%", overflow: "auto" }}>
              <table className="t" style={{ width: "100%" }}>
                <thead><tr>
                  <th>COUNTRY</th>
                  <th>CCY</th>
                  <th className="r">GROSS LOCAL</th>
                  <th className="r">GROSS €</th>
                  <th className="r">STATUTORY</th>
                  <th className="r">TREATY</th>
                  <th className="r">EFFECTIVE</th>
                  <th className="r">WITHHELD €</th>
                  <th className="r">NET €</th>
                  <th className="c">STATUS</th>
                </tr></thead>
                <tbody>
                  {TAX.map((row, i) => {
                    const grossEur = row.gross * (FX[row.ccy] || 1);
                    const withEur  = row.withheld * (FX[row.ccy] || 1);
                    const netEur   = grossEur - withEur;
                    const statutory = { "United States": 30, "Switzerland": 35, "Germany": 26.375, "France": 25, "Canada": 25, "Spain": 19, "United Kingdom": 0, "Netherlands": 15 }[row.c] || row.rate;
                    return (
                      <tr key={row.c}>
                        <td className="l" style={{ fontWeight: 600 }}>{row.c}</td>
                        <td className="c dim">{row.ccy}</td>
                        <td className="r blur-sensitive">{row.gross.toFixed(2)}</td>
                        <td className="r blur-sensitive">{fmt.money(grossEur, "EUR", { dec: 2 })}</td>
                        <td className="r dim">{statutory.toFixed(1)}%</td>
                        <td className="r">{row.rate.toFixed(1)}%</td>
                        <td className="r mono" style={{ color: row.rate < statutory ? "var(--up)" : "var(--text)" }}>
                          {row.rate.toFixed(1)}%
                        </td>
                        <td className="r blur-sensitive down">{withEur > 0 ? "−" + fmt.money(withEur, "EUR", { dec: 2 }).replace("€", "€") : "—"}</td>
                        <td className="r blur-sensitive" style={{ color: "var(--accent)", fontWeight: 500 }}>{fmt.money(netEur, "EUR", { dec: 2 })}</td>
                        <td className="c">
                          {row.rate < statutory
                            ? <span className="chip up">treaty ✓</span>
                            : row.c === "Switzerland" || row.c === "Germany" || row.c === "France"
                              ? <span className="chip warn">reclaim</span>
                              : <span className="chip">final</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="l" style={{ fontWeight: 600, color: "var(--muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 10px", background: "var(--bg-sub)" }} colSpan={3}>Σ TOTALS</td>
                    <td className="r blur-sensitive" style={{ background: "var(--bg-sub)", fontWeight: 600 }}>{fmt.money(totalGross, "EUR", { dec: 2 })}</td>
                    <td className="r" style={{ background: "var(--bg-sub)" }}></td>
                    <td className="r" style={{ background: "var(--bg-sub)" }}></td>
                    <td className="r mono" style={{ background: "var(--bg-sub)" }}>{((totalWith / totalGross) * 100).toFixed(1)}%</td>
                    <td className="r down blur-sensitive" style={{ background: "var(--bg-sub)", fontWeight: 600 }}>−{fmt.money(totalWith, "EUR", { dec: 2 })}</td>
                    <td className="r blur-sensitive" style={{ background: "var(--bg-sub)", fontWeight: 600, color: "var(--accent)" }}>{fmt.money(totalNet, "EUR", { dec: 2 })}</td>
                    <td className="c" style={{ background: "var(--bg-sub)" }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Panel title="Reclaim opportunities" tag="treaty vs statutory">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {treatyOpps.map((o, i) => (
                  <div key={i} style={{ padding: 8, border: "1px solid var(--border)", background: "var(--bg-sub)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{o.c}</span>
                      <span className="num blur-sensitive" style={{ color: "var(--up)", fontSize: 13 }}>+{fmt.money(o.amt, "EUR", { dec: 2 })}</span>
                    </div>
                    <div className="dim" style={{ fontSize: 10, marginBottom: 4 }}>
                      Holdings: <span className="mono" style={{ color: "var(--text-2)" }}>{o.n}</span> · recover <span className="mono up">{(o.recover * 100).toFixed(1)}pp</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "var(--text-2)", flex: 1 }}>{o.action}</span>
                      <span className="chip info">prep form</span>
                    </div>
                  </div>
                ))}
                <div style={{ padding: 6, fontSize: 10, color: "var(--text-2)", borderTop: "1px solid var(--border)", marginTop: 4 }}>
                  Cadence auto-generates form templates with your broker statement data. <span className="mono up">€180.99 unclaimed</span> · est. <span className="mono">8h</span> total effort.
                </div>
              </div>
            </Panel>

            <Panel title="NL Box 3 simulation · FY 2026" tag="resident · forfaitair" flush>
              <table className="t" style={{ width: "100%" }}>
                <tbody>
                  <tr>
                    <td className="l dim" style={{ fontSize: 10 }}>Assets · 1 Jan 2026</td>
                    <td className="r blur-sensitive">€178,420</td>
                  </tr>
                  <tr>
                    <td className="l dim" style={{ fontSize: 10 }}>Heffingvrij vermogen</td>
                    <td className="r dim">−€57,000</td>
                  </tr>
                  <tr>
                    <td className="l dim" style={{ fontSize: 10 }}>Belastbare grondslag</td>
                    <td className="r blur-sensitive">€121,420</td>
                  </tr>
                  <tr>
                    <td className="l dim" style={{ fontSize: 10 }}>Forfaitair rendement · 6.04%</td>
                    <td className="r blur-sensitive">€7,333</td>
                  </tr>
                  <tr>
                    <td className="l" style={{ fontSize: 11, fontWeight: 600 }}>Box 3 tax · 36%</td>
                    <td className="r blur-sensitive" style={{ fontWeight: 600, color: "var(--down)" }}>−€2,640</td>
                  </tr>
                  <tr>
                    <td className="l up" style={{ fontSize: 10 }}>Foreign WTH credit</td>
                    <td className="r blur-sensitive up">+€{(totalWith).toFixed(0)}</td>
                  </tr>
                  <tr style={{ background: "var(--bg-sub)" }}>
                    <td className="l" style={{ fontSize: 11, fontWeight: 700 }}>Net Box 3 due</td>
                    <td className="r blur-sensitive" style={{ fontWeight: 700, color: "var(--down)" }}>−€{(2640 - totalWith).toFixed(0)}</td>
                  </tr>
                </tbody>
              </table>
            </Panel>

            <Panel title="Year-over-year" tag="effective rate" flush>
              <div style={{ padding: "8px 12px", display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
                {[
                  { y: "2022", g: 4120, w: 815, eff: 19.8 },
                  { y: "2023", g: 5240, w: 980, eff: 18.7 },
                  { y: "2024", g: 5840, w: 1080, eff: 18.5 },
                  { y: "2025", g: 6510, w: 1095, eff: 16.8 },
                  { y: "2026P", g: 7322, w: 1170, eff: 16.0 },
                ].map((y, i, arr) => {
                  const max = Math.max(...arr.map(a => a.g));
                  return (
                    <div key={y.y} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <span className="mono" style={{ fontSize: 9, color: "var(--down)" }}>{y.eff.toFixed(1)}%</span>
                      <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 50, position: "relative" }}>
                        <div style={{ width: "100%", height: `${(y.w / max) * 100}%`, background: "var(--down)" }} />
                        <div style={{ width: "100%", height: `${((y.g - y.w) / max) * 100}%`, background: "var(--accent)", marginTop: 1 }} />
                      </div>
                      <span className="mono" style={{ fontSize: 9, color: "var(--text-2)" }}>{y.y}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, { TaxScreen });

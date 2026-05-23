// screen-holdings.jsx — Holdings table, extremely dense

function HoldingsScreen({ tweak }) {
  const rows = HOLDINGS.map(h => {
    const valE = valueEUR(h), costE = costEUR(h);
    const incE = fwdIncomeEUR(h);
    const pl = valE - costE;
    const plP = (pl / costE) * 100;
    const yld = fwdYield(h);
    const y_oc = yoc(h);
    const wgt = (valE / 184320.55) * 100;
    return { h, valE, costE, incE, pl, plP, yld, y_oc, wgt };
  }).sort((a, b) => b.valE - a.valE);

  const totalVal = rows.reduce((s, r) => s + r.valE, 0);
  const totalInc = rows.reduce((s, r) => s + r.incE, 0);

  // Mini histogram for yield distribution (footer)
  return (
    <Screen tweak={tweak} active="Portfolio" statusLeft="HOLDINGS · 32"
      statusSegs={["Sort: Value ▼", "Filter: All", "AT/IT splits in: cost", "Last sync 17:34:51"]}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 8, gap: 8, minHeight: 0 }}>

        {/* sub-toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
          <div className="kbar">
            <span><b>F</b> filter</span>
            <span><b>S</b> sort</span>
            <span><b>G</b> group</span>
            <span><b>+</b> add lot</span>
            <span><b>/</b> search</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <span className="chip">{rows.length} positions</span>
            <span className="chip">8 currencies</span>
            <span className="chip up">Income +12.4% YoY</span>
            <span className="chip">Cost {fmt.money(rows.reduce((s,r)=>s+r.costE,0), "EUR", { dec: 0 })}</span>
          </div>
        </div>

        <Panel flush style={{ flex: 1, minHeight: 0 }}>
          <div style={{ overflow: "auto", height: "100%" }}>
            <table className="t">
              <thead>
                <tr>
                  <th style={{ width: 28 }}>#</th>
                  <th>TICKER</th>
                  <th>NAME</th>
                  <th className="c">CCY</th>
                  <th className="r">QTY</th>
                  <th className="r">AVG</th>
                  <th className="r">PRICE</th>
                  <th className="r">DAY %</th>
                  <th className="r">VALUE €</th>
                  <th className="r">WEIGHT</th>
                  <th className="r">P/L €</th>
                  <th className="r">P/L %</th>
                  <th className="r">FWD DIV</th>
                  <th className="r">FREQ</th>
                  <th className="r">YIELD</th>
                  <th className="r">YoC</th>
                  <th className="r">FWD €</th>
                  <th className="r">5Y CAGR</th>
                  <th className="r">PAYOUT</th>
                  <th className="c">GRADE</th>
                  <th>SPARK</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const h = r.h;
                  // Synthesize fake day change and spark for each
                  const seed = h.t.charCodeAt(0) + h.t.length;
                  const day = ((seed * 13) % 230) / 100 - 1.15;
                  const spark = Array.from({ length: 24 }, (_, k) => {
                    return 50 + Math.sin(k * 0.3 + seed) * 8 + Math.cos(k * 0.4) * 4 + (k * day * 0.3);
                  });
                  const isSel = h.t === "O";
                  const cagr = 3 + ((seed * 7) % 110) / 10;
                  const payout = 35 + ((seed * 11) % 600) / 10;
                  return (
                    <tr key={h.t} className={isSel ? "row-sel" : ""}>
                      <td className="dim" style={{ fontSize: 9.5 }}>{String(i + 1).padStart(2, "0")}</td>
                      <td className="l" style={{ fontWeight: 600, color: "var(--text)" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Flag c={h.c} />{h.t}
                        </span>
                      </td>
                      <td className="l" style={{ color: "var(--text-2)" }}>{h.n}</td>
                      <td className="c dim">{h.x}</td>
                      <td className="r blur-sensitive">{h.q}</td>
                      <td className="r">{h.cp.toFixed(2)}</td>
                      <td className="r" style={{ color: "var(--text)" }}>{h.p.toFixed(2)}</td>
                      <td className="r"><Chg v={day} withPct withSign={false} /></td>
                      <td className="r blur-sensitive" style={{ color: "var(--text)", fontWeight: 500 }}>{fmt.money(r.valE, "EUR", { dec: 0 })}</td>
                      <td className="r">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                          <MiniBar pct={r.wgt * 5} w={36} color="var(--accent-soft)" />
                          <span>{r.wgt.toFixed(2)}%</span>
                        </span>
                      </td>
                      <td className={"r blur-sensitive " + (r.pl >= 0 ? "up" : "down")}>{r.pl >= 0 ? "+" : ""}{fmt.money(r.pl, "EUR", { dec: 0 })}</td>
                      <td className={"r " + (r.plP >= 0 ? "up" : "down")}>{r.plP >= 0 ? "+" : ""}{r.plP.toFixed(2)}%</td>
                      <td className="r">{h.d.toFixed(2)}</td>
                      <td className="r dim" style={{ fontSize: 10 }}>{h.f === 12 ? "Mon" : h.f === 4 ? "Qtr" : h.f === 2 ? "Semi" : "Ann"}</td>
                      <td className="r">{r.yld.toFixed(2)}%</td>
                      <td className="r up" style={{ opacity: 0.85 }}>{r.y_oc.toFixed(2)}%</td>
                      <td className="r blur-sensitive">{fmt.money(r.incE, "EUR", { dec: 0 })}</td>
                      <td className="r">{cagr.toFixed(1)}%</td>
                      <td className="r">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                          <MiniBar pct={payout} w={28} color={payout > 80 ? "var(--down)" : payout > 60 ? "var(--warn)" : "var(--up)"} />
                          <span>{payout.toFixed(0)}%</span>
                        </span>
                      </td>
                      <td className="c"><Grade g={h.g} /></td>
                      <td>
                        <Sparkline data={spark} w={56} h={14}
                          stroke={day >= 0 ? "var(--up)" : "var(--down)"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={8} className="l" style={{ fontWeight: 600, color: "var(--muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 10px" }}>Σ totals</td>
                  <td className="r blur-sensitive" style={{ fontWeight: 600, background: "var(--bg-sub)" }}>{fmt.money(totalVal, "EUR", { dec: 0 })}</td>
                  <td className="r" style={{ background: "var(--bg-sub)" }}>100.00%</td>
                  <td className="r up blur-sensitive" style={{ fontWeight: 600, background: "var(--bg-sub)" }}>+{fmt.money(rows.reduce((s, r) => s + r.pl, 0), "EUR", { dec: 0 })}</td>
                  <td className="r up" style={{ background: "var(--bg-sub)" }}>+29.01%</td>
                  <td className="r" style={{ background: "var(--bg-sub)" }} colSpan={2}></td>
                  <td className="r" style={{ background: "var(--bg-sub)" }}>4.02%</td>
                  <td className="r up" style={{ background: "var(--bg-sub)" }}>5.19%</td>
                  <td className="r blur-sensitive" style={{ fontWeight: 600, background: "var(--bg-sub)" }}>{fmt.money(totalInc, "EUR", { dec: 0 })}</td>
                  <td className="r" style={{ background: "var(--bg-sub)" }}>7.8%</td>
                  <td className="r" style={{ background: "var(--bg-sub)" }}>56.4%</td>
                  <td className="c" style={{ background: "var(--bg-sub)" }}><Grade g="A" /></td>
                  <td style={{ background: "var(--bg-sub)" }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      </div>
    </Screen>
  );
}

Object.assign(window, { HoldingsScreen });

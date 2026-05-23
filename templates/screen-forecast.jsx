// screen-forecast.jsx — 12-month income forecast & cashflow

function ForecastChart({ monthly, w = 900, h = 280 }) {
  const pad = { t: 18, r: 50, b: 30, l: 50 };
  const W = w, H = h, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(...monthly.map(m => m.eur)) * 1.22;
  const bw = iw / monthly.length;

  // Cumulative line
  let cum = 0;
  const cums = monthly.map(m => { cum += m.eur; return cum; });
  const cumMax = cums[cums.length - 1] * 1.1;
  const xs = (i) => pad.l + (i + 0.5) * bw;
  const ysL = (v) => pad.t + ih - (v / cumMax) * ih;
  const linePath = cums.map((v, i) => (i === 0 ? "M" : "L") + xs(i).toFixed(1) + "," + ysL(v).toFixed(1)).join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={i} x1={pad.l} x2={W - pad.r}
          y1={pad.t + ih * g} y2={pad.t + ih * g}
          stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 3" />
      ))}
      {/* y left labels (monthly €) */}
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
        const v = Math.round(max * (1 - g) / 10) * 10;
        return <text key={i} x={pad.l - 6} y={pad.t + ih * g + 3} textAnchor="end"
          style={{ fontSize: 10, fill: "var(--muted)", fontFamily: "var(--ff-mono)" }}>€{v}</text>;
      })}
      {/* y right labels (cumulative €) */}
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
        const v = Math.round(cumMax * (1 - g) / 100) * 100;
        return <text key={i} x={W - pad.r + 6} y={pad.t + ih * g + 3}
          style={{ fontSize: 10, fill: "var(--info)", fontFamily: "var(--ff-mono)" }}>€{v}</text>;
      })}
      {/* bars */}
      {monthly.map((m, i) => {
        const bh = (m.eur / max) * ih;
        const x = pad.l + i * bw + 3;
        const y = pad.t + ih - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw - 6} height={bh}
              fill="var(--accent)" opacity={0.88} />
            <text x={x + (bw - 6) / 2} y={y - 4} textAnchor="middle"
              style={{ fontSize: 9.5, fill: "var(--text-2)", fontFamily: "var(--ff-mono)" }}>
              {m.eur >= 100 ? Math.round(m.eur) : ""}
            </text>
            <text x={x + (bw - 6) / 2} y={H - 8} textAnchor="middle"
              style={{ fontSize: 10, fill: "var(--text)", fontFamily: "var(--ff-mono)" }}>{m.m}</text>
          </g>
        );
      })}
      {/* cumulative line */}
      <path d={linePath} fill="none" stroke="var(--info)" strokeWidth="1.6" />
      {monthly.map((m, i) => (
        <circle key={i} cx={xs(i)} cy={ysL(cums[i])} r="2.2" fill="var(--info)" />
      ))}
      {/* monthly target line */}
      <line x1={pad.l} x2={W - pad.r}
        y1={pad.t + ih - (700 / max) * ih} y2={pad.t + ih - (700 / max) * ih}
        stroke="var(--warn)" strokeDasharray="4 3" strokeWidth="1.2" />
      <text x={W - pad.r - 4} y={pad.t + ih - (700 / max) * ih - 4} textAnchor="end"
        style={{ fontSize: 10, fill: "var(--warn)", fontFamily: "var(--ff-mono)" }}>TARGET €700</text>
      {/* axis labels */}
      <text x={pad.l} y={pad.t - 6} style={{ fontSize: 9, fill: "var(--accent)", fontFamily: "var(--ff-mono)" }}>MONTHLY €</text>
      <text x={W - pad.r} y={pad.t - 6} textAnchor="end" style={{ fontSize: 9, fill: "var(--info)", fontFamily: "var(--ff-mono)" }}>CUMULATIVE €</text>
    </svg>
  );
}

function ForecastScreen({ tweak }) {
  const total12 = FORECAST_12M.reduce((s, m) => s + m.eur, 0);
  const avgM = total12 / 12;
  const peak = FORECAST_12M.reduce((p, c) => c.eur > p.eur ? c : p);
  const trough = FORECAST_12M.reduce((p, c) => c.eur < p.eur ? c : p);

  // Group by stock for next 12 months
  const byStock = {};
  DIV_EVENTS.forEach(e => {
    byStock[e.t] = byStock[e.t] || { t: e.t, n: e.n, eur: 0, count: 0, ccy: e.ccy, c: HOLDINGS.find(h => h.t === e.t)?.c };
    byStock[e.t].eur += e.grossEUR;
    byStock[e.t].count++;
  });
  const stockRows = Object.values(byStock).sort((a, b) => b.eur - a.eur);

  return (
    <Screen tweak={tweak} active="Income" statusLeft="FORECAST · 12M"
      statusSegs={["DRIP off", "Cash drag 0", "Confidence: 87%", "Excl. specials"]}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 8, gap: 8, minHeight: 0 }}>
        <StatStrip cols={5} items={[
          { label: "Next 12 months · forward", value: <span className="blur-sensitive">{fmt.money(total12, "EUR", { dec: 0 })}</span>, sub: <span className="dim">across {DIV_EVENTS.length} events</span> },
          { label: "Average per month", value: <span className="blur-sensitive">{fmt.money(avgM, "EUR", { dec: 0 })}</span>, sub: <span className="up">+€44 vs T12M avg</span> },
          { label: "Heaviest month", value: peak.m, sub: <span className="mono blur-sensitive">{fmt.money(peak.eur, "EUR", { dec: 0 })}</span> },
          { label: "Lightest month", value: trough.m, sub: <span className="mono blur-sensitive">{fmt.money(trough.eur, "EUR", { dec: 0 })}</span> },
          { label: "Coefficient of var.", value: "32%", sub: <span className="dim">a bit lumpy · add monthlys</span> },
        ]} />

        <Panel title="Forward income · monthly bars + cumulative" tag="Jun 2026 → May 2027" style={{ flex: "0 0 320px" }}>
          <ForecastChart monthly={FORECAST_12M} w={1000} h={280} />
        </Panel>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8, flex: 1, minHeight: 0 }}>
          {/* Per-stock contribution */}
          <Panel title="Income by holding · forward 12m" tag="ranked by € contribution" flush>
            <div style={{ height: "100%", overflow: "auto" }}>
              <table className="t" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: 22 }}>#</th>
                    <th>TICKER</th>
                    <th>NAME</th>
                    <th className="c">CCY</th>
                    <th className="r">PAYMENTS</th>
                    <th className="r">PER PAY</th>
                    <th className="r">12M €</th>
                    <th>SHARE</th>
                  </tr>
                </thead>
                <tbody>
                  {stockRows.map((s, i) => (
                    <tr key={s.t}>
                      <td className="dim">{i + 1}</td>
                      <td className="l" style={{ fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Flag c={s.c} />{s.t}</span>
                      </td>
                      <td className="l dim" style={{ fontSize: 10.5 }}>{s.n}</td>
                      <td className="c dim">{s.ccy}</td>
                      <td className="r">{s.count}×</td>
                      <td className="r blur-sensitive">{fmt.money(s.eur / s.count, "EUR", { dec: 2 })}</td>
                      <td className="r blur-sensitive" style={{ fontWeight: 600, color: "var(--accent)" }}>{fmt.money(s.eur, "EUR", { dec: 0 })}</td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <MiniBar pct={(s.eur / stockRows[0].eur) * 100} w={70} />
                          <span className="mono" style={{ fontSize: 10 }}>{((s.eur / total12) * 100).toFixed(1)}%</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Cashflow projections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Panel title="Cashflow projections" tag="DRIP off · gross + 25% blended">
              <table className="t" style={{ width: "100%" }}>
                <tbody>
                  <tr>
                    <td className="l dim" style={{ fontSize: 10 }}>This month (May)</td>
                    <td className="r blur-sensitive">{fmt.money(PORTFOLIO.dividendsThisMonth, "EUR", { dec: 0 })}</td>
                    <td className="r dim mono" style={{ fontSize: 10 }}>87%</td>
                    <td className="r"><MiniBar pct={87} w={50} /></td>
                  </tr>
                  <tr>
                    <td className="l dim" style={{ fontSize: 10 }}>This quarter (Q2 '26)</td>
                    <td className="r blur-sensitive">{fmt.money(2_140, "EUR", { dec: 0 })}</td>
                    <td className="r mono up">+8.2%</td>
                    <td className="r"><MiniBar pct={95} w={50} color="var(--up)" /></td>
                  </tr>
                  <tr>
                    <td className="l dim" style={{ fontSize: 10 }}>This year (2026)</td>
                    <td className="r blur-sensitive">{fmt.money(7_310, "EUR", { dec: 0 })}</td>
                    <td className="r mono up">+11.4%</td>
                    <td className="r"><MiniBar pct={92} w={50} color="var(--up)" /></td>
                  </tr>
                  <tr>
                    <td className="l dim" style={{ fontSize: 10 }}>Next 12 months</td>
                    <td className="r blur-sensitive">{fmt.money(total12, "EUR", { dec: 0 })}</td>
                    <td className="r mono up">+9.8%</td>
                    <td className="r"><MiniBar pct={88} w={50} color="var(--up)" /></td>
                  </tr>
                  <tr>
                    <td className="l dim" style={{ fontSize: 10 }}>Net after tax (NL)</td>
                    <td className="r blur-sensitive">{fmt.money(total12 * 0.78, "EUR", { dec: 0 })}</td>
                    <td className="r mono">−€{fmt.num(total12 * 0.22, 0)}</td>
                    <td className="r"><span className="chip" style={{ fontSize: 9 }}>22% eff.</span></td>
                  </tr>
                </tbody>
              </table>
            </Panel>

            <Panel title="What raises 5% would do" tag="if every holding +5%">
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "4px 4px" }}>
                <span className="num blur-sensitive" style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.5px", color: "var(--accent)" }}>+{fmt.money(total12 * 0.05, "EUR", { dec: 0 })}</span>
                <span className="dim mono" style={{ fontSize: 10 }}>/yr · annualised across portfolio</span>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-2)", lineHeight: 1.55, padding: 4 }}>
                Historical 5y weighted avg: <span className="up mono">+7.8%</span>. At that pace your income hits <b className="mono blur-sensitive">{fmt.money(total12 * Math.pow(1.078, 5), "EUR", { dec: 0 })}</b> in 5 years and <b className="mono blur-sensitive">{fmt.money(total12 * Math.pow(1.078, 10), "EUR", { dec: 0 })}</b> in 10.
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, { ForecastScreen, ForecastChart });

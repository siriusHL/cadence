// pro-income.jsx — Calendar, Forecast, DRIP — Apple-style

// ─── Calendar ────────────────────────────────────────────────
function ProCalendar() {
  const grid = {};
  for (let m = 1; m <= 12; m++) {
    grid[m] = {};
    for (let d = 1; d <= 31; d++) grid[m][d] = { sum: 0, events: [] };
  }
  DIV_EVENTS.forEach(e => {
    if (grid[e.mo]?.[e.day]) { grid[e.mo][e.day].sum += e.grossEUR; grid[e.mo][e.day].events.push(e); }
  });
  const monthSums = Array.from({ length: 12 }, (_, i) => Object.values(grid[i + 1]).reduce((s, d) => s + d.sum, 0));
  const yearTotal = monthSums.reduce((a, b) => a + b, 0);
  const maxDay = Math.max(...Object.values(grid).flatMap(m => Object.values(m).map(d => d.sum)));
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const today = { mo: 5, day: 21 };
  const next30 = DIV_EVENTS
    .filter(e => (e.mo === 5 && e.day >= 21) || e.mo === 6)
    .sort((a, b) => (a.mo * 100 + a.day) - (b.mo * 100 + b.day));

  return (
    <ProScreen active="Income">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Dividend calendar · 2026</div>
          <h1>€{yearTotal.toFixed(0)} <span className="light">expected this year</span></h1>
          <div className="sub">184 payments from your 20 stocks, across 12 months. Heaviest month is <b style={{ color: "#1d1d1f" }}>{monthNames[monthSums.indexOf(Math.max(...monthSums))]}</b>.</div>
        </div>
        <div className="right-meta">
          <span className="live">All forward · auto-FX BCE</span>
          <span>3 payments this week</span>
          <span>Avg €{(yearTotal / 365).toFixed(0)}/day</span>
        </div>
      </div>

      <div className="row-2" style={{ gridTemplateColumns: "1.7fr 1fr" }}>
        <div className="pcard">
          <div className="pcard-h">
            <div className="t">Year heatmap · ex-div by day</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "#86868b" }}>
              <span>Less</span>
              {[0.1, 0.3, 0.5, 0.7, 0.95].map((f, i) =>
                <span key={i} style={{ width: 14, height: 10, borderRadius: 3, background: `color-mix(in oklab, oklch(0.55 0.10 175) ${f * 100}%, rgba(0,0,0,0.04))` }} />
              )}
              <span>More</span>
            </div>
          </div>
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "2px", fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  {Array.from({ length: 31 }, (_, i) => (
                    <th key={i} style={{ fontSize: 9, padding: "2px 0", fontWeight: 500, color: "#86868b" }}>{i + 1}</th>
                  ))}
                  <th style={{ width: 56, textAlign: "right", fontSize: 10.5, color: "#86868b", fontWeight: 500, paddingLeft: 8 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {monthNames.map((mn, mi) => (
                  <tr key={mn}>
                    <td style={{ fontSize: 11.5, color: "#1d1d1f", fontWeight: 500, paddingRight: 6 }}>{mn}</td>
                    {Array.from({ length: 31 }, (_, di) => {
                      const cell = grid[mi + 1][di + 1];
                      const isToday = (mi + 1) === today.mo && (di + 1) === today.day;
                      const bg = cell.sum > 0
                        ? `color-mix(in oklab, oklch(0.55 0.10 175) ${Math.max(15, Math.min(100, (cell.sum / maxDay) * 100))}%, rgba(0,0,0,0.04))`
                        : "rgba(0,0,0,0.04)";
                      return (
                        <td key={di} style={{ padding: 0 }}>
                          <div style={{
                            width: 17, height: 17, borderRadius: 4, background: bg,
                            border: isToday ? "1.5px solid #1d1d1f" : "none",
                            margin: "0 auto",
                          }} />
                        </td>
                      );
                    })}
                    <td className="num" style={{ textAlign: "right", fontSize: 11.5, fontWeight: 500, color: monthSums[mi] > 0 ? "#1d1d1f" : "#c7c7cc", paddingLeft: 8 }}>
                      {monthSums[mi] > 0 ? "€" + monthSums[mi].toFixed(0) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pcard flush">
          <div className="pcard-h">
            <div>
              <div className="t">Next 40 days</div>
              <div style={{ fontSize: 11.5, color: "#86868b", marginTop: 2 }}>{next30.length} payments · €{next30.reduce((s, e) => s + e.grossEUR, 0).toFixed(0)} gross</div>
            </div>
            <span className="tag">21 May → 30 Jun</span>
          </div>
          <div style={{ maxHeight: 440, overflow: "auto" }}>
            <table className="pt">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Date</th>
                  <th>Ticker</th>
                  <th className="r">Gross</th>
                  <th className="r">Net</th>
                  <th className="c">WH</th>
                </tr>
              </thead>
              <tbody>
                {next30.map((e, i) => {
                  const dist = (e.mo - today.mo) * 31 + (e.day - today.day);
                  const isSoon = dist >= 0 && dist <= 7;
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 600, color: isSoon ? "oklch(0.36 0.08 175)" : "#1d1d1f" }}>
                          {monthNames[e.mo - 1].slice(0, 3)} {e.day}
                        </div>
                      </td>
                      <td className="ticker">
                        {e.t}
                        <span className="name">{e.n.slice(0, 18)}</span>
                      </td>
                      <td className="r">€{e.grossEUR.toFixed(2)}</td>
                      <td className="r b">€{(e.grossEUR * (1 - e.wth)).toFixed(2)}</td>
                      <td className="c muted" style={{ fontSize: 11 }}>{(e.wth * 100).toFixed(0)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProScreen>
  );
}

// ─── Forecast ────────────────────────────────────────────────
function ForecastBars({ monthly, w = 1180, h = 220 }) {
  const pad = { t: 16, r: 50, b: 26, l: 36 };
  const W = w, H = h, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(...monthly.map(m => m.eur)) * 1.2;
  const bw = iw / monthly.length;
  let cum = 0;
  const cums = monthly.map(m => { cum += m.eur; return cum; });
  const cumMax = cums[cums.length - 1] * 1.1;
  const xs = (i) => pad.l + (i + 0.5) * bw;
  const ysL = (v) => pad.t + ih - (v / cumMax) * ih;
  const linePath = cums.map((v, i) => (i === 0 ? "M" : "L") + xs(i).toFixed(1) + "," + ysL(v).toFixed(1)).join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {[0, 0.5, 1].map((g, i) => {
        const v = Math.round((max * (1 - g)) / 50) * 50;
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
            <text x={pad.l - 6} y={pad.t + ih * g + 3} textAnchor="end" style={{ fontSize: 10, fill: "#86868b", fontWeight: 500 }}>€{v}</text>
          </g>
        );
      })}
      {/* target line */}
      <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih - (700 / max) * ih} y2={pad.t + ih - (700 / max) * ih}
        stroke="rgba(0,0,0,0.18)" strokeDasharray="4 3" strokeWidth="1" />
      <text x={W - pad.r - 4} y={pad.t + ih - (700 / max) * ih - 4} textAnchor="end"
        style={{ fontSize: 10, fill: "#86868b", fontWeight: 500 }}>€700 target</text>
      {monthly.map((m, i) => {
        const bh = (m.eur / max) * ih;
        const x = pad.l + i * bw + 5;
        const y = pad.t + ih - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw - 10} height={bh} rx="4" fill="oklch(0.55 0.10 175)" />
            <text x={x + (bw - 10) / 2} y={y - 5} textAnchor="middle"
              style={{ fontSize: 10, fill: "#1d1d1f", fontWeight: 500 }}>{Math.round(m.eur)}</text>
            <text x={x + (bw - 10) / 2} y={H - 6} textAnchor="middle"
              style={{ fontSize: 11, fill: "#6e6e73", fontWeight: 500 }}>{m.m}</text>
          </g>
        );
      })}
      <path d={linePath} fill="none" stroke="oklch(0.40 0.06 235)" strokeWidth="2" strokeLinecap="round" />
      {monthly.map((m, i) => (
        <circle key={i} cx={xs(i)} cy={ysL(cums[i])} r="3" fill="#fff" stroke="oklch(0.40 0.06 235)" strokeWidth="1.5" />
      ))}
      {/* right axis label */}
      <text x={W - pad.r + 4} y={pad.t + 10} style={{ fontSize: 10, fill: "oklch(0.40 0.06 235)", fontWeight: 500 }}>Cum.</text>
      <text x={W - pad.r + 4} y={ysL(cums[cums.length - 1]) + 3} style={{ fontSize: 10.5, fill: "oklch(0.40 0.06 235)", fontWeight: 600 }}>€{cums[cums.length - 1].toFixed(0)}</text>
    </svg>
  );
}

function ProForecast() {
  const total12 = FORECAST_12M.reduce((s, m) => s + m.eur, 0);
  const peak = FORECAST_12M.reduce((p, c) => c.eur > p.eur ? c : p);
  const trough = FORECAST_12M.reduce((p, c) => c.eur < p.eur ? c : p);

  // by-stock
  const byStock = {};
  DIV_EVENTS.forEach(e => {
    byStock[e.t] = byStock[e.t] || { t: e.t, n: e.n, eur: 0, count: 0, ccy: e.ccy };
    byStock[e.t].eur += e.grossEUR;
    byStock[e.t].count++;
  });
  const stockRows = Object.values(byStock).sort((a, b) => b.eur - a.eur).slice(0, 12);

  return (
    <ProScreen active="Income">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">12-month forecast · Jun '26 → May '27</div>
          <h1>€{total12.toFixed(0)} <span className="light">expected</span></h1>
          <div className="sub">{DIV_EVENTS.length} payments forecasted · avg <b style={{ color: "#1d1d1f" }}>€{(total12/12).toFixed(0)}/mo</b> · 87% confidence (excl. specials).</div>
        </div>
        <div className="right-meta">
          <span className="live">DRIP off · Cash drag 0</span>
          <span>Peak: {peak.m} · €{peak.eur.toFixed(0)}</span>
          <span>Lightest: {trough.m} · €{trough.eur.toFixed(0)}</span>
        </div>
      </div>

      <div className="pcard" style={{ marginBottom: 14 }}>
        <div className="pcard-h">
          <div>
            <div className="t">Forward monthly income + cumulative</div>
            <div style={{ fontSize: 11.5, color: "#86868b", marginTop: 2 }}>Bars are per-month gross. Line is running total — touches €{total12.toFixed(0)} by May 2027.</div>
          </div>
          <div className="seg">
            <button>6M</button><button className="on">12M</button><button>24M</button>
          </div>
        </div>
        <ForecastBars monthly={FORECAST_12M} w={1180} h={170} />
      </div>

      <div className="row-2" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="pcard flush">
          <div className="pcard-h">
            <div className="t">Income by holding · forward 12M</div>
            <span className="tag">Top 12</span>
          </div>
          <div style={{ maxHeight: 230, overflow: "auto" }}>
            <table className="pt">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th className="r">Payments</th>
                  <th className="r">Per pay</th>
                  <th className="r">12M €</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map((s) => (
                  <tr key={s.t}>
                    <td className="ticker">{s.t}<span className="name">{s.n}</span></td>
                    <td className="r">{s.count}×</td>
                    <td className="r muted">€{(s.eur / s.count).toFixed(2)}</td>
                    <td className="r b">€{s.eur.toFixed(0)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="pbar" style={{ flex: 1 }}><i style={{ width: `${(s.eur / stockRows[0].eur) * 100}%` }} /></div>
                        <span style={{ minWidth: 38, textAlign: "right", fontSize: 11 }}>{((s.eur / total12) * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="pcard">
            <div className="pcard-h">
              <div className="t">Cashflow projections</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["This month (May)", "€612", "87%", true],
                ["This quarter (Q2 '26)", "€2,140", "+8.2%", false],
                ["This year (2026)", "€7,310", "+11.4%", false],
                ["Next 12 months", "€" + total12.toFixed(0), "+9.8%", false],
                ["Net after NL tax (22%)", "€" + (total12 * 0.78).toFixed(0), "", false],
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < 4 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                  <span style={{ fontSize: 12, color: "#6e6e73" }}>{row[0]}</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span className="num" style={{ fontSize: 14, fontWeight: 600 }}>{row[1]}</span>
                    {row[2] && <span className={"ppill " + (row[3] ? "" : "up")} style={{ fontSize: 10 }}>{row[2]}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pcard" style={{ background: "linear-gradient(135deg, #fafafa, #f0f2f5)" }}>
            <div style={{ fontSize: 11, color: "#86868b", fontWeight: 500, marginBottom: 4 }}>If every holding raises 5%</div>
            <div className="num" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em", color: "oklch(0.42 0.07 175)" }}>+€{(total12 * 0.05).toFixed(0)}/yr</div>
            <div style={{ fontSize: 11.5, color: "#6e6e73", marginTop: 6 }}>At historical 7.8% growth, income hits <b style={{ color: "#1d1d1f" }}>€{(total12 * Math.pow(1.078, 5)).toFixed(0)}</b> in 5y and <b style={{ color: "#1d1d1f" }}>€{(total12 * Math.pow(1.078, 10)).toFixed(0)}</b> in 10y.</div>
          </div>
        </div>
      </div>
    </ProScreen>
  );
}

// ─── DRIP simulator ──────────────────────────────────────────
function DripCurvesPro({ years, yld, growth, contrib, baseIncome = 7412.84, baseValue = 184320.55, w = 1180, h = 240 }) {
  const pad = { t: 16, r: 80, b: 26, l: 50 };
  const W = w, H = h, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const series = (drip, addContrib) => {
    let v = baseValue, inc = baseIncome;
    const pts = [{ y: 0, v, inc }];
    for (let i = 1; i <= years; i++) {
      inc *= (1 + growth / 100);
      v = v * 1.045 + (drip ? inc : 0) + (addContrib ? contrib * 12 : 0);
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
  const pathFor = (d) => d.map((p, i) => (i === 0 ? "M" : "L") + xs(p.y).toFixed(1) + "," + ys(p.inc).toFixed(1)).join(" ");
  const fireYear = dripPlus.findIndex(p => p.inc >= 30000);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="g-drip-pro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.55 0.10 175)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="oklch(0.55 0.10 175)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
        const v = Math.round((incMax * (1 - g)) / 1000) * 1000;
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
            <text x={pad.l - 6} y={pad.t + ih * g + 3} textAnchor="end" style={{ fontSize: 10.5, fill: "#86868b", fontWeight: 500 }}>€{(v / 1000).toFixed(0)}k</text>
          </g>
        );
      })}
      {[0, Math.round(years / 4), Math.round(years / 2), Math.round(years * 3 / 4), years].map((y, i) => (
        <text key={i} x={xs(y)} y={H - 8} textAnchor="middle" style={{ fontSize: 10.5, fill: "#86868b", fontWeight: 500 }}>+{y}y</text>
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih - (30000 / incMax) * ih} y2={pad.t + ih - (30000 / incMax) * ih}
        stroke="rgba(0,0,0,0.2)" strokeDasharray="4 3" strokeWidth="1" />
      <text x={W - pad.r - 4} y={pad.t + ih - (30000 / incMax) * ih - 4} textAnchor="end"
        style={{ fontSize: 10.5, fill: "#86868b", fontWeight: 500 }}>FIRE €30k</text>
      <path d={pathFor(dripPlus) + ` L ${xs(years)} ${pad.t + ih} L ${xs(0)} ${pad.t + ih} Z`} fill="url(#g-drip-pro)" />
      <path d={pathFor(noDrip)} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" strokeDasharray="4 4" />
      <path d={pathFor(drip)} fill="none" stroke="oklch(0.40 0.06 235)" strokeWidth="1.8" />
      <path d={pathFor(dripPlus)} fill="none" stroke="oklch(0.55 0.10 175)" strokeWidth="2.4" strokeLinecap="round" />
      {[
        { p: noDrip[years], c: "rgba(0,0,0,0.5)" },
        { p: drip[years], c: "oklch(0.40 0.06 235)" },
        { p: dripPlus[years], c: "oklch(0.55 0.10 175)" },
      ].map((s, i) => (
        <g key={i}>
          <circle cx={xs(s.p.y)} cy={ys(s.p.inc)} r="4" fill="#fff" stroke={s.c} strokeWidth="2" />
          <text x={xs(s.p.y) + 8} y={ys(s.p.inc) + 4} style={{ fontSize: 11, fill: s.c, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>€{(s.p.inc / 1000).toFixed(1)}k</text>
        </g>
      ))}
      {fireYear > 0 && (
        <g>
          <line x1={xs(fireYear)} x2={xs(fireYear)} y1={pad.t} y2={pad.t + ih}
            stroke="oklch(0.55 0.10 175)" strokeOpacity="0.4" />
          <rect x={xs(fireYear) - 30} y={pad.t + 4} width="60" height="18" rx="9" fill="oklch(0.55 0.10 175)" />
          <text x={xs(fireYear)} y={pad.t + 16} textAnchor="middle" style={{ fontSize: 10.5, fill: "#fff", fontWeight: 600 }}>FIRE +{fireYear}y</text>
        </g>
      )}
    </svg>
  );
}

function ProDrip() {
  const [years, setYears] = React.useState(25);
  const [yld, setYld] = React.useState(4.02);
  const [growth, setGrowth] = React.useState(7.8);
  const [contrib, setContrib] = React.useState(500);

  // Year-by-year snapshots
  const tbl = (() => {
    const out = [];
    let v = PORTFOLIO.totalValue, inc = PORTFOLIO.fwdAnnualIncome;
    for (let i = 1; i <= years; i++) {
      inc *= (1 + growth / 100);
      const newShares = inc + contrib * 12;
      v = v * 1.045 + newShares;
      inc += newShares * (yld / 100);
      if ([1, 3, 5, 10, 15, 20, 25, 30].includes(i) || i === years) {
        out.push({ y: i, v, inc, monthly: inc / 12 });
      }
    }
    return out;
  })();

  const Slider = ({ label, value, val, min, max, step = 1, onChange, hint }) => (
    <div className="pcard" style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#86868b", fontWeight: 500 }}>{label}</span>
        <span className="num" style={{ fontSize: 16, fontWeight: 600 }}>{val}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="appleslider" style={{ width: "100%" }} />
      <div style={{ fontSize: 10.5, color: "#86868b", marginTop: 2 }}>{hint}</div>
    </div>
  );

  return (
    <ProScreen active="Income">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">DRIP simulator · Compounding scenarios</div>
          <h1>Reach FIRE in <span className="num" style={{ color: "oklch(0.42 0.07 175)" }}>{years}y</span></h1>
          <div className="sub">Reinvest dividends and add €{contrib}/mo to turn today's €{(PORTFOLIO.fwdAnnualIncome).toFixed(0)} into <b style={{ color: "#1d1d1f" }}>€{tbl[tbl.length - 1].inc.toFixed(0)}</b> in {years} years.</div>
        </div>
        <div className="right-meta">
          <span className="live">Tax drag 22% · Apprec. +4.5%</span>
          <span>Monte-Carlo off</span>
          <span>Inflation-real off</span>
        </div>
      </div>

      <div className="row-4" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 14 }}>
        <Slider label="Horizon"        value={years}   val={years + " years"}  min={5}  max={40} onChange={setYears}  hint="5 — 40 years" />
        <Slider label="Forward yield"  value={yld}     val={yld.toFixed(2) + " %"} min={1} max={9} step={0.1} onChange={setYld} hint="Weighted blended" />
        <Slider label="Div growth"     value={growth}  val={growth.toFixed(1) + " %"} min={0} max={15} step={0.1} onChange={setGrowth} hint="Annual CAGR" />
        <Slider label="Monthly contrib." value={contrib} val={"€" + contrib} min={0} max={3000} step={50} onChange={setContrib} hint="Added to portfolio" />
      </div>

      <div className="pcard" style={{ marginBottom: 14 }}>
        <div className="pcard-h">
          <div>
            <div className="t">Annual dividend income · snowball</div>
            <div style={{ fontSize: 11.5, color: "#86868b", marginTop: 2 }}>Compare three paths over {years} years.</div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {[
              { c: "rgba(0,0,0,0.3)", l: "No DRIP" },
              { c: "oklch(0.40 0.06 235)", l: "DRIP on" },
              { c: "oklch(0.55 0.10 175)", l: `DRIP + €${contrib}/mo` },
            ].map((g, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#6e6e73" }}>
                <span style={{ width: 16, height: 2, background: g.c, borderRadius: 1 }} /> {g.l}
              </span>
            ))}
          </div>
        </div>
        <DripCurvesPro years={years} yld={yld} growth={growth} contrib={contrib} w={1180} h={170} />
      </div>

      <div className="pcard flush" style={{ maxHeight: 260 }}>
        <div className="pcard-h">
          <div className="t">Year-by-year breakdown</div>
          <span className="tag">DRIP + contrib scenario</span>
        </div>
        <div style={{ overflow: "auto", flex: 1 }}>
        <table className="pt">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Year</th>
              <th className="r">Portfolio</th>
              <th className="r">Annual income</th>
              <th className="r">Monthly</th>
              <th className="r">YoC</th>
              <th>FIRE progress</th>
            </tr>
          </thead>
          <tbody>
            {tbl.map((r) => {
              const yocV = (r.inc / (PORTFOLIO.costBasis + r.y * contrib * 12)) * 100;
              const firePct = Math.min(100, (r.inc / 30000) * 100);
              return (
                <tr key={r.y}>
                  <td className="b" style={{ color: "oklch(0.42 0.07 175)" }}>+{r.y}y</td>
                  <td className="r b">€{r.v.toFixed(0)}</td>
                  <td className="r">€{r.inc.toFixed(0)}</td>
                  <td className="r muted">€{r.monthly.toFixed(0)}</td>
                  <td className="r up">{yocV.toFixed(1)}%</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="pbar" style={{ flex: 1 }}><i style={{ width: `${firePct}%`, background: firePct >= 100 ? "oklch(0.48 0.08 165)" : "oklch(0.55 0.10 175)" }} /></div>
                      <span className="num" style={{ minWidth: 42, textAlign: "right", fontSize: 11.5, fontWeight: 500 }}>{firePct.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .cdn-pro .appleslider { -webkit-appearance: none; appearance: none; height: 4px; background: rgba(0,0,0,0.08); outline: none; border-radius: 2px; margin: 8px 0 6px; }
        .cdn-pro .appleslider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; background: #fff; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 1px 3px rgba(0,0,0,0.15); border-radius: 50%; cursor: pointer; }
        .cdn-pro .appleslider::-moz-range-thumb { width: 16px; height: 16px; background: #fff; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 1px 3px rgba(0,0,0,0.15); border-radius: 50%; cursor: pointer; }
      ` }} />
    </ProScreen>
  );
}

Object.assign(window, { ProCalendar, ProForecast, ProDrip, ForecastBars, DripCurvesPro });

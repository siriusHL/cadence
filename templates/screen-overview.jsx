// screen-overview.jsx — Portfolio Overview / Dashboard
// Signature view: dense KPI strip, 12-month "cadence" chart, FIRE progress, contributors.

function CadenceChart({ width = 820, height = 250 }) {
  // Combines: monthly income bars (stacked sectors) + equity-curve overlay (line) + ex-div markers.
  const pad = { t: 18, r: 50, b: 28, l: 44 };
  const W = width, H = height;
  const innerW = W - pad.l - pad.r, innerH = H - pad.t - pad.b;
  const months = INCOME_HIST_24M.slice(-12);  // last 12 actual
  const forecast = FORECAST_12M.slice(0, 6);   // next 6 forecast
  const series = [
    ...months.map((eur, i) => ({ eur, type: "actual", i })),
    ...forecast.map((m, i) => ({ eur: m.eur, type: "forecast", i: months.length + i })),
  ];
  const N = series.length;
  const maxBar = Math.max(...series.map(s => s.eur)) * 1.18;
  const bw = innerW / N;

  // Equity curve aligned to same x — use PERF series (24 mo) tail
  const eq = PERF.slice(-N).map(p => p.p);
  const eqMin = Math.min(...eq), eqMax = Math.max(...eq);
  const eqRange = eqMax - eqMin || 1;
  const eqPts = eq.map((v, i) => {
    const x = pad.l + (i + 0.5) * bw;
    const y = pad.t + innerH * 0.18 + (1 - (v - eqMin) / eqRange) * (innerH * 0.45);
    return [x, y];
  });
  const eqLine = eqPts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");

  const labels = [];
  // month label every other
  const monLab = ["J","J","A","S","O","N","D","J","F","M","A","M","J","J","A","S","O","N","D","J","F","M","A","M"];
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}>
      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={i} x1={pad.l} x2={W - pad.r}
          y1={pad.t + innerH * g} y2={pad.t + innerH * g}
          stroke="var(--border)" strokeWidth="0.5" strokeDasharray={i === 4 ? "0" : "2 3"} />
      ))}
      {/* y-axis labels (€) */}
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
        const v = Math.round((maxBar * (1 - g)) / 10) * 10;
        return <text key={i} x={pad.l - 6} y={pad.t + innerH * g + 3}
          textAnchor="end" style={{ fontSize: 9.5, fill: "var(--muted)", fontFamily: "var(--ff-mono)" }}>€{v}</text>;
      })}
      {/* bars */}
      {series.map((s, i) => {
        const h = (s.eur / maxBar) * innerH;
        const x = pad.l + i * bw + 2;
        const y = pad.t + innerH - h;
        const isF = s.type === "forecast";
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw - 4} height={h}
              fill={isF ? "color-mix(in oklab, var(--accent) 35%, var(--surface-2))" : "var(--accent)"}
              opacity={isF ? 0.55 : 0.92}
              stroke={isF ? "color-mix(in oklab, var(--accent) 55%, var(--surface-3))" : "none"}
              strokeWidth="1" strokeDasharray={isF ? "2 2" : "0"} />
            {/* tick label */}
            <text x={x + (bw - 4) / 2} y={H - pad.b + 12}
              textAnchor="middle"
              style={{ fontSize: 9, fill: isF ? "var(--muted)" : "var(--text-2)", fontFamily: "var(--ff-mono)" }}>
              {monLab[12 + i] ?? "·"}
            </text>
          </g>
        );
      })}
      {/* divider between actual and forecast */}
      <line x1={pad.l + 12 * bw} x2={pad.l + 12 * bw}
        y1={pad.t - 4} y2={H - pad.b + 4}
        stroke="var(--border-strong)" strokeDasharray="3 3" strokeWidth="1" />
      <text x={pad.l + 12 * bw + 4} y={pad.t + 8}
        style={{ fontSize: 9, fill: "var(--muted)", fontFamily: "var(--ff-mono)" }}>NOW</text>

      {/* equity curve overlay */}
      <path d={eqLine} fill="none" stroke="var(--info)" strokeWidth="1.5" strokeLinejoin="round" />
      {eqPts.map((p, i) => i === eqPts.length - 1 ? (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="2.5" fill="var(--info)" />
          <text x={p[0] + 5} y={p[1] + 3} style={{ fontSize: 9, fill: "var(--info)", fontFamily: "var(--ff-mono)" }}>
            +{eq[eq.length - 1].toFixed(1)}%
          </text>
        </g>
      ) : null)}

      {/* axis label r */}
      <text x={W - pad.r + 6} y={pad.t + 8}
        style={{ fontSize: 9, fill: "var(--info)", fontFamily: "var(--ff-mono)" }}>EQUITY</text>
      <text x={W - pad.r + 6} y={H - pad.b - 4}
        style={{ fontSize: 9, fill: "var(--accent)", fontFamily: "var(--ff-mono)" }}>INCOME €</text>
    </svg>
  );
}

function FireBar({ current, target, monthly, targetMonthly }) {
  const pct = Math.min(100, (current / target) * 100);
  const mPct = Math.min(100, (monthly / targetMonthly) * 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 12 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>FIRE · annual income → target</span>
          <span className="mono" style={{ fontSize: 10, color: "var(--text-2)" }}>{pct.toFixed(1)}%</span>
        </div>
        <div className="num" style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.5px" }}>
          {fmt.money(current, "EUR", { dec: 0 })} <span style={{ color: "var(--dim)", fontSize: 13 }}>/ {fmt.money(target, "EUR", { dec: 0 })}</span>
        </div>
        <div style={{ position: "relative", height: 10, background: "var(--surface-3)", marginTop: 6, borderRadius: 1 }}>
          <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: "var(--accent)" }} />
          {/* ticks */}
          {[0.25, 0.5, 0.75].map((t, i) => (
            <div key={i} style={{ position: "absolute", top: -2, bottom: -2, left: `${t*100}%`, width: 1, background: "var(--bg)" }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "var(--dim)", fontFamily: "var(--ff-mono)" }}>
          <span>€0</span><span>€7.5k</span><span>€15k</span><span>€22.5k</span><span>€30k</span>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>This month vs €700 target</span>
          <span className="mono" style={{ fontSize: 10, color: monthly >= targetMonthly ? "var(--up)" : "var(--text-2)" }}>{mPct.toFixed(0)}%</span>
        </div>
        <div className="num" style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.3px" }}>
          {fmt.money(monthly, "EUR", { dec: 2 })}
          <span className="dim" style={{ fontSize: 11, marginLeft: 8 }}>+{fmt.money(monthly - PORTFOLIO.dividendsLastMonth, "EUR", { dec: 2 })} vs last</span>
        </div>
        <div style={{ position: "relative", height: 6, background: "var(--surface-3)", marginTop: 6 }}>
          <div style={{ position: "absolute", inset: 0, width: `${mPct}%`, background: "var(--accent)", opacity: 0.85 }} />
          <div style={{ position: "absolute", top: -3, bottom: -3, left: "100%", width: 1, background: "var(--text-2)" }} />
        </div>
      </div>
    </div>
  );
}

function UpcomingPays() {
  // pick next 6 events (sort by future date — assume current date 2026-05-21)
  const today = { mo: 5, day: 21 };
  const evts = DIV_EVENTS.map(e => ({ ...e, key: e.mo * 100 + e.day, distance: e.mo < today.mo ? (e.mo + 12) * 100 + e.day - (today.mo * 100 + today.day) : (e.mo * 100 + e.day - (today.mo * 100 + today.day) + 1200) % 1200 }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 7);
  return (
    <div>
      <table className="t" style={{ width: "100%" }}>
        <thead><tr>
          <th style={{ width: 28 }}>EX</th>
          <th>TICKER</th>
          <th className="r">AMT</th>
          <th className="r">€</th>
          <th className="c">CCY</th>
        </tr></thead>
        <tbody>
          {evts.map((e, i) => (
            <tr key={i}>
              <td className="mono" style={{ fontSize: 10, color: "var(--accent)" }}>
                {String(e.mo).padStart(2, "0")}/{String(e.day).padStart(2, "0")}
              </td>
              <td className="l" style={{ fontWeight: 600, fontSize: 11 }}>{e.t}<span className="dim" style={{ marginLeft: 6, fontWeight: 400, fontSize: 10 }}>{e.n.slice(0, 16)}</span></td>
              <td className="r mono blur-sensitive" style={{ fontSize: 10 }}>{e.grossLocal.toFixed(2)}</td>
              <td className="r mono blur-sensitive" style={{ color: "var(--accent)", fontWeight: 500 }}>{fmt.money(e.grossEUR, "EUR", { dec: 2 })}</td>
              <td className="c dim" style={{ fontSize: 10 }}>{e.ccy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopContributors() {
  const enriched = HOLDINGS.map(h => ({ ...h, eur: fwdIncomeEUR(h), yld: fwdYield(h) }))
    .sort((a, b) => b.eur - a.eur).slice(0, 8);
  const total = enriched.reduce((s, h) => s + h.eur, 0);
  const max = enriched[0].eur;
  return (
    <table className="t" style={{ width: "100%" }}>
      <thead><tr>
        <th>TICKER</th>
        <th>SECTOR</th>
        <th className="r">FWD €</th>
        <th>SHARE</th>
        <th className="r">YIELD</th>
        <th className="c">GRADE</th>
      </tr></thead>
      <tbody>
        {enriched.map((h, i) => (
          <tr key={h.t}>
            <td className="l" style={{ fontWeight: 600 }}>{h.t}</td>
            <td className="l dim" style={{ fontSize: 10 }}>{h.s}</td>
            <td className="r mono blur-sensitive">{fmt.money(h.eur, "EUR", { dec: 0 })}</td>
            <td><MiniBar pct={(h.eur / max) * 100} color="var(--accent)" w={60} /></td>
            <td className="r mono">{h.yld.toFixed(2)}%</td>
            <td className="c"><Grade g={h.g} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SafetyDist() {
  // count holdings per grade bucket
  const bucket = { "A+": 0, "A": 0, "A-": 0, "B+": 0, "B": 0, "B-": 0, "C+": 0, "C": 0, "D": 0, "F": 0 };
  HOLDINGS.forEach(h => { if (bucket[h.g] !== undefined) bucket[h.g]++; });
  const buckets = Object.entries(bucket);
  const max = Math.max(...buckets.map(b => b[1]));
  // weight by EUR income
  const weights = {};
  HOLDINGS.forEach(h => { weights[h.g] = (weights[h.g] || 0) + fwdIncomeEUR(h); });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "6px 4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 6px" }}>
        <span>Safety distribution</span>
        <span>{HOLDINGS.length} positions</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 70, padding: "0 6px" }}>
        {buckets.map(([k, v]) => {
          if (v === 0) return null;
          const h = (v / max) * 100;
          const color = k.startsWith("A") ? "var(--grade-a)" : k.startsWith("B") ? "var(--grade-b)" : k.startsWith("C") ? "var(--grade-c)" : k.startsWith("D") ? "var(--grade-d)" : "var(--grade-f)";
          return (
            <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span className="mono" style={{ fontSize: 9, color: "var(--text-2)" }}>{v}</span>
              <div style={{ width: "100%", height: `${h}%`, background: color }} />
              <span className="mono" style={{ fontSize: 9, color: "var(--muted)" }}>{k}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", borderTop: "1px solid var(--border)", fontSize: 10 }}>
        <span className="dim">Weighted avg</span>
        <span className="mono" style={{ color: "var(--up)" }}>A · 83.2</span>
      </div>
    </div>
  );
}

function SectorMini() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: 4 }}>
      {SECTORS.slice(0, 6).map((s, i) => (
        <div key={s.k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 6px", fontSize: 10.5 }}>
          <span style={{ width: 8, height: 8, background: `color-mix(in oklab, var(--accent) ${100 - i * 10}%, var(--surface-3))`, flexShrink: 0 }} />
          <span style={{ flex: 1, color: "var(--text-2)" }}>{s.k}</span>
          <span className="mono" style={{ color: "var(--text)", minWidth: 38, textAlign: "right" }}>{s.v.toFixed(1)}%</span>
          <MiniBar pct={s.v * 4} w={44} color="var(--accent)" />
        </div>
      ))}
      <div style={{ padding: "6px 6px 2px", fontSize: 9.5, color: "var(--dim)", borderTop: "1px solid var(--border)", marginTop: 4 }}>
        + 4 sectors · 10.7%
      </div>
    </div>
  );
}

function OverviewScreen({ tweak }) {
  const kpis = [
    { label: "Portfolio value", value: <span className="blur-sensitive">{fmt.money(PORTFOLIO.totalValue, "EUR")}</span>,
      sub: <><span className="up">+{fmt.money(PORTFOLIO.unrealizedPL, "EUR", { dec: 0 })}</span> <span className="dim">/ +{PORTFOLIO.unrealizedPLPct.toFixed(2)}% AT</span></> },
    { label: "YTD total return", value: <span className="up">+{PORTFOLIO.ytdReturn.toFixed(2)}%</span>,
      sub: <span className="dim">vs STOXX €600 +6.84%</span> },
    { label: "Forward annual income", value: <span className="blur-sensitive">{fmt.money(PORTFOLIO.fwdAnnualIncome, "EUR", { dec: 0 })}</span>,
      sub: <><span className="up">+€612</span> <span className="dim">vs 30d ago</span></> },
    { label: "Forward yield", value: PORTFOLIO.forwardYield.toFixed(2) + "%",
      sub: <span className="dim">YoC <span className="mono">{PORTFOLIO.yieldOnCost.toFixed(2)}%</span></span> },
    { label: "Trailing 12-mo income", value: <span className="blur-sensitive">{fmt.money(PORTFOLIO.trailing12, "EUR", { dec: 0 })}</span>,
      sub: <span className="up">+12.4% vs prior</span> },
    { label: "5y div growth", value: PORTFOLIO.divGrowth5y.toFixed(1) + "%",
      sub: <span className="dim">CAGR · weighted</span> },
    { label: "Safety grade", value: <span style={{ display: "flex", alignItems: "center", gap: 8 }}>A <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>· 83.2</span></span>,
      sub: <span className="dim">{HOLDINGS.length} positions</span> },
  ];
  return (
    <Screen tweak={tweak} active="Portfolio" statusLeft="OVERVIEW · LIVE"
      statusSegs={["32 positions", "8 currencies", "Auto-FX: BCE 17:30", "Next pay: 24 May · O · €18.42"]}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 8, gap: 8, minHeight: 0, background: "var(--bg)" }}>
        {/* KPI strip */}
        <StatStrip items={kpis} cols={7} />
        {/* Main 2-col area */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 8, flex: 1, minHeight: 0 }}>
          <Panel title="Cadence — 18-month income rhythm" tag="actual · forecast →"
            headRight={
              <span style={{ display: "flex", gap: 10, marginLeft: 14, fontSize: 9.5, color: "var(--muted)" }}>
                <span><i style={{ display: "inline-block", width: 8, height: 8, background: "var(--accent)", marginRight: 4 }} /> Dividends €</span>
                <span><i style={{ display: "inline-block", width: 10, height: 2, background: "var(--info)", marginRight: 4, verticalAlign: "middle" }} /> Equity total return</span>
              </span>
            }>
            <div style={{ height: "100%", display: "flex" }}>
              <CadenceChart width={820} height={300} />
            </div>
          </Panel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Panel title="FIRE progress" tag="EUR" flush style={{ flex: "0 0 auto" }}>
              <FireBar current={PORTFOLIO.fwdAnnualIncome} target={PORTFOLIO.fireTarget}
                monthly={PORTFOLIO.dividendsThisMonth} targetMonthly={PORTFOLIO.monthlyTarget} />
            </Panel>
            <Panel title="Upcoming payments" tag="next 7" flush style={{ flex: 1, minHeight: 0 }}>
              <UpcomingPays />
            </Panel>
          </div>
        </div>
        {/* Bottom 3-col */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 8, height: 200, flexShrink: 0 }}>
          <Panel title="Top income contributors" tag="forward €" flush>
            <TopContributors />
          </Panel>
          <Panel title="Safety distribution" flush>
            <SafetyDist />
          </Panel>
          <Panel title="Sector allocation" flush>
            <SectorMini />
          </Panel>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, { OverviewScreen, CadenceChart, FireBar, UpcomingPays, TopContributors, SafetyDist, SectorMini });

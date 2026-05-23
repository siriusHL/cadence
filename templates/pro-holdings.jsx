// pro-holdings.jsx — Pro Holdings table + Stock detail, Apple-style

function ProHoldings() {
  const rows = HOLDINGS.map(h => ({
    h,
    valE: valueEUR(h), costE: costEUR(h), incE: fwdIncomeEUR(h),
    pl: valueEUR(h) - costEUR(h),
    plP: ((h.p - h.cp) / h.cp) * 100,
    yld: fwdYield(h), yoc: yoc(h),
    wgt: (valueEUR(h) / 184320.55) * 100,
  })).sort((a, b) => b.valE - a.valE);

  const totVal = rows.reduce((s, r) => s + r.valE, 0);
  const totInc = rows.reduce((s, r) => s + r.incE, 0);
  const totPl = rows.reduce((s, r) => s + r.pl, 0);

  return (
    <ProScreen active="Holdings">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Your positions</div>
          <h1>20 stocks <span className="light">paying you</span></h1>
          <div className="sub">€{totVal.toFixed(0)} across 8 countries · 1 monthly, 14 quarterly, 5 annual payers.</div>
        </div>
        <div className="right-meta">
          <span className="live">Live prices · 17:35 CET</span>
          <span>FX rates · BCE 17:30</span>
          <span>0 cost-basis adjustments pending</span>
        </div>
      </div>

      <div className="filterbar">
        <span className="chip active">All</span>
        <span className="chip">By sector</span>
        <span className="chip">By country</span>
        <span className="chip">By account</span>
        <span className="chip">Watchlist</span>
        <span className="spacer" />
        <span className="search">⌕ Search by ticker or name</span>
        <span className="chip">Sort · Value ↓</span>
      </div>

      <div className="pcard flush">
        <div style={{ overflow: "auto", maxHeight: 580 }}>
          <table className="pt">
            <thead>
              <tr>
                <th>Ticker</th>
                <th className="r">Price</th>
                <th className="r">Day</th>
                <th className="r">Value</th>
                <th className="r">Weight</th>
                <th className="r">P/L</th>
                <th className="r">P/L %</th>
                <th className="r">Yield</th>
                <th className="r">YoC</th>
                <th className="r">Fwd income</th>
                <th className="c">Freq</th>
                <th className="c">Safety</th>
                <th className="c">12M</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const h = r.h;
                const seed = h.t.charCodeAt(0) + h.t.length;
                const day = ((seed * 13) % 230) / 100 - 1.15;
                const spark = Array.from({ length: 24 }, (_, k) => 50 + Math.sin(k * 0.3 + seed) * 8 + Math.cos(k * 0.4) * 4 + (k * day * 0.3));
                return (
                  <tr key={h.t}>
                    <td className="ticker">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(0,0,0,0.045)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600 }}>{h.t.slice(0, 2)}</div>
                        <div>
                          {h.t}
                          <span className="name">{h.n}</span>
                        </div>
                      </div>
                    </td>
                    <td className="r b">{h.p.toFixed(2)} <span className="muted" style={{ fontSize: 10.5, fontWeight: 400 }}>{h.x}</span></td>
                    <td className={"r " + (day >= 0 ? "up" : "down")}>{day >= 0 ? "+" : ""}{day.toFixed(2)}%</td>
                    <td className="r b">€{r.valE.toFixed(0)}</td>
                    <td className="r">
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end", width: "100%" }}>
                        <div className="pbar" style={{ width: 50 }}><i style={{ width: `${Math.min(100, r.wgt * 8)}%` }} /></div>
                        <span style={{ minWidth: 36, textAlign: "right" }}>{r.wgt.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className={"r " + (r.pl >= 0 ? "up" : "down")}>{r.pl >= 0 ? "+" : ""}€{Math.abs(r.pl).toFixed(0)}</td>
                    <td className={"r " + (r.plP >= 0 ? "up" : "down")}>{r.plP >= 0 ? "+" : ""}{r.plP.toFixed(1)}%</td>
                    <td className="r">{r.yld.toFixed(2)}%</td>
                    <td className="r up">{r.yoc.toFixed(2)}%</td>
                    <td className="r b">€{r.incE.toFixed(0)}</td>
                    <td className="c muted" style={{ fontSize: 11 }}>{h.f === 12 ? "Mon" : h.f === 4 ? "Qtr" : h.f === 2 ? "Semi" : "Ann"}</td>
                    <td className="c"><span className="pgrade" data-g={h.g}>{h.g}</span></td>
                    <td className="c"><ProSparkline data={spark} w={70} h={20} up={day >= 0} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="b">Total · 20 positions</td>
                <td className="r muted">—</td>
                <td className="r up">+0.34%</td>
                <td className="r">€{totVal.toFixed(0)}</td>
                <td className="r">100.0%</td>
                <td className="r up">+€{totPl.toFixed(0)}</td>
                <td className="r up">+29.0%</td>
                <td className="r">4.02%</td>
                <td className="r up">5.19%</td>
                <td className="r">€{totInc.toFixed(0)}</td>
                <td className="c muted">—</td>
                <td className="c"><span className="pgrade" data-g="A">A</span></td>
                <td className="c muted">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </ProScreen>
  );
}

// ─── Stock detail — Realty Income ──────────────────────────
function ProPriceChart({ series, w = 700, h = 220 }) {
  const pad = { t: 16, r: 56, b: 22, l: 12 };
  const W = w, H = h, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const min = Math.min(...series), max = Math.max(...series);
  const range = max - min || 1;
  const xs = (i) => pad.l + (i / (series.length - 1)) * iw;
  const ys = (v) => pad.t + ih - ((v - min) / range) * ih;
  const path = series.map((v, i) => (i === 0 ? "M" : "L") + xs(i).toFixed(1) + "," + ys(v).toFixed(1)).join(" ");
  const area = `${path} L ${xs(series.length - 1)},${pad.t + ih} L ${xs(0)},${pad.t + ih} Z`;
  const exDivs = [0.18, 0.43, 0.68, 0.93];
  const color = "oklch(0.55 0.10 175)";
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="g-px-pro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g, i) => (
        <line key={i} x1={pad.l} x2={W - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g}
          stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
      ))}
      <path d={area} fill="url(#g-px-pro)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {exDivs.map((p, i) => (
        <g key={i}>
          <circle cx={pad.l + iw * p} cy={pad.t + ih * 0.94} r="3" fill={color} />
          <line x1={pad.l + iw * p} x2={pad.l + iw * p} y1={pad.t + ih * 0.85} y2={pad.t + ih}
            stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
        </g>
      ))}
      {/* current price label */}
      <rect x={W - pad.r + 4} y={ys(series[series.length - 1]) - 9} width="50" height="18" rx="4" fill={color} />
      <text x={W - pad.r + 29} y={ys(series[series.length - 1]) + 4} textAnchor="middle"
        style={{ fontSize: 11, fill: "#fff", fontWeight: 600 }}>${series[series.length - 1].toFixed(2)}</text>
    </svg>
  );
}

function ProDivHist({ data, w = 700, h = 140 }) {
  const pad = { t: 12, r: 16, b: 22, l: 30 };
  const W = w, H = h, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(...data.map(d => d.a)) * 1.15;
  const bw = iw / data.length;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {[0, 0.5, 1].map((g, i) => (
        <line key={i} x1={pad.l} x2={W - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g}
          stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
      ))}
      {data.map((d, i) => {
        const bh = (d.a / max) * ih;
        const x = pad.l + i * bw + 2;
        return (
          <g key={i}>
            <rect x={x} y={pad.t + ih - bh} width={bw - 4} height={bh} rx="2"
              fill="oklch(0.55 0.10 175)" opacity={0.6 + (i / data.length) * 0.4} />
            {i % 4 === 0 && (
              <text x={x + (bw - 4) / 2} y={H - 8} textAnchor="middle"
                style={{ fontSize: 10, fill: "#86868b", fontWeight: 500 }}>{d.y}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function SafetyRing({ score = 84, size = 110 }) {
  const r = size / 2 - 8;
  const cx = size / 2, cy = size / 2;
  const start = -Math.PI * 0.62, end = Math.PI * 1.62;
  const total = end - start;
  const arc = (frac) => {
    const a = start + total * frac;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const ringPath = (frac) => {
    if (frac <= 0) return "";
    const [x0, y0] = arc(0), [x1, y1] = arc(frac);
    const large = frac > 0.5 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };
  const frac = score / 100;
  const color = score >= 80 ? "oklch(0.52 0.10 165)" : score >= 65 ? "oklch(0.62 0.10 130)" : "oklch(0.62 0.12 80)";
  return (
    <svg width={size} height={size}>
      <path d={ringPath(1)} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="7" strokeLinecap="round" />
      <path d={ringPath(frac)} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" />
      <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 28, fontWeight: 600, fill: "#1d1d1f", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{score}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 9, fill: "#86868b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Safety</text>
    </svg>
  );
}

function ProStock() {
  const s = STOCK_O;
  const pillars = [
    { k: "Payout ratio (AFFO)", v: "76.8%",   pct: 78, note: "Healthy for REIT" },
    { k: "Debt / EBITDA",       v: "5.9×",    pct: 80, note: "Investment grade A−" },
    { k: "FCF dividend cover",  v: "1.31×",   pct: 88, note: "Comfortable cushion" },
    { k: "Growth streak",       v: "30 years",pct: 92, note: "Dividend Aristocrat" },
    { k: "Recession history",   v: "B+",      pct: 76, note: "No cuts in '08, '20" },
    { k: "Yield vs 5y avg",     v: "+0.4σ",   pct: 82, note: "Slightly cheap" },
  ];

  return (
    <ProScreen active="Research">
      <div className="pro-hero">
        <div>
          <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Realty Income · NYSE · {s.industry} <span className="ppill">Owned · 540 shares</span>
          </div>
          <h1>O <span style={{ fontSize: 26, fontWeight: 400, color: "#86868b", marginLeft: 10 }}>${s.px.toFixed(2)} <span className="up" style={{ fontWeight: 500 }}>+0.70%</span></span></h1>
          <div className="sub">The Monthly Dividend Company<sup style={{ fontSize: 8 }}>®</sup> · Cadence rates this stock <b style={{ color: "oklch(0.36 0.08 165)" }}>Very Safe</b> with 30 consecutive years of monthly raises.</div>
        </div>
        <div className="right-meta">
          <span className="live">Live · spread $0.05</span>
          <span>VWAP $58.74 · Vol 4.2M</span>
          <span>Next ex-div · 31 May 2026</span>
        </div>
      </div>

      <div className="hero-stats" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: 14 }}>
        <div className="tile">
          <div className="l">Forward yield</div>
          <div className="v">{s.fwdYield.toFixed(2)}<span style={{ fontSize: 16, color: "#86868b", fontWeight: 400 }}>%</span></div>
          <div className="d">TTM {s.ttmYield.toFixed(2)}% · 5y avg 4.84%</div>
        </div>
        <div className="tile">
          <div className="l">Next payment</div>
          <div className="v"><span className="cur">$</span>0.2635</div>
          <div className="d">540 sh → <b style={{ color: "#1d1d1f" }}>€130.62</b> · Jun 13</div>
        </div>
        <div className="tile">
          <div className="l">5y div growth</div>
          <div className="v up">+3.1<span style={{ fontSize: 16, fontWeight: 400 }}>%</span></div>
          <div className="d">CAGR · last raise +0.4%</div>
        </div>
        <div className="tile">
          <div className="l">Streak · monthly</div>
          <div className="v">30<span style={{ fontSize: 16, color: "#86868b", fontWeight: 400 }}>y</span></div>
          <div className="d">125 consec. raises</div>
        </div>
        <div className="tile">
          <div className="l">Market cap</div>
          <div className="v sm">$51.2B</div>
          <div className="d">P/AFFO 16.2 · β 0.78</div>
        </div>
      </div>

      <div className="row-2" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="pcard">
            <div className="pcard-h">
              <div>
                <div className="t">Price · 3 months</div>
                <div style={{ fontSize: 11.5, color: "#86868b", marginTop: 2 }}>Markers show ex-dividend dates.</div>
              </div>
              <div className="seg">
                {["1D","1W","1M","3M","6M","1Y","5Y","Max"].map((r) =>
                  <button key={r} className={r === "3M" ? "on" : ""}>{r}</button>
                )}
              </div>
            </div>
            <ProPriceChart series={s.series} w={780} h={160} />
          </div>

          <div className="pcard">
            <div className="pcard-h">
              <div>
                <div className="t">Dividend history · 5 years</div>
                <div style={{ fontSize: 11.5, color: "#86868b", marginTop: 2 }}>Quarterly cents per share.</div>
              </div>
              <span className="ppill up">↑ 2.4% CAGR</span>
            </div>
            <ProDivHist data={s.divHist} w={780} h={110} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="pcard">
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <SafetyRing score={s.safetyScore} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "#86868b", fontWeight: 500 }}>Cadence Safety Score</div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 2 }}>Very Safe · A</div>
                <div style={{ fontSize: 12, color: "#6e6e73", marginTop: 6, lineHeight: 1.4 }}>
                  Last cut: <b style={{ color: "#1d1d1f" }}>never</b>. FCF cushion <b style={{ color: "#1d1d1f" }}>1.31×</b>. Watch refinancing in 2027 if 10y stays {">"}4.5%.
                </div>
              </div>
            </div>
          </div>

          <div className="pcard">
            <div className="pcard-h">
              <div className="t">6 safety pillars</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {pillars.map((p) => (
                <div key={p.k} style={{ display: "grid", gridTemplateColumns: "115px 1fr 56px", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 11.5, color: "#1d1d1f" }}>{p.k}</span>
                  <div className="pbar"><i style={{ width: `${p.pct}%`, background: p.pct >= 80 ? "oklch(0.52 0.10 165)" : p.pct >= 65 ? "oklch(0.62 0.10 130)" : "oklch(0.62 0.12 80)" }} /></div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1d1d1f", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{p.v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pcard">
            <div className="pcard-h">
              <div className="t">Key statistics</div>
              <span className="tag">USD</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 16px", fontSize: 11.5 }}>
              {[
                ["P / AFFO", "16.2"], ["P / Book", s.pb.toFixed(2)],
                ["Beta · 5y", s.beta.toFixed(2)], ["Debt/Eq", s.debtEq.toFixed(2)],
                ["AFFO payout", "76.8%"], ["FCF payout", "76.0%"],
                ["Net debt / EBITDA", "5.9×"], ["Interest cover", "3.4×"],
              ].map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < 6 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                  <span style={{ color: "#86868b" }}>{k}</span>
                  <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ProScreen>
  );
}

Object.assign(window, { ProHoldings, ProStock, ProPriceChart, ProDivHist, SafetyRing });

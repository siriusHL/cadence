// free-screens.jsx — Apple-inspired beginner experience
// 4 simple, generous, friendly screens for the free tier.

// ─── Shared bits ─────────────────────────────────────────────
const FREE_TABS = ["Home", "Coming up", "Your stocks", "Your year"];

function AppleNav({ active, tabs, plan = "Free", name = "MR", planBadge }) {
  return (
    <div className="fnav">
      <div className="brand"><span className="dot" /> Cadence</div>
      <div className="tabs">
        {tabs.map((t) => (
          <span key={t} className={"t" + (t === active ? " active" : "")}>{t}</span>
        ))}
      </div>
      <div className="right">
        <span className={"plan" + (planBadge === "pro" ? " plan-pro" : "")}>{plan === "Pro" ? "✦ Pro" : "Plan · " + plan}</span>
        <span className="avatar">{name}</span>
      </div>
    </div>
  );
}

function FreeScreen({ active, children }) {
  return (
    <div className="cdn-free">
      <AppleNav active={active} tabs={FREE_TABS} plan="Free" />
      <div className="scroll">{children}</div>
    </div>
  );
}

const PRO_TABS = ["Dashboard", "Holdings", "Research", "Income", "Performance", "Tax"];

function ProScreen({ active, children, name = "MR" }) {
  return (
    <div className="cdn-free cdn-pro">
      <AppleNav active={active} tabs={PRO_TABS} plan="Pro" planBadge="pro" name={name} />
      <div className="scroll">{children}</div>
    </div>
  );
}

function Upsell({ title = "Want to see further ahead?", body = "Forecast 12 months of income, simulate DRIP, track your FIRE goal, and reclaim foreign tax. From €4/mo.", cta = "Upgrade to Cadence Pro" }) {
  return (
    <div className="upsell">
      <div className="icon">✦</div>
      <div className="body">
        <div className="h">{title}</div>
        <div className="p">{body}</div>
      </div>
      <div className="cta">{cta}</div>
    </div>
  );
}

// ─── A simple sparkline for the free tier ────────────────────
function GentleChart({ data, w = 1180, h = 200, color = "oklch(0.55 0.10 175)" }) {
  const pad = { t: 16, r: 20, b: 26, l: 20 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const max = Math.max(...data.map(d => d.v)) * 1.18;
  const xs = (i) => pad.l + (iw / (data.length - 1)) * i;
  const ys = (v) => pad.t + ih - (v / max) * ih;
  const path = data.map((d, i) => (i === 0 ? "M" : "L") + xs(i) + " " + ys(d.v)).join(" ");
  const area = path + ` L ${xs(data.length - 1)} ${pad.t + ih} L ${xs(0)} ${pad.t + ih} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="g-free" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#g-free)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => i === data.length - 1 && (
        <g key={i}>
          <circle cx={xs(i)} cy={ys(d.v)} r="5" fill="#fff" stroke={color} strokeWidth="2.5" />
        </g>
      ))}
      {data.map((d, i) => (
        <text key={"l" + i} x={xs(i)} y={h - 8} textAnchor="middle"
          style={{ fontSize: 13, fill: "#86868b", fontWeight: 500 }}>
          {d.m}
        </text>
      ))}
    </svg>
  );
}

// ─── 1) HOME — "Your money is earning money" ─────────────────
function FreeHomeScreen() {
  const months = [
    { m: "Dec", v: 482 }, { m: "Jan", v: 510 }, { m: "Feb", v: 498 },
    { m: "Mar", v: 545 }, { m: "Apr", v: 538 }, { m: "May", v: 612 },
  ];
  return (
    <FreeScreen active="Home">
      <div className="hero">
        <div className="eyebrow">This month, May 2026</div>
        <div className="big">
          <span className="cur">€</span>612<span style={{ color: "#86868b", fontWeight: 400 }}>.40</span>
        </div>
        <div className="sub">
          Your stocks paid you in dividends.<br />
          That's <b>€74 more</b> than last month.
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="label">This year so far</div>
          <div className="v"><span className="cur">€</span>2,685</div>
          <div className="delta">
            <span className="up">↑ 11% </span>
            vs the same time last year
          </div>
        </div>
        <div className="card">
          <div className="label">Total saved</div>
          <div className="v"><span className="cur">€</span>184,320</div>
          <div className="delta">
            <span className="up">↑ €41,450 </span>
            since you started
          </div>
        </div>
        <div className="card">
          <div className="label">Stocks paying you</div>
          <div className="v">20</div>
          <div className="delta">
            Across <b>8 countries</b>
          </div>
        </div>
      </div>

      <div className="divider" />

      <div className="card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Your last 6 months</div>
            <div style={{ fontSize: 13, color: "#86868b", marginTop: 2 }}>Income is steadily growing.</div>
          </div>
          <span className="pill safe">↗ Trending up</span>
        </div>
        <GentleChart data={months} w={1200} h={150} />
      </div>

      <div style={{ marginTop: 14 }}>
        <Upsell />
      </div>
    </FreeScreen>
  );
}

// ─── 2) COMING UP — "Realty Income pays you in 3 days" ──────
function FreeNextScreen() {
  const upcoming = [
    { t: "O",    n: "Realty Income",       day: "May 24", inDays: 3,  amt: 18.42, kind: "Monthly" },
    { t: "MC",   n: "LVMH",                day: "Jun 02", inDays: 12, amt: 78.20, kind: "Annual" },
    { t: "JNJ",  n: "Johnson & Johnson",   day: "Jun 09", inDays: 19, amt: 125.18, kind: "Quarterly" },
    { t: "KO",   n: "Coca-Cola",           day: "Jun 14", inDays: 24, amt: 168.21, kind: "Quarterly" },
    { t: "O",    n: "Realty Income",       day: "Jun 24", inDays: 34, amt: 18.42, kind: "Monthly" },
  ];

  const next = upcoming[0];
  return (
    <FreeScreen active="Coming up">
      <div className="hero" style={{ paddingBottom: 16 }}>
        <div className="eyebrow">Coming up</div>
        <div className="big">
          <span className="accent">{next.t}</span>
          <span style={{ fontSize: 44, fontWeight: 400, color: "#86868b", marginLeft: 12 }}>pays you in</span>
        </div>
        <div className="sub" style={{ marginTop: 12 }}>
          <span style={{ fontSize: 44, fontWeight: 600, color: "#1d1d1f", letterSpacing: "-0.04em", lineHeight: 1 }}>3 days</span>
        </div>
        <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 14, padding: "12px 18px", background: "#fff", borderRadius: 999, boxShadow: "0 1px 2px rgba(0,0,0,.04), 0 6px 18px rgba(0,0,0,.04)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "oklch(0.94 0.04 175)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, color: "oklch(0.36 0.07 175)", fontSize: 12 }}>{next.t}</div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{next.n}</div>
            <div style={{ fontSize: 12, color: "#86868b" }}>{next.kind} dividend</div>
          </div>
          <div style={{ width: 1, height: 28, background: "rgba(0,0,0,0.08)" }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 500 }} className="num">€{next.amt.toFixed(2)}</div>
            <div style={{ fontSize: 12, color: "#86868b" }}>arriving {next.day}</div>
          </div>
        </div>
      </div>

      <div>
        <div className="sect-h">More <span className="light">on the way</span></div>
        <div className="sect-sub">The next few payments you'll receive.</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {upcoming.slice(1).map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 18px", background: "#fff", borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,.03)" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 12, color: "#1d1d1f" }}>{p.t}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{p.n}</div>
              <div style={{ fontSize: 13, color: "#86868b" }}>{p.kind} · in {p.inDays} days</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="num" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>€{p.amt.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: "#86868b" }}>{p.day}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <Upsell title="See your full payment calendar" body="Pro shows every payment for the next 12 months — and reminds you 3 days before each one." cta="See Pro features" />
      </div>
    </FreeScreen>
  );
}

// ─── 3) YOUR STOCKS — friendly card grid ─────────────────────
function FreeStocksScreen() {
  // Pick 8 representative; group friendly safety
  const friendly = HOLDINGS.slice(0, 8).map((h) => {
    const annualEUR = fwdIncomeEUR(h);
    const monthlyEUR = annualEUR / 12;
    const yld = fwdYield(h);
    const safetyMap = { "A+": "Very safe", "A": "Very safe", "A-": "Safe", "B+": "Safe", "B": "OK", "B-": "OK", "C+": "Watch", "C": "Watch", "C-": "Watch", "D": "Watch", "F": "Watch" };
    const safetyClass = { "Very safe": "safe", "Safe": "safe", "OK": "ok", "Watch": "watch" };
    const safety = safetyMap[h.g];
    return { h, monthlyEUR, annualEUR, yld, safety, safetyClass: safetyClass[safety] };
  });

  return (
    <FreeScreen active="Your stocks">
      <div style={{ paddingTop: 36, paddingBottom: 24 }}>
        <div className="sect-h">Your <span className="light">20 dividend stocks</span></div>
        <div className="sect-sub">Together they pay you about <b style={{ color: "#1d1d1f", fontWeight: 500 }}>€618 every month</b>.</div>
      </div>

      <div className="grid-4">
        {friendly.map(({ h, monthlyEUR, annualEUR, yld, safety, safetyClass }) => (
          <div key={h.t} className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{h.t}</div>
                <div style={{ fontSize: 12, color: "#86868b", marginTop: 2 }}>{h.n}</div>
              </div>
              <span className={"pill " + safetyClass}>
                <span className="dot" style={{ background: "currentColor" }} />
                {safety}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "#86868b", marginBottom: 2 }}>Pays you</div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }} className="num">€{monthlyEUR.toFixed(0)}<span style={{ fontSize: 13, color: "#86868b", fontWeight: 400 }}> / month</span></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#86868b" }}>Yearly</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }} className="num">€{annualEUR.toFixed(0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#86868b" }}>Yield</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }} className="num">{yld.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", margin: "20px 0 8px" }}>
        <span className="btn ghost">+ 12 more stocks</span>
      </div>

      <Upsell title="Unlock deeper research" body="Pro shows safety scores, dividend history, payout ratios, and analyst views for every stock you own — and any you're considering." cta="Try Pro free for 14 days" />
    </FreeScreen>
  );
}

// ─── 4) YOUR YEAR — story of dividends earned ───────────────
function FreeYearScreen() {
  const months = [
    { m: "Jan", v: 510 }, { m: "Feb", v: 498 }, { m: "Mar", v: 545 },
    { m: "Apr", v: 538 }, { m: "May", v: 612 }, { m: "Jun", v: 0, future: true },
    { m: "Jul", v: 0, future: true }, { m: "Aug", v: 0, future: true },
    { m: "Sep", v: 0, future: true }, { m: "Oct", v: 0, future: true },
    { m: "Nov", v: 0, future: true }, { m: "Dec", v: 0, future: true },
  ];
  // For chart, show actuals + leave future empty
  const actuals = months.filter(m => !m.future);
  const totalSoFar = actuals.reduce((s, m) => s + m.v, 0);
  const dailyAvg = totalSoFar / 141; // days into 2026

  const max = Math.max(...months.map(m => m.v || 1)) * 1.2;

  return (
    <FreeScreen active="Your year">
      <div className="hero">
        <div className="eyebrow">Your 2026 so far</div>
        <div className="big">
          <span className="cur">€</span>{totalSoFar.toLocaleString("de-DE")}
        </div>
        <div className="sub">
          in dividends, just from your stocks.<br />
          That's like <b>€{dailyAvg.toFixed(2)} every day</b>, on autopilot.
        </div>
      </div>

      <div className="card" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Income by month</div>
            <div style={{ fontSize: 13, color: "#86868b", marginTop: 2 }}>Solid blocks are what you've received. Faded blocks show what's expected.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="pill" style={{ background: "rgba(0,0,0,0.04)" }}>2026</span>
          </div>
        </div>

        {/* Monthly bars */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150, padding: "0 8px" }}>
          {months.map((m, i) => {
            const v = m.future ? 540 : m.v;
            const h = (v / max) * 100;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", width: "100%" }}>
                  {!m.future && (
                    <div className="num" style={{ fontSize: 12, color: "#1d1d1f", fontWeight: 500, textAlign: "center", marginBottom: 6 }}>
                      €{m.v}
                    </div>
                  )}
                  <div style={{
                    height: `${h}%`,
                    background: m.future ? "rgba(0,0,0,0.06)" : "oklch(0.55 0.10 175)",
                    borderRadius: "6px 6px 0 0",
                  }} />
                </div>
                <div style={{ fontSize: 12, color: m.future ? "#86868b" : "#1d1d1f", fontWeight: m.future ? 400 : 500 }}>{m.m}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-3" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="label">Expected by year-end</div>
          <div className="v"><span className="cur">€</span>7,310</div>
          <div className="delta"><span className="up">↑ 11% </span> vs 2025</div>
        </div>
        <div className="card">
          <div className="label">Biggest paying month</div>
          <div className="v sm">June</div>
          <div className="delta">~€720 expected</div>
        </div>
        <div className="card">
          <div className="label">A fun way to think about it</div>
          <div className="v sm">Coffee a day, on us</div>
          <div className="delta">€7.31 daily · forever</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Upsell title="See 5, 10, 25 years ahead" body="Pro projects how your dividend income compounds with reinvestment, contributions, and historical growth. Plan your path to financial freedom." />
      </div>
    </FreeScreen>
  );
}

Object.assign(window, { FreeHomeScreen, FreeNextScreen, FreeStocksScreen, FreeYearScreen, ProScreen, AppleNav, Upsell, GentleChart });

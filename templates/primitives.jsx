// primitives.jsx — shared building blocks
//
// fmt utilities, Sparkline, MiniBar, SafetyMeter, Grade chip, etc.

// ─── formatting ─────────────────────────────────────────────
const fmt = {
  // EUR by default, switchable
  money: (n, ccy = "EUR", opts = {}) => {
    const sym = { EUR: "€", USD: "$", GBP: "£", CHF: "Fr", CAD: "C$" }[ccy] || (ccy + " ");
    const dec = opts.dec ?? 2;
    const abs = Math.abs(n);
    let s;
    if (opts.compact && abs >= 1_000_000) s = (n / 1_000_000).toFixed(2) + "M";
    else if (opts.compact && abs >= 10_000) s = (n / 1000).toFixed(1) + "k";
    else s = n.toLocaleString("de-DE", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return `${sym}${s}`;
  },
  pct: (n, dec = 2, withSign = false) => {
    const s = (withSign && n > 0 ? "+" : "") + n.toFixed(dec) + "%";
    return s;
  },
  num: (n, dec = 0) => n.toLocaleString("de-DE", { minimumFractionDigits: dec, maximumFractionDigits: dec }),
  signed: (n, dec = 2) => (n >= 0 ? "+" : "") + n.toFixed(dec),
};

// ─── Sparkline ───────────────────────────────────────────────
function Sparkline({ data, w = 60, h = 18, stroke = "currentColor", fill, strokeWidth = 1, dotsAtEnd = false }) {
  if (!data || data.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const xs = (i) => (i / (data.length - 1)) * (w - 2) + 1;
  const ys = (v) => h - 1 - ((v - min) / range) * (h - 2);
  const pts = data.map((v, i) => `${xs(i)},${ys(v)}`).join(" ");
  const lineEnd = data[data.length - 1];
  return (
    <svg className="spark" width={w} height={h}>
      {fill && (
        <polygon points={`${xs(0)},${h - 1} ${pts} ${xs(data.length - 1)},${h - 1}`} fill={fill} opacity="0.18" />
      )}
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      {dotsAtEnd && (
        <circle cx={xs(data.length - 1)} cy={ys(lineEnd)} r="1.6" fill={stroke} />
      )}
    </svg>
  );
}

// ─── MiniBar ─────────────────────────────────────────────────
function MiniBar({ pct, color = "var(--accent)", w = 60, h = 5 }) {
  return (
    <div className="barbg" style={{ width: w, height: h }}>
      <i style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}

// ─── Safety Meter — a radial dial 0..100 ─────────────────────
function SafetyMeter({ score = 84, size = 72, label = "Safety", grade }) {
  const r = size / 2 - 5;
  const cx = size / 2, cy = size / 2;
  const start = Math.PI * 0.75, end = Math.PI * 2.25;
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
  const frac = Math.max(0, Math.min(1, score / 100));
  const color = score >= 80 ? "var(--grade-a)" : score >= 65 ? "var(--grade-b)" : score >= 50 ? "var(--grade-c)" : score >= 35 ? "var(--grade-d)" : "var(--grade-f)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        <path d={ringPath(1)} fill="none" stroke="var(--surface-3)" strokeWidth="4" strokeLinecap="round" />
        <path d={ringPath(frac)} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
        <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: "var(--ff-mono)", fontSize: size * 0.32, fontWeight: 600, fill: "var(--text)" }}>{score}</text>
        <text x={cx} y={cy + size * 0.22} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: "var(--ff-mono)", fontSize: size * 0.13, fill: "var(--muted)" }}>{label}</text>
      </svg>
      {grade && <span className="grade" data-g={grade} style={{ width: 26, height: 18 }}>{grade}</span>}
    </div>
  );
}

// ─── Grade pill ──────────────────────────────────────────────
function Grade({ g }) {
  return <span className="grade" data-g={g}>{g}</span>;
}

// ─── Change cell ─────────────────────────────────────────────
function Chg({ v, withPct = false, withSign = true }) {
  if (v == null || Number.isNaN(v)) return <span className="dim">—</span>;
  const cls = v > 0 ? "up" : v < 0 ? "down" : "muted";
  const sign = v > 0 ? "+" : v < 0 ? "−" : "±";
  return (
    <span className={cls + " mono"}>
      {(withSign ? sign : "") + Math.abs(v).toFixed(2) + (withPct ? "%" : "")}
    </span>
  );
}

// ─── Panel wrapper ───────────────────────────────────────────
function Panel({ title, tag, children, flush, style, headRight }) {
  return (
    <div className={"panel" + (flush ? " flush" : "")} style={style}>
      {title && (
        <div className="head">
          <span className="title">{title}</span>
          {headRight}
          {tag && <span className="tag">{tag}</span>}
        </div>
      )}
      <div className="body">{children}</div>
    </div>
  );
}

// ─── Country flag block (text-only) ──────────────────────────
const FLAGS = { US: "🇺🇸", CA: "🇨🇦", NL: "🇳🇱", DE: "🇩🇪", FR: "🇫🇷", CH: "🇨🇭", GB: "🇬🇧", ES: "🇪🇸", IT: "🇮🇹", JP: "🇯🇵", DK: "🇩🇰" };
function Flag({ c }) { return <span style={{ fontSize: 11, lineHeight: 1 }}>{FLAGS[c] || ""}</span>; }

// ─── Heatmap cell color helper ───────────────────────────────
function heatColor(v, max) {
  if (!v) return "var(--surface-2)";
  const f = Math.max(0.08, Math.min(1, v / max));
  return `color-mix(in oklab, var(--accent) ${Math.round(f * 100)}%, var(--surface))`;
}

// ─── A flexible 'meta strip' for stat blocks ─────────────────
function StatStrip({ items, cols }) {
  const c = cols || items.length;
  return (
    <div className="strip" style={{ gridTemplateColumns: `repeat(${c}, 1fr)` }}>
      {items.map((it, i) => (
        <div key={i} className="stat">
          <div className="label">{it.label}</div>
          <div className="val">{it.value}</div>
          {it.sub && <div className="sub">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── Chrome (topbar + statusbar) ─────────────────────────────
function TopBar({ active = "Portfolio", ticker = "Andersson · €184,320", asOf = "17:35:14 CET" }) {
  const tabs = ["Portfolio","Income","Calendar","Research","Tools","Tax"];
  return (
    <div className="topbar">
      <div className="brand">
        <span className="logo"></span>
        <span>CADENCE</span>
        <span className="dim mono" style={{ fontSize: 9.5, marginLeft: 4 }}>v2.4</span>
      </div>
      <div className="nav">
        {tabs.map((t, i) => (
          <div key={t} className={"tab" + (t === active ? " active" : "")}>
            {t}<span className="kbd">{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="spacer" />
      <div className="meta">
        <span><span className="dot"></span>LIVE · €</span>
        <span className="blur-sensitive">{ticker}</span>
        <span>{asOf}</span>
      </div>
    </div>
  );
}

function StatusBar({ left = "READY", segments = [] }) {
  return (
    <div className="statusbar">
      <div className="seg">{left}</div>
      {segments.map((s, i) => <div key={i} className="seg">{s}</div>)}
      <div className="seg">F1 help · F5 refresh · ⌘K command</div>
    </div>
  );
}

// ─── ArtboardChrome — wraps a screen with cdn root + chrome ──
function Screen({ children, active, statusSegs = [], asOf, ticker, tweak, statusLeft }) {
  return (
    <div className="cdn"
      data-theme={tweak.theme}
      data-accent={tweak.accent}
      data-density={tweak.density}
      data-blur={tweak.blur ? "1" : "0"}
      style={{ height: "100%", width: "100%" }}>
      <TopBar active={active} asOf={asOf} ticker={ticker} />
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
        {children}
      </div>
      <StatusBar left={statusLeft} segments={statusSegs} />
    </div>
  );
}

Object.assign(window, {
  fmt, Sparkline, MiniBar, SafetyMeter, Grade, Chg, Panel, Flag, heatColor,
  StatStrip, TopBar, StatusBar, Screen, FLAGS,
});

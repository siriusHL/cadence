/* eslint-disable @next/next/no-img-element */
// Visual mock components for the marketing landing.
// All SVG / divs — no external assets.

const UP = 'oklch(0.5 0.09 165)';
const ACCENT_BG = '#f5f1e6';

// ─── Compact hero product mockup ────────────────────────────
export function HeroDashMockCompact() {
  const months = [
    { m: 'Jul', v: 510 }, { m: 'Aug', v: 498 }, { m: 'Sep', v: 545 },
    { m: 'Oct', v: 568 }, { m: 'Nov', v: 612 }, { m: 'Dec', v: 690 },
    { m: 'Jan', v: 624 }, { m: 'Feb', v: 642 }, { m: 'Mar', v: 668 },
    { m: 'Apr', v: 720 }, { m: 'May', v: 742 }, { m: 'Jun', v: 798 },
  ];
  const maxV = 850;
  const cw = 720, ch = 110, pad = 12;
  const xs = (i: number) => pad + (i / (months.length - 1)) * (cw - pad * 2);
  const ys = (v: number) => ch - 6 - (v / maxV) * (ch - 20);
  const path = months.map((m, i) => `${i ? 'L' : 'M'}${xs(i)},${ys(m.v)}`).join(' ');
  const area = `${path} L ${xs(months.length - 1)},${ch - 6} L ${xs(0)},${ch - 6} Z`;

  return (
    <div>
      <div className="mock-browser-chrome">
        <span className="dot" /><span className="dot" /><span className="dot" />
        <span className="flex-1 text-center text-[10.5px] text-black/45 font-medium">cadence.app/dashboard</span>
      </div>

      <div className="p-[22px]">
        <div className="flex gap-[22px] text-[11.5px] text-ink-dim mb-[18px]">
          {['Dashboard', 'Holdings', 'Income', 'Performance', 'Tax'].map((t, i) => (
            <span
              key={t}
              className="pb-[6px]"
              style={{
                fontWeight: i === 0 ? 600 : 500,
                color: i === 0 ? '#1a1a1f' : '#86868b',
                borderBottom: i === 0 ? '2px solid oklch(0.42 0.07 175)' : '2px solid transparent',
              }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="flex justify-between items-end mb-[18px]">
          <div>
            <div className="text-[10.5px] text-ink-dim mb-1 uppercase tracking-[0.08em] font-semibold">
              Portfolio · 21 May 2026
            </div>
            <div className="num font-semibold text-[42px] leading-none" style={{ letterSpacing: '-0.03em' }}>
              €184,320<span className="text-ink-dim font-light">.55</span>
            </div>
            <div className="text-xs text-ink-dim mt-1.5">
              Up <b style={{ color: UP }}>€41,450 (+29.0%)</b> · paying <b className="text-ink">€7,413</b>/yr forward
            </div>
          </div>
          <div className="flex flex-col gap-[3px] items-end text-[10.5px] text-ink-dim">
            <span><span className="ping" />Live · 17:35 CET</span>
            <span>Cash · €4,280</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2.5 mb-3.5">
          {[
            { l: 'Forward income', v: '€7,413', d: '+€612 / 30d', up: true },
            { l: 'Forward yield',  v: '4.02%',  d: 'YoC 5.19%' },
            { l: 'YTD return',     v: '+11.4%', d: 'vs STOXX +6.8%', up: true },
            { l: 'Avg safety',     v: 'A',      d: '20 / 0 watch' },
          ].map((k) => (
            <div
              key={k.l}
              className="rounded-[7px] px-3 py-2.5 border"
              style={{ background: '#fafaf6', borderColor: 'rgba(0,0,0,0.05)' }}
            >
              <div className="text-[9.5px] text-ink-dim mb-1 font-medium uppercase tracking-[0.04em]">{k.l}</div>
              <div
                className="num font-semibold text-[20px]"
                style={{ letterSpacing: '-0.02em', color: k.up ? UP : '#1a1a1f' }}
              >
                {k.v}
              </div>
              <div className="text-[10px] text-ink-dim mt-0.5">{k.d}</div>
            </div>
          ))}
        </div>

        <div
          className="rounded-[7px] p-3.5 border"
          style={{ background: '#fafaf6', borderColor: 'rgba(0,0,0,0.05)' }}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-xs font-semibold">Monthly income · 12M trailing</div>
              <div className="text-[10.5px] text-ink-dim mt-0.5">Growing month over month</div>
            </div>
            <div className="flex gap-[3px] text-[10px]">
              {['6M', '1Y', '3Y', 'ALL'].map((r, i) => (
                <span
                  key={r}
                  className="px-2.5 py-[3px] rounded-full border font-medium"
                  style={{
                    background: i === 1 ? '#1a1a1f' : '#fff',
                    color: i === 1 ? '#fff' : '#86868b',
                    borderColor: 'rgba(0,0,0,0.06)',
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
          <svg viewBox={`0 0 ${cw} ${ch}`} width="100%" height={ch} preserveAspectRatio="none">
            <defs>
              <linearGradient id="hero-g-compact" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={UP} stopOpacity="0.3" />
                <stop offset="100%" stopColor={UP} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((p, i) => (
              <line
                key={i}
                x1={pad}
                x2={cw - pad}
                y1={ch - 6 - p * (ch - 20)}
                y2={ch - 6 - p * (ch - 20)}
                stroke="rgba(0,0,0,0.05)"
                strokeWidth="1"
              />
            ))}
            <path d={area} fill="url(#hero-g-compact)" />
            <path d={path} fill="none" stroke={UP} strokeWidth="2" strokeLinejoin="round" />
            {months.map((m, i) => (
              <circle key={m.m} cx={xs(i)} cy={ys(m.v)} r="2.5" fill="white" stroke={UP} strokeWidth="1.5" />
            ))}
          </svg>
          <div className="flex justify-between text-[9.5px] text-ink-dim pt-1 px-3 font-medium">
            {months.map((m) => <span key={m.m}>{m.m}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Year calendar heatmap (used in income section, supports dark) ──
export function YearCalendar({ dark = false }: { dark?: boolean }) {
  const dim = dark ? 'rgba(245,241,230,0.55)' : '#86868b';
  const empty = dark ? 'rgba(245,241,230,0.06)' : 'rgba(0,0,0,0.04)';
  const accent = 'oklch(0.68 0.12 175)';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const data: { has: boolean; intensity: number }[][] = [];
  for (let m = 0; m < 12; m++) {
    const days: { has: boolean; intensity: number }[] = [];
    for (let d = 0; d < 31; d++) {
      const seed = (m * 7 + d * 13 + (m === 4 ? d * 2 : 0)) % 31;
      const has = seed < 7;
      const intensity = has ? (((m + d * 3) * 11) % 4) / 3 : 0;
      days.push({ has, intensity });
    }
    data.push(days);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid items-center gap-2" style={{ gridTemplateColumns: '40px 1fr' }}>
        <div />
        <div
          className="grid gap-[3px] text-[10px] font-semibold"
          style={{ gridTemplateColumns: 'repeat(31, 1fr)', color: dim }}
        >
          {Array.from({ length: 31 }).map((_, i) => (
            <div key={i} className="text-center">
              {[1, 8, 15, 22, 29].includes(i + 1) ? i + 1 : ''}
            </div>
          ))}
        </div>
      </div>
      {months.map((m, mi) => (
        <div key={m} className="grid items-center gap-2" style={{ gridTemplateColumns: '40px 1fr' }}>
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.04em]"
            style={{ color: dim }}
          >
            {m}
          </div>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(31, 1fr)' }}>
            {data[mi].map((d, di) => (
              <div
                key={di}
                className="aspect-square rounded-[3px]"
                style={{
                  background: d.has
                    ? `color-mix(in oklab, ${accent} ${20 + d.intensity * 70}%, ${dark ? '#1a1a1f' : '#f5f1e6'})`
                    : empty,
                }}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 justify-end text-[10px] mt-2" style={{ color: dim }}>
        <span>Less</span>
        {[0.2, 0.45, 0.7, 0.95].map((v) => (
          <div
            key={v}
            className="w-3.5 h-3.5 rounded-[3px]"
            style={{ background: `color-mix(in oklab, ${accent} ${v * 80}%, ${dark ? '#1a1a1f' : '#f5f1e6'})` }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ─── Bento mini visuals ─────────────────────────────────────

export function BentoMiniDashboard() {
  return (
    <div className="bg-white p-3.5">
      <div className="flex justify-between items-end mb-3">
        <div>
          <div className="text-[9px] text-ink-dim mb-[3px] uppercase tracking-[0.08em] font-semibold">
            Portfolio · today
          </div>
          <div className="num font-semibold leading-none text-[24px] text-ink" style={{ letterSpacing: '-0.035em' }}>
            €184,320<span className="text-ink-dim font-light text-sm">.55</span>
          </div>
        </div>
        <div className="text-[10px] font-semibold" style={{ color: UP }}>+€612 today</div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 mb-2.5">
        {[
          { l: 'Forward', v: '€7,413' },
          { l: 'Yield',   v: '4.02%' },
          { l: 'YTD',     v: '+11.4%' },
          { l: 'Safety',  v: 'A' },
        ].map((k) => (
          <div
            key={k.l}
            className="rounded-[5px] py-1.5 px-2.5 border"
            style={{ background: '#fafaf6', borderColor: 'rgba(0,0,0,0.04)' }}
          >
            <div className="text-[8px] text-ink-dim font-semibold uppercase tracking-[0.05em]">{k.l}</div>
            <div className="num font-semibold text-[13px] text-ink mt-0.5" style={{ letterSpacing: '-0.025em' }}>{k.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-[5px] p-2 border" style={{ background: '#fafaf6', borderColor: 'rgba(0,0,0,0.04)' }}>
        <svg viewBox="0 0 480 60" width="100%" height="60">
          <defs>
            <linearGradient id="bmd" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={UP} stopOpacity="0.3" />
              <stop offset="100%" stopColor={UP} stopOpacity="0" />
            </linearGradient>
          </defs>
          {(() => {
            const pts = [22, 28, 25, 34, 30, 38, 42, 40, 48, 52, 50, 58].map((v, i): [number, number] => [i * 42 + 8, 56 - v]);
            const p = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
            return (
              <>
                <path d={`${p} L 470,56 L 8,56 Z`} fill="url(#bmd)" />
                <path d={p} fill="none" stroke={UP} strokeWidth="1.8" strokeLinejoin="round" />
              </>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

export function BentoSafetyChips() {
  const chips = [
    { t: 'JNJ',  g: 'A+', c: 'oklch(0.48 0.08 165)' },
    { t: 'MSFT', g: 'A+', c: 'oklch(0.48 0.08 165)' },
    { t: 'O',    g: 'A',  c: 'oklch(0.48 0.08 165)' },
    { t: 'ABBV', g: 'A',  c: 'oklch(0.48 0.08 165)' },
    { t: 'ENB',  g: 'B+', c: 'oklch(0.62 0.13 60)' },
    { t: 'VZ',   g: 'B',  c: 'oklch(0.62 0.13 60)' },
    { t: 'MMM',  g: 'C+', c: 'oklch(0.58 0.18 28)' },
  ];
  return (
    <div className="flex flex-wrap gap-[5px]">
      {chips.map((c) => (
        <div
          key={c.t}
          className="inline-flex items-center gap-[5px] py-1 px-2.5 rounded-full text-[10.5px] bg-white"
          style={{ border: '1px solid rgba(0,0,0,0.08)' }}
        >
          <span className="font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>{c.t}</span>
          <span
            className="text-white px-[5px] rounded-[3px] text-[9.5px] font-bold"
            style={{ background: c.c, fontFamily: 'var(--font-mono)' }}
          >
            {c.g}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BentoCurrencyFlags() {
  const ccs = [
    { c: '🇺🇸', l: 'USD', pct: 37 },
    { c: '🇪🇺', l: 'EUR', pct: 39 },
    { c: '🇬🇧', l: 'GBP', pct: 10 },
    { c: '🇨🇭', l: 'CHF', pct: 7 },
  ];
  return (
    <div className="flex flex-col gap-1 w-full">
      {ccs.map((c) => (
        <div key={c.l} className="flex items-center gap-2 text-[11px]">
          <span className="text-sm">{c.c}</span>
          <span
            className="text-ink-soft tracking-[0.06em] font-medium text-[10px] w-7"
          >
            {c.l}
          </span>
          <div className="flex-1 h-1 rounded-[2px]" style={{ background: 'rgba(0,0,0,0.05)' }}>
            <div className="h-full rounded-[2px]" style={{ width: c.pct + '%', background: 'oklch(0.48 0.08 175)' }} />
          </div>
          <span className="text-[10px] font-medium text-ink w-7 text-right">{c.pct}%</span>
        </div>
      ))}
    </div>
  );
}

export function BentoCalendarStrip() {
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const accent = 'oklch(0.48 0.08 175)';
  return (
    <div className="w-full">
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
        {months.map((m, mi) => (
          <div key={mi}>
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {Array.from({ length: 16 }).map((_, di) => {
                const seed = (mi * 7 + di * 13) % 16;
                const has = seed < 5;
                const intensity = has ? ((mi + di) % 4) / 3 : 0;
                return (
                  <div
                    key={di}
                    className="aspect-square rounded-[1.5px]"
                    style={{
                      background: has
                        ? `color-mix(in oklab, ${accent} ${20 + intensity * 65}%, white)`
                        : 'rgba(0,0,0,0.04)',
                    }}
                  />
                );
              })}
            </div>
            <div className="text-[9px] text-ink-dim text-center mt-1.5 font-medium">{m}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BentoRhythmBars() {
  const months = [3, 1, 4, 1, 6, 4, 2, 1, 3, 4, 5, 3];
  const ml = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const accent = 'oklch(0.68 0.12 175)';
  return (
    <div className="w-full">
      <div className="grid gap-1 items-end h-[70px]" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
        {months.map((n, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-full flex flex-col-reverse gap-0.5 h-[60px]">
              {Array.from({ length: n }).map((_, j) => (
                <div
                  key={j}
                  className="h-1.5 rounded-[1px]"
                  style={{ background: `color-mix(in oklab, ${accent} ${30 + j * 12}%, #1d1d1f)` }}
                />
              ))}
            </div>
            <span className="text-[9px] font-medium" style={{ color: 'rgba(245,241,230,0.55)' }}>{ml[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { ACCENT_BG, UP };

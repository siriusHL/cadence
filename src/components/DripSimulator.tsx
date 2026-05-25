'use client';

import { useMemo, useState } from 'react';

interface Props {
  baseValue: number;
  baseIncome: number;
  baseCost: number;
}

interface Snapshot {
  year: number;
  value: number;
  income: number;
  monthly: number;
}

const FIRE_THRESHOLD_EUR = 30_000;
const APPRECIATION = 0.045;

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * Project annual portfolio value + dividend income for `years` years under three
 * scenarios. Each scenario applies the same 4.5% appreciation but differs in
 * whether dividends are reinvested and/or monthly contributions are added.
 */
function project(
  years: number,
  yieldPct: number,
  growthPct: number,
  monthlyContrib: number,
  startValue: number,
  startIncome: number,
  drip: boolean,
  contrib: boolean,
): Snapshot[] {
  const out: Snapshot[] = [{ year: 0, value: startValue, income: startIncome, monthly: startIncome / 12 }];
  let v = startValue;
  let inc = startIncome;
  for (let i = 1; i <= years; i++) {
    inc *= 1 + growthPct / 100;
    const reinvested = (drip ? inc : 0) + (contrib ? monthlyContrib * 12 : 0);
    v = v * (1 + APPRECIATION) + reinvested;
    if (reinvested > 0) inc += reinvested * (yieldPct / 100);
    out.push({ year: i, value: v, income: inc, monthly: inc / 12 });
  }
  return out;
}

export function DripSimulator({ baseValue, baseIncome, baseCost }: Props) {
  const [years, setYears] = useState(25);
  const [yieldPct, setYieldPct] = useState(() => Math.min(9, Math.max(1, (baseIncome / baseValue) * 100)));
  const [growthPct, setGrowthPct] = useState(7.8);
  const [contrib, setContrib] = useState(500);

  const series = useMemo(() => ({
    noDrip:   project(years, yieldPct, growthPct, contrib, baseValue, baseIncome, false, false),
    drip:     project(years, yieldPct, growthPct, contrib, baseValue, baseIncome, true,  false),
    dripPlus: project(years, yieldPct, growthPct, contrib, baseValue, baseIncome, true,  true),
  }), [years, yieldPct, growthPct, contrib, baseValue, baseIncome]);

  const breakdown = useMemo<Snapshot[]>(() => {
    const checkpoints = new Set([1, 3, 5, 10, 15, 20, 25, 30, years]);
    return series.dripPlus.filter((s) => checkpoints.has(s.year));
  }, [series.dripPlus, years]);

  const finalIncome = series.dripPlus[series.dripPlus.length - 1].income;
  const fireYear = series.dripPlus.findIndex((p) => p.income >= FIRE_THRESHOLD_EUR);

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">DRIP simulator · Compounding scenarios</div>
          <h1>
            Reach FIRE in{' '}
            <span className="num" style={{ color: 'var(--accent-soft)' }}>
              {fireYear > 0 ? `${fireYear}y` : '—'}
            </span>
          </h1>
          <div className="sub">
            Reinvest dividends and add €{fmt(contrib)}/mo to turn today's{' '}
            €{fmt(baseIncome, 0)} into <b style={{ color: 'var(--text)' }}>€{fmt(finalIncome, 0)}</b>{' '}
            in {years} years.
          </div>
        </div>
        <div className="right-meta">
          <span className="live">Appreciation +{(APPRECIATION * 100).toFixed(1)}%</span>
          <span>FIRE target €{fmt(FIRE_THRESHOLD_EUR)}/yr</span>
          <span>Monte-Carlo off</span>
        </div>
      </div>

      <div className="row-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        <Slider label="Horizon"          value={years}     display={`${years} years`}                  min={5} max={40} step={1}   onChange={setYears}     hint="5 — 40 years" />
        <Slider label="Forward yield"    value={yieldPct}  display={`${yieldPct.toFixed(2)} %`}        min={1} max={9}  step={0.1} onChange={setYieldPct}  hint="Weighted blended" />
        <Slider label="Div growth"       value={growthPct} display={`${growthPct.toFixed(1)} %`}       min={0} max={15} step={0.1} onChange={setGrowthPct} hint="Annual CAGR" />
        <Slider label="Monthly contrib." value={contrib}   display={`€${fmt(contrib)}`}                min={0} max={3000} step={50} onChange={setContrib}   hint="Added each month" />
      </div>

      <div className="pcard" style={{ marginBottom: 14 }}>
        <div className="pcard-h">
          <div>
            <div className="t">Annual dividend income · snowball</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>
              Compare three paths over {years} years.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { c: 'rgba(0,0,0,0.3)',    l: 'No DRIP' },
              { c: 'oklch(0.40 0.06 235)', l: 'DRIP on' },
              { c: 'var(--accent-soft)', l: `DRIP + €${fmt(contrib)}/mo` },
            ].map((g, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
                <span style={{ width: 16, height: 2, background: g.c, borderRadius: 1 }} /> {g.l}
              </span>
            ))}
          </div>
        </div>
        <DripCurves series={series} years={years} fireYear={fireYear} />
      </div>

      <div className="pcard flush">
        <div className="pcard-h">
          <div className="t">Year-by-year breakdown</div>
          <span className="tag">DRIP + contrib scenario</span>
        </div>
        <div style={{ overflow: 'auto' }}>
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
              {breakdown.map((r) => {
                const investedSoFar = baseCost + r.year * contrib * 12;
                const yoc = investedSoFar > 0 ? (r.income / investedSoFar) * 100 : 0;
                const firePct = Math.min(100, (r.income / FIRE_THRESHOLD_EUR) * 100);
                return (
                  <tr key={r.year}>
                    <td className="b" style={{ color: 'var(--accent-soft)' }}>+{r.year}y</td>
                    <td className="r b">€{fmt(r.value, 0)}</td>
                    <td className="r">€{fmt(r.income, 0)}</td>
                    <td className="r muted">€{fmt(r.monthly, 0)}</td>
                    <td className="r up">{yoc.toFixed(1)}%</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="pbar" style={{ flex: 1 }}>
                          <i style={{
                            width: `${firePct}%`,
                            background: firePct >= 100 ? 'oklch(0.48 0.08 165)' : 'var(--accent-soft)',
                          }} />
                        </div>
                        <span className="num" style={{ minWidth: 42, textAlign: 'right', fontSize: 11.5, fontWeight: 500 }}>
                          {firePct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

interface SliderProps {
  label: string;
  display: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint: string;
}

function Slider({ label, display, value, min, max, step, onChange, hint }: SliderProps) {
  const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="pcard" style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>{label}</span>
        <span className="num" style={{ fontSize: 16, fontWeight: 600 }}>{display}</span>
      </div>
      <input
        type="range"
        className="drip-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--progress' as string]: `${progress}%` }}
      />
      <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2 }}>{hint}</div>
    </div>
  );
}

function DripCurves({
  series,
  years,
  fireYear,
}: {
  series: { noDrip: Snapshot[]; drip: Snapshot[]; dripPlus: Snapshot[] };
  years: number;
  fireYear: number;
}) {
  const W = 1180;
  const H = 240;
  const pad = { t: 16, r: 80, b: 26, l: 50 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const incMax = Math.max(...series.dripPlus.map((p) => p.income)) * 1.08;
  const xs = (y: number) => pad.l + (y / years) * iw;
  const ys = (v: number) => pad.t + ih - (v / incMax) * ih;
  const pathFor = (pts: Snapshot[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs(p.year).toFixed(1)},${ys(p.income).toFixed(1)}`).join(' ');

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const yearMarks = [0, Math.round(years / 4), Math.round(years / 2), Math.round((years * 3) / 4), years];
  const fireY = ys(FIRE_THRESHOLD_EUR);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="g-drip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="oklch(0.55 0.10 175)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="oklch(0.55 0.10 175)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridLines.map((g, i) => {
        const value = Math.round((incMax * (1 - g)) / 1000) * 1000;
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g}
                  stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
            <text x={pad.l - 6} y={pad.t + ih * g + 3} textAnchor="end"
                  style={{ fontSize: 10.5, fill: 'var(--text-dim)', fontWeight: 500 }}>
              €{(value / 1000).toFixed(0)}k
            </text>
          </g>
        );
      })}

      {yearMarks.map((y, i) => (
        <text key={i} x={xs(y)} y={H - 8} textAnchor="middle"
              style={{ fontSize: 10.5, fill: 'var(--text-dim)', fontWeight: 500 }}>
          +{y}y
        </text>
      ))}

      <line x1={pad.l} x2={W - pad.r} y1={fireY} y2={fireY}
            stroke="var(--border-strong)" strokeDasharray="4 3" strokeWidth="1" />
      <text x={W - pad.r - 4} y={fireY - 4} textAnchor="end"
            style={{ fontSize: 10.5, fill: 'var(--text-dim)', fontWeight: 500 }}>
        FIRE €{(FIRE_THRESHOLD_EUR / 1000).toFixed(0)}k
      </text>

      <path d={`${pathFor(series.dripPlus)} L ${xs(years)} ${pad.t + ih} L ${xs(0)} ${pad.t + ih} Z`}
            fill="url(#g-drip)" />
      <path d={pathFor(series.noDrip)}   fill="none" stroke="rgba(0,0,0,0.3)"        strokeWidth="1.5" strokeDasharray="4 4" />
      <path d={pathFor(series.drip)}     fill="none" stroke="oklch(0.40 0.06 235)" strokeWidth="1.8" />
      <path d={pathFor(series.dripPlus)} fill="none" stroke="oklch(0.55 0.10 175)" strokeWidth="2.4" strokeLinecap="round" />

      {[
        { p: series.noDrip[years],   c: 'rgba(0,0,0,0.5)' },
        { p: series.drip[years],     c: 'oklch(0.40 0.06 235)' },
        { p: series.dripPlus[years], c: 'oklch(0.55 0.10 175)' },
      ].map((s, i) => (
        <g key={i}>
          <circle cx={xs(s.p.year)} cy={ys(s.p.income)} r="4" fill="var(--surface)" stroke={s.c} strokeWidth="2" />
          <text x={xs(s.p.year) + 8} y={ys(s.p.income) + 4}
                style={{ fontSize: 11, fill: s.c, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            €{(s.p.income / 1000).toFixed(1)}k
          </text>
        </g>
      ))}

      {fireYear > 0 && (
        <g>
          <line x1={xs(fireYear)} x2={xs(fireYear)} y1={pad.t} y2={pad.t + ih}
                stroke="oklch(0.55 0.10 175)" strokeOpacity="0.4" />
          <rect x={xs(fireYear) - 30} y={pad.t + 4} width="60" height="18" rx="9"
                fill="oklch(0.55 0.10 175)" />
          <text x={xs(fireYear)} y={pad.t + 16} textAnchor="middle"
                style={{ fontSize: 10.5, fill: '#fff', fontWeight: 600 }}>
            FIRE +{fireYear}y
          </text>
        </g>
      )}
    </svg>
  );
}

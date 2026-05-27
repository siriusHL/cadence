'use client';

import { InfoTooltip } from './InfoTooltip';

interface Props {
  hhi: number;
  concColor: string;
  top5Pct: number;
  top10Pct: number;
  largestPct: number;
  largestColor: string;
  index?: number;
}

export function ConcentrationCheck({
  hhi,
  concColor,
  top5Pct,
  top10Pct,
  largestPct,
  largestColor,
  index = 0,
}: Props) {
  return (
    <div
      className="pcard concentration-card cdn-anim interactive"
      style={{ ['--i' as never]: index }}
    >
      <div className="pcard-h">
        <div className="t">
          Concentration check
          <InfoTooltip label="Four signals for whether your portfolio is over-reliant on a small number of positions. Lower percentages and lower HHI = more spread out, more resilient to any single stock blowing up." />
        </div>
        <span className="tag">thresholds</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Metric
          label="HHI"
          value={hhi.toFixed(0)}
          pct={(hhi / 2500) * 100}
          caption="2500 (high)"
          color={concColor}
          delay={260}
          tip={`Herfindahl-Hirschman Index. Sum of each position's squared weight (in %). One stock holding everything scores 10,000; 100 equal positions score 100. Below 1,500 is well diversified; above 2,500 is concentrated. You: ${hhi.toFixed(0)}.`}
        />
        <Metric
          label="Top 5 weight"
          value={`${top5Pct.toFixed(1)}%`}
          pct={top5Pct}
          caption="Target < 40%"
          color="var(--text)"
          delay={340}
          tip="What share of your portfolio sits in your five largest holdings. A healthy mix usually keeps this under 40% — above that, your top names are doing most of the driving."
        />
        <Metric
          label="Top 10 weight"
          value={`${top10Pct.toFixed(1)}%`}
          pct={top10Pct}
          caption="Target < 60%"
          color="var(--text)"
          delay={420}
          tip="Same idea as Top 5, but for your ten largest. Under 60% is comfortable; higher means everything outside the top 10 is barely moving the needle."
        />
        <Metric
          label="Single largest"
          value={`${largestPct.toFixed(1)}%`}
          pct={largestPct * 5}
          caption="Target < 10%"
          color={largestColor}
          delay={500}
          tip="Weight of your single biggest position. A common rule: cap any single stock at 10% of the portfolio so one bad earnings call can't crater your whole net worth."
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  pct,
  caption,
  color,
  tip,
  delay,
}: {
  label: string;
  value: string;
  pct: number;
  caption: string;
  color: string;
  tip?: string;
  delay: number;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="metric-row">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>
          {label}
          {tip && <InfoTooltip label={tip} />}
        </span>
        <span
          className="num metric-value"
          style={{
            fontSize: 18,
            fontWeight: 600,
            color,
            letterSpacing: '-0.015em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
      </div>
      <div className="pbar" style={{ marginTop: 6 }}>
        <i
          style={{
            width: `${clamped}%`,
            background: color,
            animationDelay: `${delay}ms`,
          }}
        />
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 3 }}>{caption}</div>
    </div>
  );
}

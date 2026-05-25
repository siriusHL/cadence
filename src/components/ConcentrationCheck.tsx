'use client';

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
        <div className="t">Concentration check</div>
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
          tip={
            <>
              <b>Herfindahl-Hirschman Index.</b> Sum of each position&rsquo;s squared
              weight (in %). One stock holding everything scores{' '}
              <span className="mono">10,000</span>; 100 equal positions score{' '}
              <span className="mono">100</span>. Below{' '}
              <span className="mono">1,500</span> is well-diversified, above{' '}
              <span className="mono">2,500</span> is concentrated. You:{' '}
              <b>{hhi.toFixed(0)}</b>.
            </>
          }
        />
        <Metric
          label="Top 5 weight"
          value={`${top5Pct.toFixed(1)}%`}
          pct={top5Pct}
          caption="Target < 40%"
          color="var(--text)"
          delay={340}
        />
        <Metric
          label="Top 10 weight"
          value={`${top10Pct.toFixed(1)}%`}
          pct={top10Pct}
          caption="Target < 60%"
          color="var(--text)"
          delay={420}
        />
        <Metric
          label="Single largest"
          value={`${largestPct.toFixed(1)}%`}
          pct={largestPct * 5}
          caption="Target < 10%"
          color={largestColor}
          delay={500}
        />
      </div>
    </div>
  );
}

function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <span className="info" tabIndex={0} role="button" aria-label="What does this mean?">
      i
      <span className="pop" role="tooltip">
        {children}
      </span>
    </span>
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
  tip?: React.ReactNode;
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
          {tip && <InfoTip>{tip}</InfoTip>}
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

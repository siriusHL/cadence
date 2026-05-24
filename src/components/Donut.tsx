interface Slice {
  key: string;
  value: number;
}

interface Props {
  data: Slice[];
  colors: string[];
  size?: number;
  thickness?: number;
  /** Big number in the center (e.g. number of buckets). */
  centerValue: number | string;
  /** Caption under the center value. */
  centerLabel: string;
}

/**
 * Server-rendered donut chart — pure SVG, no client JS.
 * Slices are drawn proportionally to value; data does NOT need to sum to 100.
 */
export function Donut({
  data,
  colors,
  size = 130,
  thickness = 20,
  centerValue,
  centerLabel,
}: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flexShrink: 0 }}>
      {/* Background ring (covers gaps when total is small) */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth={thickness} />
      {data.map((d, i) => {
        if (total <= 0) return null;
        const frac = d.value / total;
        const len = frac * c;
        const dash = `${len} ${c - len}`;
        const el = (
          <circle
            key={d.key}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth={thickness}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += len;
        return el;
      })}
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        style={{
          fontSize: 24,
          fontWeight: 600,
          fill: '#1d1d1f',
          letterSpacing: '-0.025em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {centerValue}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        style={{
          fontSize: 10.5,
          fill: '#86868b',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {centerLabel}
      </text>
    </svg>
  );
}

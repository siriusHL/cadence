'use client';

import { useRef, useState } from 'react';

interface Slice {
  key: string;
  value: number;
}

interface Props {
  data: Slice[];
  colors: string[];
  size?: number;
  thickness?: number;
  centerValue: number | string;
  centerLabel: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startDeg: number, endDeg: number,
): string {
  const s1 = polarToCartesian(cx, cy, outerR, startDeg);
  const e1 = polarToCartesian(cx, cy, outerR, endDeg);
  const s2 = polarToCartesian(cx, cy, innerR, endDeg);
  const e2 = polarToCartesian(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${s1.x.toFixed(3)} ${s1.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${e1.x.toFixed(3)} ${e1.y.toFixed(3)}`,
    `L ${s2.x.toFixed(3)} ${s2.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${e2.x.toFixed(3)} ${e2.y.toFixed(3)}`,
    'Z',
  ].join(' ');
}

function fmt(n: number): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function Donut({
  data,
  colors,
  size = 130,
  thickness = 20,
  centerValue,
  centerLabel,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverState, setHoverState] = useState<{ idx: number; x: number; y: number } | null>(null);

  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const innerR = r - thickness / 2;
  const outerR = r + thickness / 2;

  const handleMouseEnter = (e: React.MouseEvent, i: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoverState({ idx: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoverState((s) => s ? { ...s, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
  };
  const handleMouseLeave = () => setHoverState(null);

  let cumDeg = 0;

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          display: 'block',
          animation: 'cdn-donut-enter 500ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}
      >
        <defs>
          {data.map((_, i) => (
            <filter key={i} id={`donut-glow-${i}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {/* Background ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth={thickness} />

        {/* Slices as arc paths for precise hit-testing */}
        {total > 0 && data.map((d, i) => {
          const frac = d.value / total;
          const startDeg = cumDeg;
          const sweepDeg = Math.max(0.5, Math.min(frac * 360, 359.9999 - cumDeg));
          cumDeg += frac * 360;
          const endDeg = Math.min(startDeg + sweepDeg, 359.9999);

          const isHov = hoverState?.idx === i;
          const isDim = hoverState !== null && !isHov;
          const path = arcPath(cx, cy, innerR, outerR, startDeg, endDeg);

          return (
            <path
              key={d.key}
              d={path}
              fill={colors[i % colors.length]}
              style={{
                cursor: 'pointer',
                opacity: isDim ? 0.28 : 1,
                filter: isHov ? `url(#donut-glow-${i})` : 'none',
                transform: isHov ? `scale(1.06)` : 'scale(1)',
                transformOrigin: `${cx}px ${cy}px`,
                transition: 'opacity 220ms ease, filter 220ms ease, transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onMouseEnter={(e) => handleMouseEnter(e, i)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          );
        })}

        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          style={{
            fontSize: 24, fontWeight: 600, fill: '#1d1d1f',
            letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums',
            pointerEvents: 'none',
          }}
        >
          {centerValue}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          style={{
            fontSize: 10.5, fill: '#86868b', fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            pointerEvents: 'none',
          }}
        >
          {centerLabel}
        </text>
      </svg>

      {/* Floating tooltip */}
      {hoverState && (
        <div
          className="cdn-tip"
          style={{
            left: hoverState.x + 14,
            top: hoverState.y - 12,
            transform: 'translateY(-50%)',
            minWidth: 160,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#fff' }}>
            {data[hoverState.idx].key}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.65)' }}>Share</span>
            <span className="num" style={{ fontWeight: 600 }}>
              {fmt((data[hoverState.idx].value / total) * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

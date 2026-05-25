'use client';

import { useId, useState } from 'react';

interface Slice { key: string; value: number; }

interface Props {
  title: string;
  tag: string;
  data: Slice[];
  colors: string[];
  /** Big number rendered in the donut centre when nothing is hovered. */
  centerValue: number | string;
  /** Caption under the centre number when nothing is hovered. */
  centerLabel: string;
  /** Optional "+ N more" line under the legend. */
  tail?: { count: number; pct?: number } | null;
  /** How many legend rows to render before the "+ N more" tail. */
  legendCount?: number;
  /** Custom formatter for the legend value column (default `${v.toFixed(1)}%`). */
  formatValue?: (v: number) => string;
  /** Animation order — used to stagger card entry. */
  index?: number;
}

const SIZE = 130;
const THICKNESS = 20;
const CENTER = SIZE / 2;
const R_MID = (SIZE - THICKNESS) / 2;
const R_OUTER = R_MID + THICKNESS / 2;
const R_INNER = R_MID - THICKNESS / 2;
const SLICE_GAP = 0.012;

function polar(angle: number, r: number) {
  return {
    x: CENTER + r * Math.sin(angle),
    y: CENTER - r * Math.cos(angle),
  };
}

function arcPath(startAngle: number, endAngle: number): string {
  const a1 = startAngle + SLICE_GAP;
  const a2 = endAngle - SLICE_GAP;
  if (a2 <= a1) return '';
  const so = polar(a1, R_OUTER);
  const eo = polar(a2, R_OUTER);
  const si = polar(a2, R_INNER);
  const ei = polar(a1, R_INNER);
  const large = (a2 - a1) > Math.PI ? 1 : 0;
  return [
    `M ${so.x.toFixed(3)} ${so.y.toFixed(3)}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${eo.x.toFixed(3)} ${eo.y.toFixed(3)}`,
    `L ${si.x.toFixed(3)} ${si.y.toFixed(3)}`,
    `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${ei.x.toFixed(3)} ${ei.y.toFixed(3)}`,
    'Z',
  ].join(' ');
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function DonutCard({
  title,
  tag,
  data,
  colors,
  centerValue,
  centerLabel,
  tail = null,
  legendCount = 6,
  formatValue = (v) => `${v.toFixed(1)}%`,
  index = 0,
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const reactId = useId();
  const maskId = `donut-mask-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const total = data.reduce((s, d) => s + d.value, 0);

  // Per-card draw timeline — card entrance settles before the donut starts
  // sweeping in, then the legend rows + centre label cascade in after.
  const donutDelay = index * 110 + 320;
  const donutDuration = 1200;
  const centerDelay = donutDelay + donutDuration - 280;
  const legendStart = donutDelay + 320;

  // Build slice geometry from cumulative fraction so slices line up with the
  // legend (same ordering, same colour index).
  const slices = data.reduce<
    {
      key: string;
      value: number;
      frac: number;
      startA: number;
      endA: number;
      color: string;
      i: number;
    }[]
  >((acc, d, i) => {
    const frac = total > 0 ? d.value / total : 0;
    const startA = (acc[i - 1]?.endA ?? 0);
    const endA = startA + frac * 2 * Math.PI;
    acc.push({
      key: d.key,
      value: d.value,
      frac,
      startA,
      endA,
      color: colors[i % colors.length],
      i,
    });
    return acc;
  }, []);

  const visibleLegend = data.slice(0, legendCount);
  const hoveredSlice = hovered != null ? slices[hovered] : null;

  return (
    <div
      className="pcard donut-card cdn-anim interactive"
      style={{ ['--i' as never]: index }}
    >
      <div className="pcard-h">
        <div className="t">{title}</div>
        <span className="tag">{tag}</span>
      </div>
      <div
        className={`donut-row ${hovered != null ? 'is-dimming' : ''}`}
        onMouseLeave={() => setHovered(null)}
      >
        <div className="donut-svg-wrap">
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="donut-svg"
            role="img"
            aria-label={title}
          >
            <defs>
              {/*
                Reveal mask — a thick stroked circle whose stroke is "drawn"
                from 12 o'clock clockwise via stroke-dashoffset. While the
                stroke is invisible the slice group underneath is hidden, so
                even the first slice fades in along the sweep instead of
                being present at t = 0.
              */}
              <mask id={maskId} maskUnits="userSpaceOnUse">
                <rect x="0" y="0" width={SIZE} height={SIZE} fill="black" />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={R_MID}
                  fill="none"
                  stroke="white"
                  strokeWidth={THICKNESS + 14}
                  pathLength={1}
                  strokeDasharray="1 1"
                  className="donut-reveal"
                  transform={`rotate(-90 ${CENTER} ${CENTER})`}
                  style={{
                    animationDelay: `${donutDelay}ms`,
                    animationDuration: `${donutDuration}ms`,
                  }}
                />
              </mask>
            </defs>
            <circle
              cx={CENTER}
              cy={CENTER}
              r={R_MID}
              fill="none"
              stroke="rgba(0,0,0,0.04)"
              strokeWidth={THICKNESS}
            />
            <g mask={`url(#${maskId})`} className="donut-slices">
              {slices.map((s) => {
                if (s.frac <= 0) return null;
                const isFull = s.frac >= 0.999;
                const isHovered = hovered === s.i;
                const dim = hovered != null && !isHovered;
                const cls = `slice${isHovered ? ' is-hovered' : ''}${dim ? ' is-dim' : ''}`;
                if (isFull) {
                  return (
                    <circle
                      key={s.key}
                      cx={CENTER}
                      cy={CENTER}
                      r={R_MID}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={THICKNESS}
                      className={cls}
                      onMouseEnter={() => setHovered(s.i)}
                    />
                  );
                }
                return (
                  <path
                    key={s.key}
                    d={arcPath(s.startA, s.endA)}
                    fill={s.color}
                    className={cls}
                    onMouseEnter={() => setHovered(s.i)}
                  />
                );
              })}
            </g>
            <g
              className={`donut-center${hoveredSlice ? ' is-hovered' : ''}`}
              style={{ ['--center-delay' as never]: `${centerDelay}ms` }}
            >
              <text x={CENTER} y={CENTER - 2} textAnchor="middle" className="cv">
                {hoveredSlice ? formatValue(hoveredSlice.value) : centerValue}
              </text>
              <text x={CENTER} y={CENTER + 14} textAnchor="middle" className="cl">
                {hoveredSlice ? truncate(hoveredSlice.key, 14) : centerLabel}
              </text>
            </g>
          </svg>
        </div>
        <div className="donut-legend">
          {visibleLegend.map((s, i) => {
            const isHovered = hovered === i;
            const dim = hovered != null && !isHovered;
            return (
              <div
                key={s.key}
                className={`legend-row${isHovered ? ' is-hovered' : ''}${dim ? ' is-dim' : ''}`}
                style={{ animationDelay: `${legendStart + i * 60}ms` }}
                onMouseEnter={() => setHovered(i)}
              >
                <span
                  className="dot"
                  style={{ background: colors[i % colors.length] }}
                />
                <span className="label">{s.key}</span>
                <span className="value num">{formatValue(s.value)}</span>
              </div>
            );
          })}
          {tail && tail.count > 0 && (
            <div
              className="legend-tail"
              style={{ animationDelay: `${legendStart + visibleLegend.length * 60}ms` }}
            >
              + {tail.count} more
              {tail.pct != null ? ` · ${tail.pct.toFixed(1)}%` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

interface SectorRow {
  key: string;
  value: number;
  income: number;
  positions: number;
}

interface Props {
  sectors: SectorRow[];
  colors: string[];
  totalValue: number;
  totalIncome: number;
  benchmark: Record<string, number>;
  index?: number;
}

export function SectorDetailTable({
  sectors,
  colors,
  totalValue,
  totalIncome,
  benchmark,
  index = 0,
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div
      className="pcard flush sector-detail-card cdn-anim interactive"
      style={{ overflow: 'hidden', ['--i' as never]: index }}
    >
      <div
        className="pcard-h"
        style={{ padding: '20px 22px 8px', margin: 0 }}
      >
        <div className="t">Sector detail · vs benchmark</div>
        <span className="tag">+ / − pp</span>
      </div>
      <div
        style={{ maxHeight: 320, overflow: 'auto' }}
        onMouseLeave={() => setHovered(null)}
      >
        <table className="pt sector-detail-table">
          <thead>
            <tr>
              <th>Sector</th>
              <th className="r">% value</th>
              <th className="r">% income</th>
              <th className="r">Yield</th>
              <th style={{ width: 200 }}>vs STOXX 600</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s, i) => {
              const valuePct = totalValue > 0 ? (s.value / totalValue) * 100 : 0;
              const incomePct = totalIncome > 0 ? (s.income / totalIncome) * 100 : 0;
              const yieldPct = s.value > 0 ? (s.income / s.value) * 100 : 0;
              const bench = benchmark[s.key] ?? 5;
              const diff = valuePct - bench;
              const isHovered = hovered === i;
              const dim = hovered != null && !isHovered;
              return (
                <tr
                  key={s.key}
                  className={`sector-row${isHovered ? ' is-hovered' : ''}${dim ? ' is-dim' : ''}`}
                  style={{ animationDelay: `${i * 28 + 220}ms` }}
                  onMouseEnter={() => setHovered(i)}
                >
                  <td className="ticker">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        className="row-dot"
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: colors[i % colors.length],
                          flexShrink: 0,
                        }}
                      />
                      {s.key}
                    </div>
                  </td>
                  <td className="r b">{valuePct.toFixed(1)}%</td>
                  <td className="r muted">{incomePct.toFixed(1)}%</td>
                  <td className="r">{yieldPct.toFixed(2)}%</td>
                  <td>
                    <BenchBar diff={diff} delay={i * 28 + 320} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BenchBar({ diff, delay }: { diff: number; delay: number }) {
  const magnitude = Math.min(50, Math.abs(diff) * 3);
  const positive = diff >= 0;
  const color = positive ? 'oklch(0.55 0.10 175)' : 'oklch(0.50 0.16 25)';
  return (
    <div className="bench-bar">
      <div className="bench-track">
        <span className="bench-mid" />
        <span
          className={`bench-fill ${positive ? 'pos' : 'neg'}`}
          style={{
            [positive ? 'left' : 'right']: '50%',
            width: `${magnitude}%`,
            background: color,
            animationDelay: `${delay}ms`,
          }}
        />
      </div>
      <span
        className={'bench-num num ' + (positive ? 'up' : 'down')}
        style={{ color }}
      >
        {positive ? '+' : ''}
        {diff.toFixed(1)}pp
      </span>
    </div>
  );
}

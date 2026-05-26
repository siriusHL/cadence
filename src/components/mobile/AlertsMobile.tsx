// Mobile Alerts — V2b chassis (Elite tier).
// Mirrors templates/elite-pages.jsx EliteAlertsPage:
//   pro-hero-mob with "N alerts to review" + sev counts
//   stat-paired: Alert mix (split bar negative vs positive) + By severity
//   Big alert list with sev-coloured icon, title, body, optional action
//   Threshold footer

import Link from 'next/link';
import { MobileShell } from '@/components/mobile/MobileShell';

type AlertSeverity = 'info' | 'positive' | 'warning' | 'negative';

export interface AlertsMobileCard {
  id: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  amountEur?: number;
  action?: { label: string; href: string };
}

export interface AlertsMobileProps {
  alerts: AlertsMobileCard[];
  /** Number of holdings being watched (hero copy). */
  heldCount: number;
  portfolioName: string;
  avatarInitials: string;
}

const SEV_COLOR: Record<AlertSeverity, string> = {
  negative: 'var(--down)',
  warning:  'oklch(0.55 0.10 75)',
  positive: 'var(--up, oklch(0.48 0.08 165))',
  info:     'oklch(0.55 0.08 235)',
};
const SEV_ICON: Record<AlertSeverity, string> = {
  negative: '!',
  warning:  '⚠',
  positive: '↑',
  info:     'i',
};

export function AlertsMobile({
  alerts,
  heldCount,
  portfolioName,
  avatarInitials,
}: AlertsMobileProps) {
  const sevCounts = { negative: 0, warning: 0, positive: 0, info: 0 };
  for (const a of alerts) sevCounts[a.severity] += 1;
  const negative = sevCounts.negative + sevCounts.warning;
  const positive = sevCounts.positive;
  const total = alerts.length || 1;

  return (
    <MobileShell
      currentTab="more"
      portfolioName={portfolioName}
      avatarInitials={avatarInitials}
      chassis="v2b"
    >
      {/* Hero */}
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 } as React.CSSProperties}>
        <div className="eyebrow">Watching {heldCount} position{heldCount === 1 ? '' : 's'}</div>
        <h1>
          <span style={{ color: negative > 0 ? 'var(--down)' : 'var(--text)' }}>
            {alerts.length}
          </span>{' '}
          <span className="light">
            alert{alerts.length === 1 ? '' : 's'} to review
          </span>
        </h1>
        <div className="sub">
          <b style={{ color: 'var(--down)' }}>{negative}</b> need action ·{' '}
          <b style={{ color: 'var(--up-fg, oklch(0.36 0.08 165))' }}>{positive}</b> positive
        </div>
      </div>

      {/* Paired stat cards */}
      {alerts.length > 0 && (
        <div className="stat-paired cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
          <div className="pcard-mini">
            <div className="ph">Alert mix</div>
            <div className="paired-vals">
              <span className="num a" style={{ color: 'var(--down)' }}>{negative}</span>
              <span className="sep">:</span>
              <span className="num b">{positive}</span>
            </div>
            <div className="paired-bar">
              <div className="a" style={{ width: `${(negative / total) * 100}%`, background: 'var(--down)' }} />
              <div className="b" style={{ width: `${(positive / total) * 100}%` }} />
            </div>
            <div className="paired-foot">
              <span>Need action</span>
              <span>Positive</span>
            </div>
          </div>
          <div className="pcard-mini">
            <div className="ph">By severity</div>
            <div className="stacked-rows">
              <div className="srow">
                <span className="name">Negative</span>
                <span className="val" style={{ color: 'var(--down)' }}>{sevCounts.negative}</span>
              </div>
              <div className="srow">
                <span className="name">Warning</span>
                <span className="val" style={{ color: 'oklch(0.55 0.10 75)' }}>{sevCounts.warning}</span>
              </div>
              <div className="srow">
                <span className="name">Positive</span>
                <span className="val up">{sevCounts.positive}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert list */}
      <div className="pcard cdn-anim" style={{ '--i': 2 } as React.CSSProperties}>
        <div className="pcard-h">
          <div className="t">All alerts</div>
          <span className="more">read live</span>
        </div>
        {alerts.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', padding: '8px 0', lineHeight: 1.5 }}>
            All clear — no upcoming ex-dates, no dividend cuts, no concentration warnings, no reclaimable
            foreign tax over threshold. Cadence keeps watching in the background.
          </div>
        ) : (
          <div>
            {alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex', gap: 10, padding: '12px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    width: 26, height: 26, borderRadius: 999,
                    background: SEV_COLOR[a.severity], color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {SEV_ICON[a.severity]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                    {a.amountEur != null && (
                      <span
                        style={{
                          fontSize: 12, fontWeight: 600,
                          color: SEV_COLOR[a.severity],
                          flexShrink: 0,
                        }}
                      >
                        €{a.amountEur}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.45 }}>
                    {a.body}
                  </div>
                  {a.action && (
                    <Link
                      href={a.action.href}
                      style={{
                        display: 'inline-block',
                        marginTop: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        color: SEV_COLOR[a.severity],
                        textDecoration: 'none',
                      }}
                    >
                      {a.action.label} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Threshold footer card */}
      <div
        className="pcard cdn-anim"
        style={{
          '--i': 3,
          background: 'var(--surface-2)',
          border: 0,
        } as React.CSSProperties}
      >
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <b style={{ color: 'var(--text)' }}>Thresholds:</b>{' '}
          ex-dates within 7 days · cuts/raises ≥ 5% · single-position ≥ 10% · HHI ≥ 1500 ·
          reclaimable foreign WH ≥ €50 · 1-year drawdown ≤ −10%.
        </div>
      </div>

      <div style={{ height: 80 }} />
    </MobileShell>
  );
}

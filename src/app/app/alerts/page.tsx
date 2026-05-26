import Link from 'next/link';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getHoldingsView, getPerformanceSeries } from '@/lib/portfolio';
import { enrichInstruments, enrichWeeklyHistory } from '@/lib/marketdata/enrich';
import { getTaxSummary, DEFAULT_RESIDENCE, type TaxResidence } from '@/lib/tax';
import { getActiveAlerts, type AlertCard, type AlertSeverity } from '@/lib/alerts';
import { EmptyState } from '@/components/EmptyState';
import { AlertsMobile } from '@/components/mobile/AlertsMobile';

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  negative: 'oklch(0.50 0.16 25)',
  warning:  'oklch(0.55 0.10 75)',
  positive: 'oklch(0.48 0.08 165)',
  info:     'oklch(0.55 0.08 235)',
};

const SEVERITY_ICON: Record<AlertSeverity, string> = {
  negative: '!',
  warning:  '⚠',
  positive: '↑',
  info:     'i',
};

export default async function AlertsScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, portfolio] = await Promise.all([
    supabase.from('profiles').select('tax_country').eq('id', user!.id).maybeSingle(),
    getActivePortfolio(supabase, user!.id),
  ]);

  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        body="Add a holding and Cadence will start watching for dividend events, concentration risk, and tax-recovery opportunities."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  const holdings = (await getHoldingsView(supabase, portfolio.id)).filter((h) => h.quantity > 0);
  if (holdings.length === 0) {
    return (
      <EmptyState
        icon="🔔"
        title="Nothing to alert you about"
        body="Once you hold positions, Cadence will flag upcoming ex-dates, dividend cuts, concentration risk, and reclaimable foreign tax."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  // Run both enrichments in parallel — they hit independent cache tables and
  // neither blocks the other. Weekly history is capped at 52 weeks (down from
  // 104) because the only alert that reads it (drawdown) takes `series.slice(-52)`,
  // so anything older was being fetched, written, and iterated for nothing.
  const tickers = holdings.map((h) => h.ticker);
  await Promise.all([
    enrichInstruments(tickers),
    enrichWeeklyHistory(tickers, 52),
  ]);

  const residence = (profile?.tax_country as TaxResidence | null) ?? DEFAULT_RESIDENCE;
  const fiscalYear = new Date().getFullYear();

  const [taxSummary, performanceSeries] = await Promise.all([
    getTaxSummary(supabase, portfolio.id, fiscalYear, residence),
    getPerformanceSeries(supabase, portfolio.id, 52),
  ]);

  const alerts = await getActiveAlerts({
    supabase,
    portfolioId: portfolio.id,
    holdings,
    taxSummary,
    performanceSeries,
  });

  // Group counts by severity for the hero meta.
  const sevCounts: Record<AlertSeverity, number> = { negative: 0, warning: 0, positive: 0, info: 0 };
  for (const a of alerts) sevCounts[a.severity] += 1;
  const negative = sevCounts.negative + sevCounts.warning;
  const positive = sevCounts.positive;

  const avatarInitials = (user?.email ?? 'U').slice(0, 2).toUpperCase();

  return (
    <>
      <div className="cdn-mobile-only">
        <AlertsMobile
          alerts={alerts.map((a) => ({
            id: a.id,
            severity: a.severity,
            title: a.title,
            body: a.body,
            amountEur: a.amountEur,
            action: a.action,
          }))}
          heldCount={holdings.length}
          portfolioName={portfolio.name}
          avatarInitials={avatarInitials}
        />
      </div>
      <div className="cdn-desktop-only">
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Watching {holdings.length} position{holdings.length === 1 ? '' : 's'}</div>
          <h1>
            {alerts.length === 0
              ? <>All clear <span className="light">— nothing needs your attention</span></>
              : <>
                  <span style={{ color: negative > 0 ? 'oklch(0.50 0.16 25)' : 'var(--text)' }}>
                    {alerts.length}
                  </span>{' '}
                  <span className="light">
                    alert{alerts.length === 1 ? '' : 's'} to review
                  </span>
                </>}
          </h1>
          <div className="sub">
            {alerts.length === 0 ? (
              <>No upcoming ex-dates, no dividend cuts, no concentration over thresholds, no reclaimable foreign tax. Check back after the next cron run or when your portfolio changes.</>
            ) : (
              <>
                {negative > 0 && <><b style={{ color: 'oklch(0.50 0.16 25)' }}>{negative}</b> needs action</>}
                {negative > 0 && positive > 0 && <>, </>}
                {positive > 0 && <><b style={{ color: 'oklch(0.36 0.08 165)' }}>{positive}</b> positive</>}
                {(negative > 0 || positive > 0) && '. '}
                Dividend events, concentration risk, drawdowns, and tax-recovery opportunities — all read off your live portfolio.
              </>
            )}
          </div>
        </div>
        <div className="right-meta">
          <span className="live">read live · no setup required</span>
          <span>{alerts.length} alert{alerts.length === 1 ? '' : 's'}</span>
          <span>resident · {residence}</span>
        </div>
      </div>

      {/* Severity-tagged cards */}
      {alerts.length === 0 ? (
        <div
          className="pcard"
          style={{
            textAlign: 'center', padding: 40,
            color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.5,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
          You&rsquo;re fully aligned with the thresholds Cadence watches for.
          New events will land here automatically when something changes.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map((a) => <AlertRow key={a.id} alert={a} />)}
        </div>
      )}

      {/* Thresholds footer — makes the page's logic legible */}
      <div
        style={{
          marginTop: 24, padding: '14px 16px',
          background: 'var(--surface-2)', borderRadius: 10,
          fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6,
        }}
      >
        <b style={{ color: 'var(--text)' }}>Thresholds:</b>{' '}
        Ex-dates surfaced within 7 days · dividend cuts &amp; raises at ≥5% change ·
        single-position concentration at ≥10% of portfolio ·
        HHI ≥1500 · reclaimable foreign WTH ≥€50 ·
        1-year drawdown ≤−10%.
      </div>
    </div>
      </div>
    </>
  );
}

function AlertRow({ alert }: { alert: AlertCard }) {
  const color = SEVERITY_COLOR[alert.severity];
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '14px 18px',
        background: 'var(--surface)',
        borderRadius: 12,
        borderLeft: `3px solid ${color}`,
        boxShadow: '0 1px 2px rgba(0,0,0,.03), 0 1px 3px rgba(0,0,0,.02)',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 28, height: 28, borderRadius: '50%',
          background: color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {SEVERITY_ICON[alert.severity]}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {alert.title}
          </div>
          {alert.amountEur != null && alert.amountEur > 0 && (
            <span
              className="num"
              style={{ fontSize: 13, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}
            >
              €{alert.amountEur.toFixed(0)}
            </span>
          )}
        </div>
        <div style={{ marginTop: 3, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {alert.body}
        </div>
        {alert.action && (
          <div style={{ marginTop: 8 }}>
            <Link
              href={alert.action.href}
              style={{
                fontSize: 12, fontWeight: 500,
                color, textDecoration: 'none',
              }}
            >
              {alert.action.label} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

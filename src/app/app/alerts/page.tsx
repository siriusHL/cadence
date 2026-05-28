import { getActivePortfolio } from '@/lib/activePortfolio';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getHoldingsView, getPerformanceSeries } from '@/lib/portfolio';
import { enrichInstruments, enrichWeeklyHistory } from '@/lib/marketdata/enrich';
import { getTaxSummary, DEFAULT_RESIDENCE, type TaxResidence } from '@/lib/tax';
import { getActiveAlerts, type AlertSeverity } from '@/lib/alerts';
import { EmptyState } from '@/components/EmptyState';
import { InfoTooltip } from '@/components/InfoTooltip';
import { AlertRow } from '@/components/AlertRow';
import { MutedAlertsFooter } from '@/components/MutedAlertsFooter';

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

  const { active, suppressed, mutes } = await getActiveAlerts({
    supabase,
    portfolioId: portfolio.id,
    holdings,
    taxSummary,
    performanceSeries,
    userId: user!.id,
  });

  // Group counts by severity for the hero meta.
  const sevCounts: Record<AlertSeverity, number> = { negative: 0, warning: 0, positive: 0, info: 0 };
  for (const a of active) sevCounts[a.severity] += 1;
  const negative = sevCounts.negative + sevCounts.warning;
  const positive = sevCounts.positive;

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">
            Watching {holdings.length} position{holdings.length === 1 ? '' : 's'}
            <InfoTooltip label="Cadence scans your portfolio on every page load — no rules to set up. It watches upcoming ex-dates, dividend cuts and raises, concentration risk, drawdowns, and reclaimable foreign tax." />
          </div>
          <h1>
            {active.length === 0
              ? <>All clear <span className="light">— nothing needs your attention</span></>
              : <>
                  <span style={{ color: negative > 0 ? 'oklch(0.50 0.16 25)' : 'var(--text)' }}>
                    {active.length}
                  </span>{' '}
                  <span className="light">
                    alert{active.length === 1 ? '' : 's'} to review
                    <InfoTooltip label="Each alert carries a severity: red ! = needs action (dividend cut, drawdown), amber ⚠ = warning (concentration, ex-date soon), green ↑ = positive (raise, reclaim opportunity), blue i = informational." />
                  </span>
                </>}
          </h1>
          <div className="sub">
            {active.length === 0 ? (
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
          <span>{active.length} alert{active.length === 1 ? '' : 's'}</span>
          <span>resident · {residence}</span>
        </div>
      </div>

      {/* Severity-tagged cards */}
      {active.length === 0 ? (
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
          {active.map((a) => <AlertRow key={a.id} alert={a} />)}
        </div>
      )}

      {/* Hidden alerts — collapsed by default; uses native <details> so it
          works without JS and has no extra component dance. */}
      {suppressed.length > 0 && (
        <details
          style={{
            marginTop: 18, padding: '10px 14px',
            background: 'var(--surface-2)', borderRadius: 10,
            fontSize: 13, color: 'var(--text-muted)',
          }}
        >
          <summary
            style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text)', userSelect: 'none' }}
          >
            {suppressed.length} hidden alert{suppressed.length === 1 ? '' : 's'}
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {suppressed.map((a) => <AlertRow key={a.id} alert={a} mode="suppressed" />)}
          </div>
        </details>
      )}

      <MutedAlertsFooter mutes={mutes} />

      {/* Thresholds footer — makes the page's logic legible */}
      <div
        style={{
          marginTop: 24, padding: '14px 16px',
          background: 'var(--surface-2)', borderRadius: 10,
          fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6,
        }}
      >
        <b style={{ color: 'var(--text)' }}>
          Thresholds
          <InfoTooltip label="The trigger levels Cadence uses to decide what's worth alerting on. These are sensible defaults — they aren't user-configurable yet but will be in a future release." />
        </b>:{' '}
        <span>
          Ex-dates surfaced within 7 days
          <InfoTooltip label="An ex-dividend date is the cutoff: you must own the stock before that date to receive the upcoming payout. Cadence flags any holding whose ex-date lands in the next week so you don't miss it." />
        </span>
        {' · '}
        <span>
          dividend cuts &amp; raises at ≥5% change
          <InfoTooltip label="A 'cut' is when a company reduces its dividend per share (often a stress signal); a 'raise' is the opposite. Cadence flags moves of 5% or more in either direction — smaller adjustments are usually just rounding." />
        </span>
        {' · '}
        <span>
          single-position concentration at ≥10% of portfolio
          <InfoTooltip label="When any single holding grows past 10% of your portfolio's value, an outsized loss on that name can dominate your returns. A common rule-of-thumb cap." />
        </span>
        {' · '}
        <span>
          HHI ≥1500
          <InfoTooltip label="Herfindahl-Hirschman Index — a 0–10,000 concentration score that sums the square of each position's weight. Above 1,500 is the classic 'moderately concentrated' threshold borrowed from antitrust analysis." />
        </span>
        {' · '}
        <span>
          reclaimable foreign WTH ≥€50
          <InfoTooltip label="Foreign withholding tax you over-paid that you could file to claim back. Cadence only flags it when the recoverable amount is worth the paperwork (€50 or more)." />
        </span>
        {' · '}
        <span>
          1-year drawdown ≤−10%
          <InfoTooltip label="A drawdown is a peak-to-trough drop in portfolio value. Cadence raises a flag once the rolling 1-year drawdown crosses -10%, so a meaningful slump doesn't go unnoticed." />
        </span>
        .
      </div>
    </div>
  );
}

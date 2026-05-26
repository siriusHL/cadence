import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getHoldingsView } from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import {
  getTaxSummary, computeDomesticTax,
  getCapitalGainsSummary, computeCapitalGainsTax,
  DEFAULT_RESIDENCE, COUNTRY_NAMES,
  type TaxResidence, type DomesticTaxBreakdown, type ResidenceModel,
  type CapitalGainsSummary, type CGTBreakdown, type CGTModel,
} from '@/lib/tax';
import { getActivityYears } from '@/lib/export';
import { EmptyState } from '@/components/EmptyState';

function fmtMoney(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export default async function TaxScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, portfolio] = await Promise.all([
    supabase.from('profiles').select('tax_country, base_currency').eq('id', user!.id).maybeSingle(),
    getActivePortfolio(supabase, user!.id),
  ]);

  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        body="Add a holding to start tracking the tax on your dividend income."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  const held = (await getHoldingsView(supabase, portfolio.id)).filter((h) => h.quantity > 0);
  if (held.length === 0) {
    return (
      <EmptyState
        icon="🧾"
        title="Nothing to tax yet"
        body="Once you hold dividend-paying stocks, Cadence will project the withholding by country and surface any treaty-reclaim opportunities."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  // Country / currency on instruments is what the tax view rolls up on.
  await enrichInstruments(held.map((h) => h.ticker));

  const residence = (profile?.tax_country as TaxResidence | null) ?? DEFAULT_RESIDENCE;
  const fiscalYear = new Date().getFullYear();
  const [summary, capitalGains, activityYears] = await Promise.all([
    getTaxSummary(supabase, portfolio.id, fiscalYear, residence),
    getCapitalGainsSummary(supabase, portfolio.id, fiscalYear, residence),
    getActivityYears(supabase, portfolio.id),
  ]);
  const cgt = computeCapitalGainsTax(capitalGains);

  // Domestic tax: residence-side layer (final tax minus foreign credit).
  // NL Box 3 needs the user's portfolio value at 1 Jan — for v0 we approximate
  // with the current total holdings value as a rough proxy.
  const approxPortfolioValueEur = held.reduce(
    (s, h) => s + (h.price ?? 0) * h.quantity,
    0,
  );
  const domestic = computeDomesticTax(summary, {
    portfolioValueJan1: approxPortfolioValueEur,
  });

  const finalNetEur = summary.totalNetEur - domestic.finalEur;

  // Reclaim card recipients — countries where we're over-withheld.
  const reclaimable = summary.rows
    .filter((r) => r.reclaimableEur > 0.01)
    .sort((a, b) => b.reclaimableEur - a.reclaimableEur);

  // Headline copy variation depending on whether we have any data at all.
  const hasAnyData = summary.totalGrossEur > 0;
  const residenceName = COUNTRY_NAMES[residence] ?? residence;

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">
            Withholding · {fiscalYear} · resident in {residenceName}
            {summary.projected && hasAnyData && (
              <>{' '}<span className="tag" style={{ marginLeft: 6 }}>projected</span></>
            )}
          </div>
          <h1>
            <span style={{ color: 'oklch(0.36 0.08 165)' }}>€{fmtMoney(finalNetEur, 0)}</span>{' '}
            <span className="light">net after all taxes</span>
          </h1>
          <div className="sub">
            {hasAnyData ? (
              <>
                Gross <b>€{fmtMoney(summary.totalGrossEur)}</b> →{' '}
                <b style={{ color: 'oklch(0.50 0.16 25)' }}>−€{fmtMoney(summary.totalWithheldEur)}</b> foreign WTH
                {domestic.finalEur > 0.5 && (
                  <> → <b style={{ color: 'oklch(0.50 0.16 25)' }}>−€{fmtMoney(domestic.finalEur)}</b> {residenceName} tax</>
                )}
                . Overall effective rate{' '}
                <b>{fmtPct(domestic.effectiveTotalPct || summary.effectiveRatePct)}</b>.
              </>
            ) : (
              <>No dividend activity yet. The table will populate once your holdings start paying out.</>
            )}
          </div>
        </div>
        <div className="right-meta">
          <span className="live">resident · {residenceName}</span>
          <span>fiscal year {fiscalYear}</span>
          {summary.projected
            ? <span>projected from holdings × ex-dates</span>
            : <span>from logged dividend transactions</span>}
        </div>
      </div>

      {/* 5-tile hero strip — gross → foreign WTH → domestic → final net → reclaim */}
      <div className="hero-stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="tile">
          <div className="l">Gross dividends · YTD</div>
          <div className="v sm">€{fmtMoney(summary.totalGrossEur)}</div>
          <div className="d">
            {summary.rows.length} jurisdiction{summary.rows.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="tile">
          <div className="l">Foreign WTH</div>
          <div className="v sm down">€{fmtMoney(summary.totalWithheldEur)}</div>
          <div className="d">{summary.effectiveRatePct.toFixed(1)}% at source</div>
        </div>
        <div className="tile">
          <div className="l">{residenceName} tax</div>
          <div className={'v sm ' + (domestic.finalEur > 0.5 ? 'down' : '')}>
            €{fmtMoney(domestic.finalEur)}
          </div>
          <div className="d">
            {domestic.foreignCreditEur > 0.5
              ? `after €${fmtMoney(domestic.foreignCreditEur)} credit`
              : modelLabel(domestic.model)}
          </div>
        </div>
        <div className="tile">
          <div className="l">Net after all taxes</div>
          <div className="v sm up">€{fmtMoney(finalNetEur)}</div>
          <div className="d">
            {summary.totalGrossEur > 0
              ? `${(100 - domestic.effectiveTotalPct).toFixed(1)}% of gross`
              : '—'}
          </div>
        </div>
        <div className="tile">
          <div className="l">Reclaimable</div>
          <div className={'v sm ' + (summary.totalReclaimableEur > 1 ? 'up' : '')}>
            €{fmtMoney(summary.totalReclaimableEur)}
          </div>
          <div className="d">
            {reclaimable.length === 0
              ? 'fully treaty-aligned'
              : `${reclaimable.length} country${reclaimable.length === 1 ? '' : 'ies'} over-withheld`}
          </div>
        </div>
      </div>

      <div className="row-2" style={{ gridTemplateColumns: '1.5fr 1fr', marginTop: 14 }}>
        {/* Withholding by jurisdiction */}
        <div className="pcard flush" style={{ overflow: 'hidden' }}>
          <div className="pcard-h" style={{ padding: '20px 22px 8px', margin: 0 }}>
            <div className="t">Withholding by jurisdiction</div>
            <span className="tag">
              {fiscalYear} · EUR equiv. {summary.projected && '· projected'}
            </span>
          </div>
          {summary.rows.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              Nothing to break down yet.
            </div>
          ) : (
            <div style={{ maxHeight: 420, overflow: 'auto' }}>
              <table className="pt">
                <thead>
                  <tr>
                    <th>Country</th>
                    <th>CCY</th>
                    <th className="r">Gross €</th>
                    <th className="r">Statutory</th>
                    <th className="r">Treaty</th>
                    <th className="r">Effective</th>
                    <th className="r">Withheld €</th>
                    <th className="r">Net €</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map((r) => {
                    const overWithheld = r.reclaimableEur > 0.01;
                    return (
                      <tr key={r.country}>
                        <td className="b">{r.countryName}</td>
                        <td className="muted">{r.currency}</td>
                        <td className="r b">€{fmtMoney(r.grossEur, 2)}</td>
                        <td className="r muted">
                          {r.statutoryRate != null ? `${r.statutoryRate.toFixed(1)}%` : '—'}
                        </td>
                        <td className="r">
                          {r.treatyRate != null ? `${r.treatyRate.toFixed(1)}%` : '—'}
                        </td>
                        <td className={'r ' + (overWithheld ? 'down' : 'up')}>
                          {fmtPct(r.effectiveRate)}
                        </td>
                        <td className="r down">
                          {r.withheldEur > 0 ? `−€${fmtMoney(r.withheldEur, 2)}` : '—'}
                        </td>
                        <td className="r b up">€{fmtMoney(r.netEur, 2)}</td>
                        <td><StatusChip row={r} /></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <td className="b" colSpan={2} style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>
                      Σ totals
                    </td>
                    <td className="r b">€{fmtMoney(summary.totalGrossEur, 2)}</td>
                    <td className="r muted" colSpan={2}></td>
                    <td className="r b">{fmtPct(summary.effectiveRatePct)}</td>
                    <td className="r b down">−€{fmtMoney(summary.totalWithheldEur, 2)}</td>
                    <td className="r b up">€{fmtMoney(summary.totalNetEur, 2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Right column — Domestic tax breakdown + Reclaim opportunities stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Domestic tax · residence-side layer */}
        <div className="pcard">
          <div className="pcard-h">
            <div className="t">{residenceName} tax · {fiscalYear}</div>
            <span className="tag">{modelTag(domestic.model)}</span>
          </div>
          <DomesticTaxBreakdown
            breakdown={domestic}
            summary={summary}
            residenceName={residenceName}
            finalNetEur={finalNetEur}
          />
        </div>

        {/* Reclaim opportunities */}
        <div className="pcard">
          <div className="pcard-h">
            <div className="t">Reclaim opportunities</div>
            <span className="tag">treaty vs effective</span>
          </div>
          {reclaimable.length === 0 ? (
            <div style={{ padding: '20px 4px', color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.5 }}>
              {hasAnyData ? (
                <>You&rsquo;re already withheld at treaty rates — nothing to reclaim. 🎉</>
              ) : (
                <>Once your portfolio starts paying dividends, this is where Cadence will flag any over-withholding worth reclaiming under your tax treaties.</>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reclaimable.map((r) => (
                <div
                  key={r.country}
                  style={{
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    background: 'var(--surface)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.countryName}</span>
                    <span
                      className="num"
                      style={{ color: 'oklch(0.36 0.08 165)', fontSize: 15, fontWeight: 600 }}
                    >
                      +€{fmtMoney(r.reclaimableEur, 2)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                    Effective {fmtPct(r.effectiveRate)} · treaty {r.treatyRate?.toFixed(1)}%
                    {r.statutoryRate != null && <> · statutory {r.statutoryRate.toFixed(1)}%</>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text)', marginTop: 6, lineHeight: 1.45 }}>
                    {reclaimAction(r.country, residence)}
                  </div>
                </div>
              ))}
              <div
                style={{
                  fontSize: 11.5, color: 'var(--text-muted)',
                  paddingTop: 8, marginTop: 4,
                  borderTop: '1px solid var(--border)', lineHeight: 1.5,
                }}
              >
                <b style={{ color: 'var(--text)' }}>€{fmtMoney(summary.totalReclaimableEur, 2)}</b>{' '}
                of foreign tax could be reclaimed if treaty paperwork is filed at the source.
                These are estimates — your broker may already apply treaty rates automatically (e.g. via W-8BEN).
              </div>
            </div>
          )}
        </div>

        </div>{/* /right column flex wrapper */}
      </div>

      {/* ─── Capital gains · YTD ─────────────────────────────────────── */}
      <CapitalGainsSection
        summary={capitalGains}
        breakdown={cgt}
        residenceName={residenceName}
        fiscalYear={fiscalYear}
      />

      {/* ─── Export tax data ─────────────────────────────────────────── */}
      <ExportSection years={activityYears} />
    </div>
  );
}

function ExportSection({
  years,
}: {
  years: { year: number; hasDividends: boolean; hasSales: boolean }[];
}) {
  return (
    <div className="pcard" style={{ marginTop: 14 }}>
      <div className="pcard-h">
        <div className="t">Export tax data</div>
        <span className="tag">CSV · per fiscal year</span>
      </div>
      {years.length === 0 ? (
        <div style={{ padding: '12px 4px', color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.55 }}>
          Once a dividend payment or share sale lands in your portfolio, Cadence
          will offer year-by-year CSVs here — ready to drop into your tax return
          or hand off to your accountant.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
            One file per stream, per year. Dividends and capital-gains rows
            live in separate CSVs because most tax forms ask for them
            independently. Open in Excel, Numbers, or Google Sheets.
          </div>
          <div
            style={{
              border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
            }}
          >
            {years.map((y, i) => (
              <div
                key={y.year}
                style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr auto',
                  gap: 14, alignItems: 'center',
                  padding: '12px 14px',
                  borderTop: i === 0 ? 0 : '1px solid var(--border)',
                }}
              >
                <div
                  className="num"
                  style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                >
                  {y.year}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                  {[
                    y.hasDividends ? 'dividend payments' : null,
                    y.hasSales     ? 'share sales' : null,
                  ].filter(Boolean).join(' · ')}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <DownloadButton
                    href={`/api/export/dividends?year=${y.year}`}
                    filename={`dividends-${y.year}.csv`}
                    label="Dividends"
                    enabled={y.hasDividends}
                  />
                  <DownloadButton
                    href={`/api/export/capital-gains?year=${y.year}`}
                    filename={`capital-gains-${y.year}.csv`}
                    label="Capital gains"
                    enabled={y.hasSales}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DownloadButton({
  href, filename, label, enabled,
}: {
  href: string; filename: string; label: string; enabled: boolean;
}) {
  if (!enabled) {
    return (
      <span
        style={{
          height: 28, padding: '0 12px',
          display: 'inline-flex', alignItems: 'center',
          fontSize: 11.5, fontWeight: 500,
          color: 'var(--text-muted)', background: 'var(--surface-2)',
          border: '1px dashed var(--border)', borderRadius: 999,
          cursor: 'not-allowed',
        }}
        title={`No ${label.toLowerCase()} in this year`}
      >
        {label} —
      </span>
    );
  }
  return (
    <a
      href={href}
      download={filename}
      className="chip"
      style={{
        height: 28, padding: '0 12px',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 11.5, fontWeight: 500,
        textDecoration: 'none',
      }}
    >
      ↓ {label}
    </a>
  );
}

// ─── Capital gains card ───────────────────────────────────────────────

function CapitalGainsSection({
  summary, breakdown, residenceName, fiscalYear,
}: {
  summary: CapitalGainsSummary;
  breakdown: CGTBreakdown;
  residenceName: string;
  fiscalYear: number;
}) {
  const hasSales = summary.sales.length > 0;
  const gainPositive = summary.totalRealizedGainEur >= 0;
  const gainColor = gainPositive ? 'oklch(0.36 0.08 165)' : 'oklch(0.50 0.16 25)';

  return (
    <div className="row-2" style={{ gridTemplateColumns: '1.5fr 1fr', marginTop: 14 }}>
      {/* Realized sales table */}
      <div className="pcard flush" style={{ overflow: 'hidden' }}>
        <div className="pcard-h" style={{ padding: '20px 22px 8px', margin: 0 }}>
          <div className="t">Capital gains · {fiscalYear}</div>
          <span className="tag">FIFO · EUR equiv.</span>
        </div>
        {!hasSales ? (
          <div style={{ padding: '20px 22px 22px', color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.55 }}>
            No sales recorded for {fiscalYear}. Record a sale from any holding (Edit → Sell shares)
            to start tracking realized gains.
          </div>
        ) : (
          <div style={{ maxHeight: 360, overflow: 'auto' }}>
            <table className="pt">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ticker</th>
                  <th className="r">Qty</th>
                  <th className="r">Proceeds €</th>
                  <th className="r">Cost basis €</th>
                  <th className="r">Gain/Loss €</th>
                  <th>Held</th>
                </tr>
              </thead>
              <tbody>
                {summary.sales.map((s) => {
                  const gain = s.realizedGainEur;
                  const isGain = gain >= 0;
                  return (
                    <tr key={s.txId}>
                      <td className="muted">{s.saleDate}</td>
                      <td className="b">{s.ticker}</td>
                      <td className="r num">
                        {s.qty.toLocaleString('en-IE', { maximumFractionDigits: 4 })}
                      </td>
                      <td className="r num">€{fmtMoney(s.proceedsEur, 2)}</td>
                      <td className="r num muted">€{fmtMoney(s.costBasisEur, 2)}</td>
                      <td
                        className={'r num b ' + (isGain ? 'up' : 'down')}
                      >
                        {isGain ? '+' : '−'}€{fmtMoney(Math.abs(gain), 2)}
                      </td>
                      <td className="muted">
                        {holdingLabel(s.holdingDays)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <td className="b" colSpan={3} style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>
                    Σ {summary.sales.length} sale{summary.sales.length === 1 ? '' : 's'}
                  </td>
                  <td className="r b">€{fmtMoney(summary.totalProceedsEur, 2)}</td>
                  <td className="r b muted">€{fmtMoney(summary.totalCostBasisEur, 2)}</td>
                  <td className={'r b ' + (gainPositive ? 'up' : 'down')}>
                    {gainPositive ? '+' : '−'}€{fmtMoney(Math.abs(summary.totalRealizedGainEur), 2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {summary.hasUnmatchedSells && (
          <div
            style={{
              padding: '10px 22px 14px', fontSize: 11.5,
              color: 'oklch(0.46 0.10 25)', lineHeight: 1.5,
            }}
          >
            ⚠ One or more sales had no matching buy lots in your history. The un-matched
            portion is treated as full gain (worst case) — add the missing buy transactions
            to refine the basis.
          </div>
        )}
      </div>

      {/* CGT estimate */}
      <div className="pcard">
        <div className="pcard-h">
          <div className="t">{residenceName} CGT · {fiscalYear}</div>
          <span className="tag">{cgtModelTag(breakdown.model)}</span>
        </div>
        {!hasSales ? (
          <div style={{ padding: '12px 4px', color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.55 }}>
            Once you record sales, Cadence applies {residenceName}&rsquo;s capital-gains
            regime and shows the tax owed on the year&rsquo;s realized profit here.
            {summary.carryForwardAvailableEur > 0 && (
              <>
                {' '}You have{' '}
                <b style={{ color: 'oklch(0.36 0.08 165)' }}>
                  €{fmtMoney(summary.carryForwardAvailableEur, 2)}
                </b>{' '}
                of prior-year losses available to offset future gains.
              </>
            )}
          </div>
        ) : (
          <>
            <table className="pt">
              <tbody>
                <tr>
                  <td style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Realized gains</td>
                  <td className="r num" style={{ fontSize: 12, color: 'oklch(0.36 0.08 165)' }}>
                    +€{fmtMoney(summary.totalGainsEur, 2)}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Realized losses</td>
                  <td className="r num" style={{ fontSize: 12, color: 'oklch(0.50 0.16 25)' }}>
                    −€{fmtMoney(summary.totalLossesEur, 2)}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: 12, fontWeight: 600 }}>Net realized</td>
                  <td className="r num b" style={{ fontSize: 13, color: gainColor }}>
                    {gainPositive ? '+' : '−'}€{fmtMoney(Math.abs(summary.totalRealizedGainEur), 2)}
                  </td>
                </tr>
                {breakdown.carryForwardUsedEur > 0 && (
                  <tr>
                    <td style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                      Prior-year losses applied{' '}
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        ({oldestCarryYearLabel(summary)})
                      </span>
                    </td>
                    <td className="r num" style={{ fontSize: 12, color: 'oklch(0.36 0.08 165)' }}>
                      −€{fmtMoney(breakdown.carryForwardUsedEur, 2)}
                    </td>
                  </tr>
                )}
                {breakdown.allowanceUsedEur > 0 && (
                  <tr>
                    <td style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                      {(breakdown.model.kind === 'flat' || breakdown.model.kind === 'progressive') && breakdown.model.allowanceLabel
                        ? breakdown.model.allowanceLabel
                        : 'Annual exemption'}
                    </td>
                    <td className="r num" style={{ fontSize: 12, color: 'oklch(0.36 0.08 165)' }}>
                      −€{fmtMoney(breakdown.allowanceUsedEur, 2)}
                    </td>
                  </tr>
                )}
                {breakdown.taxableGainEur > 0 && (
                  <tr>
                    <td style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Taxable gain</td>
                    <td className="r num" style={{ fontSize: 12 }}>
                      €{fmtMoney(breakdown.taxableGainEur, 2)}
                    </td>
                  </tr>
                )}
                <tr style={{ background: 'var(--surface-2)' }}>
                  <td style={{ fontSize: 12, fontWeight: 600 }}>
                    {residenceName} CGT due
                  </td>
                  <td
                    className="r num b"
                    style={{
                      fontSize: 14, fontWeight: 700,
                      color: breakdown.taxDueEur > 0.5 ? 'oklch(0.50 0.16 25)' : 'var(--text)',
                    }}
                  >
                    €{fmtMoney(breakdown.taxDueEur, 2)}
                  </td>
                </tr>
              </tbody>
            </table>
            <div
              style={{
                marginTop: 12, padding: '12px 14px',
                background: 'oklch(0.97 0.03 165)', borderRadius: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Net realized after CGT</span>
              <span
                className="num"
                style={{ fontSize: 18, fontWeight: 700, color: gainColor }}
              >
                {breakdown.netAfterTaxEur >= 0 ? '+' : '−'}€{fmtMoney(Math.abs(breakdown.netAfterTaxEur), 0)}
              </span>
            </div>
            {(breakdown.carryForwardRemainingEur > 0.5 || summary.carryForwardExpiredEur > 0.5 || breakdown.note) && (
              <div
                style={{
                  marginTop: 10, fontSize: 11, color: 'var(--text-muted)',
                  lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: 8,
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}
              >
                {breakdown.carryForwardRemainingEur > 0.5 && (
                  <div>
                    <b style={{ color: 'var(--text)' }}>
                      €{fmtMoney(breakdown.carryForwardRemainingEur, 2)}
                    </b>{' '}
                    of losses carry forward into {fiscalYear + 1}
                    {(breakdown.model.kind === 'flat' || breakdown.model.kind === 'progressive') && breakdown.model.lossCarryYears != null && (
                      <> · {breakdown.model.lossCarryYears === Infinity
                        ? 'indefinite window'
                        : `${breakdown.model.lossCarryYears}-year window`}</>
                    )}
                    .
                  </div>
                )}
                {summary.carryForwardExpiredEur > 0.5 && (
                  <div style={{ color: 'oklch(0.46 0.10 25)' }}>
                    ⚠ €{fmtMoney(summary.carryForwardExpiredEur, 2)} of prior losses expired
                    un-used (outside the carry-forward window).
                  </div>
                )}
                {breakdown.note && <div>{breakdown.note}</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function oldestCarryYearLabel(summary: CapitalGainsSummary): string {
  const years = summary.carryForwardEntries.map((e) => e.year);
  if (years.length === 0) return '';
  const oldest = Math.min(...years);
  const newest = Math.max(...years);
  return oldest === newest ? `from ${oldest}` : `from ${oldest}–${newest}`;
}

function cgtModelTag(model: CGTModel): string {
  switch (model.kind) {
    case 'flat':        return model.surchargeLabel ?? `flat ${model.rate}%`;
    case 'progressive': return 'progressive';
    case 'box3':        return 'Box 3 · no per-sale CGT';
    case 'none':        return 'no CGT';
  }
}

function holdingLabel(days: number): string {
  if (days <= 0) return 'same day';
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

// ─── Components ────────────────────────────────────────────────────────

// Brief "what's the regime" tag shown next to the Domestic-tax panel title.
function modelTag(model: ResidenceModel): string {
  switch (model.kind) {
    case 'flat':                  return model.surchargeLabel ?? `flat ${model.rate}%`;
    case 'progressive':           return 'progressive';
    case 'marginal-passthrough':  return 'marginal income';
    case 'box3':                  return 'Box 3 · forfaitair';
  }
}

// Compact one-liner used in the hero-stats tile under the residence-tax number.
function modelLabel(model: ResidenceModel): string {
  switch (model.kind) {
    case 'flat':                  return `${model.rate}%${model.allowance ? ` after €${model.allowance}` : ''}`;
    case 'progressive':           return `${model.bands[0].rate}–${model.bands[model.bands.length - 1].rate}%`;
    case 'marginal-passthrough':  return `~${model.defaultMarginal}% marginal`;
    case 'box3':                  return `${model.forfaitairPct}% × ${model.rate}%`;
  }
}

function DomesticTaxBreakdown({
  breakdown, summary, residenceName, finalNetEur,
}: {
  breakdown: DomesticTaxBreakdown;
  summary: { totalGrossEur: number; totalWithheldEur: number; totalNetEur: number };
  residenceName: string;
  finalNetEur: number;
}) {
  const { model, preCreditEur, foreignCreditEur, finalEur, allowanceUsedEur, note } = breakdown;
  if (summary.totalGrossEur <= 0) {
    return (
      <div style={{ padding: '12px 4px', color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.5 }}>
        Once dividend activity starts, Cadence applies {residenceName}&rsquo;s tax rules and shows the
        residence-side tax due here.
      </div>
    );
  }

  // Build the line items based on the model so each regime tells its own story.
  const lines: { label: string; value: string; muted?: boolean; total?: boolean; positive?: boolean; negative?: boolean }[] = [];

  if (model.kind === 'box3') {
    lines.push(
      { label: 'Forfaitair return basis',  value: `€${fmtMoney(summary.totalGrossEur)} gross (proxy)`, muted: true },
      { label: 'Heffingvrij vermogen',     value: `−€${fmtMoney(allowanceUsedEur)}`, muted: true },
      { label: `Box 3 @ ${model.rate}% × ${model.forfaitairPct}% forfaitair`,
        value: `€${fmtMoney(preCreditEur)}` },
      { label: 'Foreign WTH credit applied',
        value: `−€${fmtMoney(foreignCreditEur)}`, positive: true },
      { label: `Box 3 due`,
        value: `€${fmtMoney(finalEur)}`, total: true, negative: finalEur > 0.5 },
    );
  } else {
    if (allowanceUsedEur > 0) {
      const allowanceLabel = (model.kind === 'flat' || model.kind === 'progressive') && model.allowanceLabel
        ? model.allowanceLabel
        : 'Annual allowance';
      lines.push(
        { label: 'Gross dividends',  value: `€${fmtMoney(summary.totalGrossEur)}`, muted: true },
        { label: allowanceLabel,     value: `−€${fmtMoney(allowanceUsedEur)}`, muted: true, positive: true },
      );
    } else {
      lines.push({ label: 'Taxable dividends', value: `€${fmtMoney(summary.totalGrossEur)}`, muted: true });
    }
    const rateLabel =
      model.kind === 'flat' ? `${model.rate}%`
      : model.kind === 'progressive' ? 'progressive bands'
      : `~${(model as Extract<ResidenceModel, { kind: 'marginal-passthrough' }>).defaultMarginal + ((model as Extract<ResidenceModel, { kind: 'marginal-passthrough' }>).socialSurchargePct ?? 0)}% marginal`;
    lines.push(
      { label: `${residenceName} tax @ ${rateLabel}`, value: `€${fmtMoney(preCreditEur)}` },
      { label: 'Foreign WTH credit applied',
        value: `−€${fmtMoney(foreignCreditEur)}`, positive: true },
      { label: `${residenceName} tax due`,
        value: `€${fmtMoney(finalEur)}`, total: true, negative: finalEur > 0.5 },
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <table className="pt">
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} style={l.total ? { background: 'var(--surface-2)' } : undefined}>
              <td
                style={{
                  fontSize: l.total ? 12 : 11.5,
                  fontWeight: l.total ? 600 : 500,
                  color: l.muted ? 'var(--text-dim)' : 'var(--text)',
                }}
              >
                {l.label}
              </td>
              <td
                className="r num"
                style={{
                  fontSize: l.total ? 14 : 12,
                  fontWeight: l.total ? 700 : 500,
                  color: l.negative ? 'oklch(0.50 0.16 25)'
                    : l.positive ? 'oklch(0.36 0.08 165)'
                    : 'var(--text)',
                }}
              >
                {l.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* "True net" capstone line — what the user actually keeps */}
      <div
        style={{
          marginTop: 12, padding: '12px 14px',
          background: 'oklch(0.97 0.03 165)', borderRadius: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Net kept after all taxes</span>
        <span
          className="num"
          style={{ fontSize: 18, fontWeight: 700, color: 'oklch(0.36 0.08 165)' }}
        >
          €{fmtMoney(finalNetEur)}
        </span>
      </div>
      {note && (
        <div
          style={{
            marginTop: 10, fontSize: 11, color: 'var(--text-muted)',
            lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: 8,
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}

function StatusChip({ row }: { row: { reclaimableEur: number; treatyRate: number | null; effectiveRate: number; withheldEur: number } }) {
  if (row.withheldEur === 0 && row.effectiveRate === 0) {
    return <span className="pill safe">no WTH</span>;
  }
  if (row.reclaimableEur > 0.01) {
    return <span className="pill" style={{ background: 'oklch(0.94 0.04 75)', color: 'oklch(0.36 0.10 75)' }}>reclaim</span>;
  }
  if (row.treatyRate != null && Math.abs(row.effectiveRate - row.treatyRate) < 0.5) {
    return <span className="pill safe">treaty ✓</span>;
  }
  return <span className="pill">final</span>;
}

/**
 * Short, country-specific reclaim guidance. Intentionally non-prescriptive —
 * we point users at the form / authority, not at a step-by-step we can't
 * actually verify for every broker setup.
 */
function reclaimAction(source: string, residence: TaxResidence): string {
  const r = residence;
  switch (source) {
    case 'CH':
      return r === 'IE'
        ? 'File Swiss form 85 (Antrag auf Rückerstattung) within 3 years of payment.'
        : 'Switzerland reclaims via form 85 / DA-1 through your broker.';
    case 'DE':
      return 'Treaty reclaim filed with BZSt (Federal Central Tax Office). 4-year window.';
    case 'FR':
      return 'French Form 5000 + 5001 to the DGFiP, typically via broker.';
    case 'US':
      return 'Most brokers apply the 15% treaty rate automatically once W-8BEN is on file. Check that yours did.';
    case 'CA':
      return 'CRA NR4 / NR301 — usually handled via broker if treaty form is on file.';
    case 'ES':
      return 'Form 210 / 211 to the Agencia Tributaria within 4 years of payment.';
    case 'IT':
      return 'Agenzia delle Entrate — modello rimborso dividendi; treaty 15% rate applies for IE residents.';
    default:
      return `Check ${COUNTRY_NAMES[source] ?? source} tax authority for treaty-reclaim procedure.`;
  }
}

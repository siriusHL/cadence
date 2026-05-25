import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getHoldingsView } from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import {
  getTaxSummary, computeDomesticTax,
  DEFAULT_RESIDENCE, COUNTRY_NAMES,
  type TaxResidence, type DomesticTaxBreakdown, type ResidenceModel,
} from '@/lib/tax';
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
  const summary = await getTaxSummary(supabase, portfolio.id, fiscalYear, residence);

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
    </div>
  );
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

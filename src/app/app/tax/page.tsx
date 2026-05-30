import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { effectiveTier } from '@/lib/effectiveTier';
import { getHoldingsView } from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import {
  getTaxSummary, computeDomesticTax,
  getCapitalGainsSummary, computeCapitalGainsTax,
  DEFAULT_RESIDENCE, COUNTRY_NAMES, IE_BAND_MARGINAL_PCT,
  type TaxResidence, type TaxSummary, type DomesticTaxBreakdown, type ResidenceModel,
  type CapitalGainsSummary, type CGTBreakdown, type CGTModel, type DividendTaxBand,
} from '@/lib/tax';
import { getActivityYears } from '@/lib/export';
import { EmptyState } from '@/components/EmptyState';
import { InfoTooltip } from '@/components/InfoTooltip';
import { SendToAccountantModal } from '@/components/SendToAccountantModal';
import { AccountantSendHistory } from '@/components/AccountantSendHistory';
import { Box3ValueEditor } from '@/components/Box3ValueEditor';
import { DividendTaxBandEditor } from '@/components/DividendTaxBandEditor';

export const dynamic = 'force-dynamic';

function fmtMoney(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

/**
 * Compose the default (editable) email the user sends to their accountant.
 * Plain text — the user can tweak it in the preview before it goes out.
 */
function buildAccountantEmail(args: {
  fiscalYear: number;
  residenceName: string;
  senderName: string;
  summary: TaxSummary;
  domestic: DomesticTaxBreakdown;
  capitalGains: CapitalGainsSummary;
  cgt: CGTBreakdown;
  finalNetEur: number;
  /** Whether the tax-pack workbook is attached by default (elite tier). */
  attached: boolean;
}): { subject: string; body: string } {
  const { fiscalYear, residenceName, senderName, summary, domestic, capitalGains, cgt, finalNetEur, attached } = args;
  const m = (n: number) => `€${fmtMoney(n, 2)}`;

  const jurisdictionLines = summary.rows.length
    ? summary.rows
        .map((r) => `  - ${r.countryName}: gross ${m(r.grossEur)}, withheld ${m(r.withheldEur)} (${fmtPct(r.effectiveRate)})`)
        .join('\n')
    : '  - No foreign dividend withholding recorded.';

  const subject = `Tax summary ${fiscalYear}${senderName ? ` — ${senderName}` : ''}`;

  const body = [
    'Hi,',
    '',
    `Please find below my ${fiscalYear} investment tax summary from Cadence (resident in ${residenceName}).`,
    '',
    'Dividends',
    `  - Gross dividends: ${m(summary.totalGrossEur)}`,
    `  - Foreign withholding: ${m(summary.totalWithheldEur)}`,
    `  - ${residenceName} tax due: ${m(domestic.finalEur)}`,
    `  - Net after all taxes: ${m(finalNetEur)}`,
    `  - Reclaimable foreign tax: ${m(summary.totalReclaimableEur)}`,
    '',
    'Withholding by jurisdiction',
    jurisdictionLines,
    '',
    'Capital gains',
    `  - Net realised gain/loss: ${m(capitalGains.totalRealizedGainEur)}`,
    `  - Estimated ${residenceName} CGT: ${m(cgt.taxDueEur)}`,
    '',
    attached
      ? `The full ${fiscalYear} tax pack (dividends + capital gains, .xlsx) is attached.`
      : 'Full CSV / XLSX exports are available on request.',
    '',
    'Thanks,',
    senderName || '',
  ].join('\n');

  return { subject, body };
}

/**
 * Cover-note email for the "Send all years" handoff. Deliberately light — the
 * combined multi-year tax-pack workbook (attached) is the source of truth for
 * the per-year figures, so the body just frames the years covered rather than
 * re-deriving every year's tax on the request path.
 */
function buildAllYearsAccountantEmail(args: {
  years: number[];
  residenceName: string;
  senderName: string;
  attached: boolean;
}): { subject: string; body: string } {
  const { years, residenceName, senderName, attached } = args;
  const asc = [...years].sort((a, b) => a - b);
  const min = asc[0];
  const max = asc[asc.length - 1];
  const range = min === max ? `${min}` : `${min}–${max}`;
  const yearsList = [...years].sort((a, b) => b - a).join(', ');

  const subject = `Tax summary ${range}${senderName ? ` — ${senderName}` : ''}`;

  const body = [
    'Hi,',
    '',
    `Please find my full investment tax summary from Cadence covering fiscal years ${range} (resident in ${residenceName}).`,
    '',
    `Fiscal years included: ${yearsList}.`,
    '',
    attached
      ? 'The combined multi-year tax pack (.xlsx) is attached — separate Dividends and Capital gains sheets, each carrying a Fiscal year column so the data stays groupable by year.'
      : 'Full per-year CSV / XLSX exports are available on request.',
    '',
    'Thanks,',
    senderName || '',
  ].join('\n');

  return { subject, body };
}

export default async function TaxScreen({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: sub }, { data: recentSends, count: sendsCount }, portfolio] = await Promise.all([
    supabase.from('profiles').select('tax_country, base_currency, accountant_email, dividend_tax_band, display_name, first_name, last_name').eq('id', user!.id).maybeSingle(),
    supabase.from('subscriptions').select('tier, admin_tier_override').eq('user_id', user!.id).maybeSingle(),
    supabase.from('accountant_sends').select('recipient, fiscal_year, attached_pack, all_years, created_at', { count: 'exact' }).eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
    getActivePortfolio(supabase, user!.id),
  ]);

  // The tax-pack attachment is the same elite-only artefact as the Export
  // section, so only offer it to elite users.
  const canAttachTaxPack = effectiveTier(sub) === 'elite';

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

  // Fiscal year is driven by the ?year= search param, defaulting to the current
  // calendar year. Clamped to a sane range so a junk param can't break the page.
  const currentYear = new Date().getFullYear();
  const requestedYear = Number((await searchParams)?.year);
  const fiscalYear =
    Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= currentYear + 1
      ? requestedYear
      : currentYear;
  const isCurrentYear = fiscalYear === currentYear;

  const [summary, capitalGains, activityYears] = await Promise.all([
    getTaxSummary(supabase, portfolio.id, fiscalYear, residence),
    getCapitalGainsSummary(supabase, portfolio.id, fiscalYear, residence),
    getActivityYears(supabase, portfolio.id),
  ]);

  // Year options for the switcher: the current year is always offered, plus any
  // year with recorded dividend/sale activity, plus whatever's selected now.
  const yearOptions = Array.from(
    new Set<number>([currentYear, fiscalYear, ...activityYears.map((y) => y.year)]),
  ).sort((a, b) => b - a);
  const cgt = computeCapitalGainsTax(capitalGains);

  // Domestic tax: residence-side layer (final tax minus foreign credit).
  // NL Box 3 is charged on the portfolio value at 1 January, which can't be
  // derived from today's holdings — the user records it per year. We pass the
  // saved value when present; today's holdings value is only a starting-point
  // suggestion offered in the editor, never used as the basis silently.
  const approxPortfolioValueEur = held.reduce(
    (s, h) => s + (h.price ?? 0) * h.quantity,
    0,
  );
  const isBox3 = residence === 'NL';
  const { data: box3Row } = isBox3
    ? await supabase
        .from('box3_values')
        .select('value_eur')
        .eq('user_id', user!.id)
        .eq('fiscal_year', fiscalYear)
        .maybeSingle()
    : { data: null };
  const box3ValueJan1 = box3Row?.value_eur != null ? Number(box3Row.value_eur) : null;

  // IE taxes dividends at the user's income-tax band. Use their saved band when
  // set; otherwise the model default (higher rate) preserves prior behaviour.
  const isMarginalIE = residence === 'IE';
  const dividendTaxBand = (profile?.dividend_tax_band as DividendTaxBand | null | undefined) ?? null;
  const marginalPct = dividendTaxBand != null ? IE_BAND_MARGINAL_PCT[dividendTaxBand] : undefined;

  const domestic = computeDomesticTax(summary, {
    portfolioValueJan1: box3ValueJan1 ?? undefined,
    marginalPct,
  });

  const finalNetEur = summary.totalNetEur - domestic.finalEur;

  // Reclaim card recipients — countries where we're over-withheld.
  const reclaimable = summary.rows
    .filter((r) => r.reclaimableEur > 0.01)
    .sort((a, b) => b.reclaimableEur - a.reclaimableEur);

  // Headline copy variation depending on whether we have any data at all.
  const hasAnyData = summary.totalGrossEur > 0;
  const residenceName = COUNTRY_NAMES[residence] ?? residence;

  // Default "Send to accountant" email — editable in the preview popup.
  const senderName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
    || (profile?.display_name ?? '');
  const { subject: emailSubject, body: emailBody } = buildAccountantEmail({
    fiscalYear, residenceName, senderName, summary, domestic, capitalGains, cgt, finalNetEur,
    attached: canAttachTaxPack,
  });

  // "Send all years" bundles the combined multi-year tax-pack workbook, so it's
  // only offered to elite users (same gate as the attachment) and only when
  // there's more than one fiscal year of activity to combine — mirrors the
  // Export section's "All years" row.
  const activityYearNums = activityYears.map((y) => y.year);
  const showAllYearsSend = canAttachTaxPack && activityYearNums.length > 1;
  const allYearsEmail = showAllYearsSend
    ? buildAllYearsAccountantEmail({ years: activityYearNums, residenceName, senderName, attached: true })
    : null;

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">
            Withholding · {fiscalYear} · resident in {residenceName}
            <InfoTooltip label="Withholding tax (WHT) is the slice the source country keeps before a foreign dividend reaches your account. The US, for example, withholds 30% on dividends unless a tax treaty lowers the rate. This page shows what's been withheld and what you owe your home country on top." />
            {summary.projected && hasAnyData && (
              <>
                {' '}
                <span className="tag" style={{ marginLeft: 6 }}>
                  projected
                  <InfoTooltip label="No actual dividend payments are logged for this year yet, so the figures are estimated from your current holdings and their upcoming ex-dates. They'll be replaced with real numbers as payments land." />
                </span>
              </>
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

      <TaxYearSwitcher years={yearOptions} active={fiscalYear} currentYear={currentYear} />

      {/* 5-tile hero strip — gross → foreign WTH → domestic → final net → reclaim */}
      <div className="hero-stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="tile">
          <div className="l">
            Gross dividends · {isCurrentYear ? 'YTD' : fiscalYear}
            <InfoTooltip label="Total dividends declared in your favour for the selected fiscal year, before any tax is withheld. For the current year this is year-to-date (Jan 1 until today); for past years it's the full year." />
          </div>
          <div className="v sm">€{fmtMoney(summary.totalGrossEur)}</div>
          <div className="d">
            {summary.rows.length} jurisdiction{summary.rows.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="tile">
          <div className="l">
            Foreign WTH
            <InfoTooltip label="Withholding tax already taken by the source country before the dividend hit your account. A US stock paying $100 may arrive as $85 after 15% US withholding." />
          </div>
          <div className="v sm down">€{fmtMoney(summary.totalWithheldEur)}</div>
          <div className="d">{summary.effectiveRatePct.toFixed(1)}% at source</div>
        </div>
        <div className="tile">
          <div className="l">
            {residenceName} tax
            <InfoTooltip label="The tax your home country charges on top of any foreign withholding. Most countries give a credit for foreign WTH already paid, so you don't get double-taxed on the same dividend." />
          </div>
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
          <div className="l">
            Net after all taxes
            <InfoTooltip label="What actually lands in your pocket — gross dividends minus both foreign withholding and your home-country tax. This is the number that matters for your real income." />
          </div>
          <div className="v sm up">€{fmtMoney(finalNetEur)}</div>
          <div className="d">
            {summary.totalGrossEur > 0
              ? `${(100 - domestic.effectiveTotalPct).toFixed(1)}% of gross`
              : '—'}
          </div>
        </div>
        <div className="tile">
          <div className="l">
            Reclaimable
            <InfoTooltip label="Foreign tax you over-paid that you could claim back. If a country withholds 35% but the tax treaty with your country caps it at 15%, the extra 20% is reclaimable — usually by filing a form with the source country." />
          </div>
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

      <div className="row-2" style={{ gridTemplateColumns: '1.5fr 1fr', marginTop: 14, alignItems: 'start' }}>
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
                    <th className="r">
                      Statutory
                      <InfoTooltip label="The default withholding rate the source country applies to foreign investors with no tax treaty in place. Often the worst-case scenario — most EU residents get a lower treaty rate." />
                    </th>
                    <th className="r">
                      Treaty
                      <InfoTooltip label="The reduced rate negotiated in the tax treaty between your country of residence and the source country. To get it, the right paperwork (W-8BEN for the US, etc.) usually has to be on file with your broker." />
                    </th>
                    <th className="r">
                      Effective
                      <InfoTooltip label="The rate you actually paid, based on real withholding on this year's dividends. Compare against Treaty — if it's higher, you're being over-withheld and may be able to reclaim the difference." />
                    </th>
                    <th className="r">Withheld €</th>
                    <th className="r">Net €</th>
                    <th className="r">
                      Status
                      <InfoTooltip label="Treaty ✓ = withheld at the treaty rate, nothing to do. Reclaim = over-withheld, money on the table. Final = treaty already applied, no recovery available. No WTH = country doesn't withhold (e.g. UK)." />
                    </th>
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
                        <td className="r"><StatusChip row={r} /></td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals only when ≥2 countries — for a single jurisdiction
                    the totals row is just a duplicate of the data row with
                    awkward empty gaps for Statutory/Treaty/Status. */}
                {summary.rows.length > 1 && (
                  <tfoot>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <td className="b" colSpan={2} style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
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
                )}
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
          {isBox3 && (
            <div style={{ padding: '4px 4px 14px' }}>
              <Box3ValueEditor
                fiscalYear={fiscalYear}
                initialValue={box3ValueJan1}
                approxValue={approxPortfolioValueEur}
              />
            </div>
          )}
          {isMarginalIE && (
            <div style={{ padding: '4px 4px 14px' }}>
              <DividendTaxBandEditor initialBand={dividendTaxBand} />
            </div>
          )}
        </div>

        {/* Reclaim opportunities */}
        <div className="pcard">
          <div className="pcard-h">
            <div className="t">
              Reclaim opportunities
              <InfoTooltip label="Countries where you paid more withholding tax than your tax treaty actually allows. Each card below tells you which form to file with which tax authority to claim the over-payment back." />
            </div>
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

      {/* ─── Send to accountant ──────────────────────────────────────── */}
      <div className="pcard" style={{ marginTop: 14 }}>
        <div className="pcard-h">
          <div className="t">
            Send to accountant
            <InfoTooltip label="Emails a plain-text summary of this year's dividend tax, withholding and capital gains to your accountant. The preview is fully editable before it's sent, and the recipient defaults to the accountant email in your settings." />
          </div>
          <span className="tag">{fiscalYear} · editable preview</span>
        </div>
        <div style={{ padding: '12px 4px 4px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            {profile?.accountant_email
              ? <>Goes to{' '}
                  <Link
                    href="/app/settings#accountant-email"
                    style={{ color: 'var(--text)', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2 }}
                    title="Change the saved accountant email in Settings"
                  >
                    {profile.accountant_email}
                  </Link>{' '}
                  by default — you can change the recipient and edit the message before sending.</>
              : <>No accountant email saved yet. Add one to pre-fill the recipient every time, or just type one into the preview.</>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {!profile?.accountant_email && (
              <Link
                href="/app/settings"
                className="btn"
                style={{
                  height: 36, padding: '0 18px',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
                  borderRadius: 999, fontSize: 14, fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                + Add accountant email
              </Link>
            )}
            <SendToAccountantModal
              accountantEmail={profile?.accountant_email ?? ''}
              defaultSubject={emailSubject}
              defaultBody={emailBody}
              year={fiscalYear}
              canAttach={canAttachTaxPack}
              primary={Boolean(profile?.accountant_email)}
            />
            {allYearsEmail && (
              <SendToAccountantModal
                accountantEmail={profile?.accountant_email ?? ''}
                defaultSubject={allYearsEmail.subject}
                defaultBody={allYearsEmail.body}
                year={fiscalYear}
                canAttach={canAttachTaxPack}
                allYears
                primary={false}
                triggerLabel="Send all years"
              />
            )}
          </div>
          <AccountantSendHistory
            initial={recentSends ?? []}
            total={sendsCount ?? (recentSends?.length ?? 0)}
          />
        </div>
      </div>

      {/* ─── Export tax data ─────────────────────────────────────────── */}
      <ExportSection years={activityYears} />
    </div>
  );
}

// Year selector driving the whole page's fiscal year. Server-rendered pills
// (plain <Link>s) — no client JS needed, mirrors the dividends tab nav. The
// current year links to the bare /app/tax so it stays the canonical default.
function TaxYearSwitcher({
  years, active, currentYear,
}: {
  years: number[];
  active: number;
  currentYear: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Tax year</span>
      <div role="tablist" aria-label="Tax year" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {years.map((y) => {
          const isActive = y === active;
          return (
            <Link
              key={y}
              href={y === currentYear ? '/app/tax' : `/app/tax?year=${y}`}
              role="tab"
              aria-selected={isActive}
              className="num"
              style={{
                padding: '5px 12px',
                fontSize: 12.5,
                fontWeight: 600,
                borderRadius: 999,
                textDecoration: 'none',
                border: '1px solid ' + (isActive ? 'var(--text)' : 'var(--border)'),
                background: isActive ? 'var(--text)' : 'var(--surface)',
                color: isActive ? 'var(--surface)' : 'var(--text-muted)',
                transition: 'background 140ms ease, color 140ms ease, border-color 140ms ease',
              }}
            >
              {y}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ExportSection({
  years,
}: {
  years: { year: number; hasDividends: boolean; hasSales: boolean }[];
}) {
  // Offer a combined "all years" export only when there's more than one year of
  // activity — for a single year the per-year row already covers everything.
  const showAllYears = years.length > 1;
  const anyDividends = years.some((y) => y.hasDividends);
  const anySales = years.some((y) => y.hasSales);
  return (
    <div className="pcard" style={{ marginTop: 14 }}>
      <div className="pcard-h">
        <div className="t">
          Export tax data
          <InfoTooltip label="Download year-by-year tax data formatted for filing. The 'Tax pack' XLSX bundles dividends and capital gains into one workbook with separate sheets — easiest format to hand off to an accountant." />
        </div>
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
            Per-stream CSVs map onto individual tax forms; the Tax pack
            workbook bundles both streams into one .xlsx with separate
            sheets — useful when handing the whole year to an accountant.
          </div>
          <div
            style={{
              border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
            }}
          >
            {showAllYears && (
              <div
                style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr auto',
                  gap: 14, alignItems: 'center',
                  padding: '12px 14px',
                  background: 'var(--surface-2)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  All years
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                  every fiscal year combined · one file
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <DownloadButton
                    href="/api/export/dividends-all"
                    filename="dividends-all-years.csv"
                    label="Dividends CSV"
                    enabled={anyDividends}
                  />
                  <DownloadButton
                    href="/api/export/capital-gains-all"
                    filename="capital-gains-all-years.csv"
                    label="Gains CSV"
                    enabled={anySales}
                  />
                  <DownloadButton
                    href="/api/export/tax-pack-all"
                    filename="tax-pack-all-years.xlsx"
                    label="Tax pack XLSX"
                    enabled={anyDividends || anySales}
                    variant="strong"
                  />
                </div>
              </div>
            )}
            {years.map((y, i) => (
              <div
                key={y.year}
                style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr auto',
                  gap: 14, alignItems: 'center',
                  padding: '12px 14px',
                  borderTop: i === 0 && !showAllYears ? 0 : '1px solid var(--border)',
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
                    label="Dividends CSV"
                    enabled={y.hasDividends}
                  />
                  <DownloadButton
                    href={`/api/export/capital-gains?year=${y.year}`}
                    filename={`capital-gains-${y.year}.csv`}
                    label="Gains CSV"
                    enabled={y.hasSales}
                  />
                  <DownloadButton
                    href={`/api/export/tax-pack?year=${y.year}`}
                    filename={`tax-pack-${y.year}.xlsx`}
                    label="Tax pack XLSX"
                    enabled={y.hasDividends || y.hasSales}
                    variant="strong"
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
  href, filename, label, enabled, variant,
}: {
  href: string; filename: string; label: string; enabled: boolean;
  /** "strong" pulls the chip into a filled (accent) style — used for the
   *  "Tax pack XLSX" button so the workbook variant reads as the primary
   *  download next to the per-stream CSVs. */
  variant?: 'default' | 'strong';
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
  const strong = variant === 'strong';
  return (
    <a
      href={href}
      download={filename}
      className={strong ? undefined : 'chip'}
      style={{
        height: 28, padding: '0 12px',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 11.5, fontWeight: strong ? 600 : 500,
        textDecoration: 'none',
        ...(strong ? {
          background: 'var(--text)',
          color: 'var(--surface)',
          borderRadius: 999,
        } : {}),
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
          <div className="t">
            Capital gains · {fiscalYear}
            <InfoTooltip label="Profits or losses from selling shares — separate from dividends. Tax authorities treat these very differently, often with their own rates, allowances, and loss carry-forward rules." />
          </div>
          <span className="tag">
            FIFO · EUR equiv.
            <InfoTooltip label="FIFO = First In, First Out. When you sell shares, the cost basis is taken from your oldest buy lots first. This is the default for most European tax systems." />
          </span>
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
                  <th className="r">
                    Proceeds €
                    <InfoTooltip label="What you actually received from the sale — shares sold × sale price, after any broker commission, converted to euros at the trade-date FX." />
                  </th>
                  <th className="r">
                    Cost basis €
                    <InfoTooltip label="What you originally paid for the shares you sold. Calculated FIFO — oldest shares are matched first. The difference between proceeds and cost basis is your realized gain or loss." />
                  </th>
                  <th className="r">Gain/Loss €</th>
                  <th>
                    Held
                    <InfoTooltip label="How long you owned the shares before selling. Some tax regimes apply different rates to long-term holdings (typically 1+ year), so the holding period can change what you owe." />
                  </th>
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
          <div className="t">
            {residenceName} CGT · {fiscalYear}
            <InfoTooltip label="Capital Gains Tax estimate for your country of residence. Takes your realized gains and losses for the year, subtracts any allowance and prior-year losses, and applies the local tax regime to whatever remains." />
          </div>
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
                      <InfoTooltip label="Unused losses from previous years offsetting this year's gains. Most countries let you 'carry forward' losses for several years so a bad year can lower the tax on a future good year." />
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
                      <InfoTooltip label="A tax-free amount granted each year by your country's CGT regime. Gains below this threshold aren't taxed at all — only the excess is. The exact amount varies by country and changes over time." />
                    </td>
                    <td className="r num" style={{ fontSize: 12, color: 'oklch(0.36 0.08 165)' }}>
                      −€{fmtMoney(breakdown.allowanceUsedEur, 2)}
                    </td>
                  </tr>
                )}
                {breakdown.taxableGainEur > 0 && (
                  <tr>
                    <td style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                      Taxable gain
                      <InfoTooltip label="What's left after subtracting prior-year losses and your annual allowance from the net realized gain. This is the figure the tax rate is actually applied to." />
                    </td>
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

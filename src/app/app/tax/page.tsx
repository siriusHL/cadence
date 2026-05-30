import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolioId } from '@/lib/activePortfolio';
import { computeTaxView, type TaxView } from '@/lib/tax';
import { ExportSection } from './ExportSection';
import { SendToAccountantModal } from '@/components/SendToAccountantModal';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ year?: string }>;

function fmtMoney(n: number, currency: string): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/** Compose the default (editable) email the user sends to their accountant. */
function buildAccountantEmail(view: TaxView, name: string): { subject: string; body: string } {
  const { year, baseCurrency: cur, totals, domestic, reclaim, capitalGains, byJurisdiction } = view;
  const m = (n: number) => fmtMoney(n, cur);

  const jurisdictionLines = byJurisdiction.length
    ? byJurisdiction
        .map((j) => `  - ${j.country}: gross ${m(j.gross)}, withheld ${m(j.withheld)} (${fmtPct(j.rate)})`)
        .join('\n')
    : '  - No foreign dividend withholding recorded.';

  const subject = `Tax summary ${year}${name ? ` — ${name}` : ''}`;

  const body = [
    'Hi,',
    '',
    `Please find below my ${year} investment tax summary from Cadence.`,
    '',
    'Dividends',
    `  - Gross dividends: ${m(totals.gross)}`,
    `  - Withheld at source: ${m(totals.withheld)}`,
    `  - Net received: ${m(totals.net)}`,
    '',
    'Domestic tax',
    `  - Estimated tax due: ${m(domestic.taxDue)} (effective rate ${fmtPct(domestic.effectiveRate)})`,
    '',
    'Reclaim opportunities',
    `  - Total reclaimable: ${m(reclaim.totalReclaimable)}`,
    '',
    'Capital gains',
    `  - Realised gains: ${m(capitalGains.realised)}`,
    `  - Estimated CGT: ${m(capitalGains.cgtEstimate)}`,
    '',
    'Withholding by jurisdiction',
    jurisdictionLines,
    '',
    'Full CSV / XLSX exports are available on request.',
    '',
    'Thanks,',
    name || '',
  ].join('\n');

  return { subject, body };
}

export default async function TaxPage({ searchParams }: { searchParams: SearchParams }) {
  const { year: yearParam } = await searchParams;
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const portfolioId = await getActivePortfolioId();
  if (!portfolioId) {
    return (
      <div className="cdn-pro">
        <div className="pro-hero"><div><div className="eyebrow">Tax</div><h1>Tax overview</h1></div></div>
        <div className="pcard" style={{ padding: 24 }}>
          <p style={{ color: 'var(--text-muted)' }}>No portfolio yet.</p>
        </div>
      </div>
    );
  }

  const [view, { data: profile }] = await Promise.all([
    computeTaxView(supabase, portfolioId, yearParam),
    supabase
      .from('profiles')
      .select('accountant_email, display_name, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const { year, years, baseCurrency, totals, byJurisdiction, reclaim, domestic, capitalGains } = view;

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  const senderName = fullName || (profile?.display_name ?? '');
  const { subject: emailSubject, body: emailBody } = buildAccountantEmail(view, senderName);

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Tax</div>
          <h1>Tax overview</h1>
          <div className="sub">
            Dividend withholding, reclaim opportunities, and capital-gains — for {year}.
          </div>
        </div>
        <TaxYearSwitcher years={years} current={year} />
      </div>

      {/* hero stats */}
      <div className="pro-strip">
        <Stat label="Gross dividends" value={fmtMoney(totals.gross, baseCurrency)} />
        <Stat label="Withheld at source" value={fmtMoney(totals.withheld, baseCurrency)} tone="warn" />
        <Stat label="Domestic tax due" value={fmtMoney(domestic.taxDue, baseCurrency)} tone="warn" />
        <Stat label="Net in pocket" value={fmtMoney(totals.net, baseCurrency)} tone="good" />
        <Stat label="Reclaimable" value={fmtMoney(reclaim.totalReclaimable, baseCurrency)} tone="good" />
      </div>

      {/* by jurisdiction */}
      <div className="pcard">
        <div className="pcard-h"><div className="t">Withholding by jurisdiction</div></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ptable">
            <thead>
              <tr>
                <th>Country</th><th>Gross</th><th>Rate</th><th>Withheld</th>
                <th>Treaty</th><th>Reclaimable</th>
              </tr>
            </thead>
            <tbody>
              {byJurisdiction.map((j) => (
                <tr key={j.country}>
                  <td>{j.country}</td>
                  <td>{fmtMoney(j.gross, baseCurrency)}</td>
                  <td>{fmtPct(j.rate)}</td>
                  <td>{fmtMoney(j.withheld, baseCurrency)}</td>
                  <td><StatusChip status={j.treatyStatus} /></td>
                  <td>{fmtMoney(j.reclaimable, baseCurrency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* domestic tax */}
      <DomesticTaxBreakdown domestic={domestic} baseCurrency={baseCurrency} />

      {/* reclaim */}
      <div className="pcard">
        <div className="pcard-h"><div className="t">Reclaim opportunities</div></div>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          {reclaim.opportunities.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No reclaim opportunities for {year}.</p>
          ) : (
            reclaim.opportunities.map((o) => (
              <div key={o.country} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{o.country}</span>
                <span>{fmtMoney(o.amount, baseCurrency)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* capital gains */}
      <CapitalGainsSection capitalGains={capitalGains} baseCurrency={baseCurrency} />

      {/* send to accountant */}
      <div className="pcard">
        <div className="pcard-h"><div className="t">Send to accountant</div></div>
        <div style={{ padding: 16 }}>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 12px' }}>
            Email a {year} tax summary to your accountant. You can review and edit the message before
            it&rsquo;s sent.
          </p>
          <SendToAccountantModal
            accountantEmail={profile?.accountant_email ?? ''}
            defaultSubject={emailSubject}
            defaultBody={emailBody}
          />
        </div>
      </div>

      {/* export */}
      <ExportSection year={year} />
    </div>
  );
}

function TaxYearSwitcher({ years, current }: { years: number[]; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {years.map((y) => (
        <Link
          key={y}
          href={`/app/tax?year=${y}`}
          className="pro-pill"
          data-active={y === current ? '' : undefined}
        >
          {y}
        </Link>
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) {
  return (
    <div className="pro-stat" data-tone={tone}>
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  return <span className="pro-chip">{status}</span>;
}

function DomesticTaxBreakdown({ domestic, baseCurrency }: { domestic: TaxView['domestic']; baseCurrency: string }) {
  return (
    <div className="pcard">
      <div className="pcard-h"><div className="t">Domestic tax breakdown</div></div>
      <div style={{ padding: 16 }}>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Estimated domestic tax on dividends: {fmtMoney(domestic.taxDue, baseCurrency)} at {fmtPct(domestic.effectiveRate)}.
        </p>
      </div>
    </div>
  );
}

function CapitalGainsSection({ capitalGains, baseCurrency }: { capitalGains: TaxView['capitalGains']; baseCurrency: string }) {
  return (
    <div className="pcard">
      <div className="pcard-h"><div className="t">Capital gains</div></div>
      <div style={{ padding: 16 }}>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Realised gains: {fmtMoney(capitalGains.realised, baseCurrency)} · Estimated CGT: {fmtMoney(capitalGains.cgtEstimate, baseCurrency)}.
        </p>
      </div>
    </div>
  );
}

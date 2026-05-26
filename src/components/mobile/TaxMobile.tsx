// Mobile Tax — V2b chassis (Elite tier).
// Mirrors templates/elite-pages.jsx EliteTaxPage:
//   pro-hero-mob with big € net + flow line "Gross → −WH → −domestic"
//   stat-paired: Gross vs net + Tax stack (Effective / Foreign WH / Reclaimable)
//   Withholding by jurisdiction ptable
//   Domestic tax breakdown ptable + "Net kept" callout
//   Reclaim opportunities list

import { MobileShell } from '@/components/mobile/MobileShell';

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export interface TaxMobileJurisdictionRow {
  country: string;
  countryName: string;
  grossEur: number;
  netEur: number;
  effective: number;
  treaty: number | null;
  statutory: number | null;
  reclaimableEur: number;
}

export interface TaxMobileDomesticBreakdown {
  /** "NL Box 3" / "DE flat 26.375%" / etc. */
  modelLabel: string;
  /** Domestic tax due (in € — already adjusted for foreign WH credit if applicable). */
  final: number;
  /** Foreign withholding credit applied against domestic tax (positive number). */
  foreignCredit: number;
  /** Pre-credit domestic tax (i.e. final + foreignCredit, useful for the breakdown row). */
  preCreditTax: number;
  /** Display label for the headline row, e.g. "Box 3 @ 36% × forfaitair". */
  preCreditLabel: string;
}

export interface TaxMobileProps {
  /** Fiscal year shown. */
  fiscalYear: number;
  /** Display name of the resident jurisdiction, e.g. "France". */
  residenceName: string;
  totalGrossEur: number;
  totalWithheldEur: number;
  totalNetEur: number;
  totalReclaimableEur: number;
  effectiveRatePct: number;
  /** Domestic tax layered on top of WH (Box 3 / flat / progressive / etc.). */
  domestic: TaxMobileDomesticBreakdown;
  /** Per-country withholding breakdown. */
  rows: TaxMobileJurisdictionRow[];
  /** Net the user actually keeps after every tax layer. */
  finalNetEur: number;
  portfolioName: string;
  avatarInitials: string;
}

export function TaxMobile({
  fiscalYear,
  residenceName,
  totalGrossEur,
  totalWithheldEur,
  totalNetEur,
  totalReclaimableEur,
  effectiveRatePct,
  domestic,
  rows,
  finalNetEur,
  portfolioName,
  avatarInitials,
}: TaxMobileProps) {
  const reclaimable = rows
    .filter((r) => r.reclaimableEur > 0.01)
    .sort((a, b) => b.reclaimableEur - a.reclaimableEur);

  // Paired bar — taxes (gross - final net) vs final net
  const totalTakenEur = Math.max(0, totalGrossEur - finalNetEur);
  const aPct = totalGrossEur > 0 ? (totalTakenEur / totalGrossEur) * 100 : 0;
  const bPct = 100 - aPct;

  return (
    <MobileShell
      currentTab="more"
      portfolioName={portfolioName}
      avatarInitials={avatarInitials}
      chassis="v2b"
    >
      {/* Hero — net-after-everything is the headline */}
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 } as React.CSSProperties}>
        <div className="eyebrow">Withholding · {fiscalYear} · {residenceName}</div>
        <h1 style={{ color: 'var(--up-fg, oklch(0.36 0.08 165))' }}>
          <span className="cur" style={{ color: 'var(--text-dim)' }}>€</span>
          {fmt(Math.round(finalNetEur))}
        </h1>
        <div className="sub">
          Gross <b>€{fmt(Math.round(totalGrossEur))}</b> →{' '}
          <b style={{ color: 'var(--down)' }}>−€{fmt(Math.round(totalWithheldEur))}</b> WH →{' '}
          <b style={{ color: 'var(--down)' }}>−€{fmt(Math.round(domestic.final))}</b> {residenceName} tax.
        </div>
      </div>

      {/* Paired: Gross vs net + Tax stack */}
      <div className="stat-paired cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="pcard-mini">
          <div className="ph">Gross vs net</div>
          <div className="paired-vals">
            <span className="num a">€{fmt(Math.round(totalGrossEur))}</span>
            <span className="sep">:</span>
            <span className="num b">€{fmt(Math.round(finalNetEur))}</span>
          </div>
          <div className="paired-bar">
            <div className="a" style={{ width: `${aPct}%` }} />
            <div className="b" style={{ width: `${bPct}%` }} />
          </div>
          <div className="paired-foot">
            <span>Taxes</span>
            <span>Net to you</span>
          </div>
        </div>
        <div className="pcard-mini">
          <div className="ph">Tax stack</div>
          <div className="stacked-rows">
            <div className="srow">
              <span className="name">Effective</span>
              <span className="val">{effectiveRatePct.toFixed(1)}%</span>
            </div>
            <div className="srow">
              <span className="name">Foreign WH</span>
              <span className="val" style={{ color: 'var(--down)' }}>
                €{fmt(Math.round(totalWithheldEur))}
              </span>
            </div>
            <div className="srow">
              <span className="name">Reclaimable</span>
              <span className="val" style={{ color: 'var(--up-fg, oklch(0.36 0.08 165))' }}>
                €{fmt(Math.round(totalReclaimableEur))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Withholding by jurisdiction */}
      {rows.length > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 2 } as React.CSSProperties}>
          <div className="pcard-h">
            <div className="t">Withholding by jurisdiction</div>
            <span className="more">{fiscalYear}</span>
          </div>
          <table className="ptable">
            <thead>
              <tr>
                <th>Country</th>
                <th className="r">Gross</th>
                <th className="r">Eff.</th>
                <th className="r">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.country}>
                  <td className="b">{r.countryName}</td>
                  <td className="r b">€{fmt(Math.round(r.grossEur))}</td>
                  <td className={'r ' + (r.reclaimableEur > 0.01 ? 'down' : 'up')}>
                    {r.effective.toFixed(1)}%
                  </td>
                  <td className="r b up">€{fmt(Math.round(r.netEur))}</td>
                </tr>
              ))}
              <tr style={{ background: 'var(--surface-2)' }}>
                <td
                  className="b"
                  style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-dim)',
                  }}
                >
                  Σ totals
                </td>
                <td className="r b">€{fmt(Math.round(totalGrossEur))}</td>
                <td className="r b">{effectiveRatePct.toFixed(1)}%</td>
                <td className="r b up">€{fmt(Math.round(totalNetEur))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Domestic tax breakdown */}
      <div className="pcard cdn-anim" style={{ '--i': 3 } as React.CSSProperties}>
        <div className="pcard-h">
          <div className="t">{residenceName} tax · {fiscalYear}</div>
          <span className="more">{domestic.modelLabel}</span>
        </div>
        <table className="ptable">
          <tbody>
            <tr>
              <td className="lbl">Gross dividends</td>
              <td className="r b">€{fmt(Math.round(totalGrossEur))}</td>
            </tr>
            <tr>
              <td className="lbl">{domestic.preCreditLabel}</td>
              <td className="r b">€{fmt(Math.round(domestic.preCreditTax))}</td>
            </tr>
            {domestic.foreignCredit > 0.01 && (
              <tr>
                <td className="lbl" style={{ color: 'var(--up-fg, oklch(0.36 0.08 165))' }}>
                  Foreign WH credit
                </td>
                <td
                  className="r b"
                  style={{ color: 'var(--up-fg, oklch(0.36 0.08 165))' }}
                >
                  −€{fmt(Math.round(domestic.foreignCredit))}
                </td>
              </tr>
            )}
            <tr style={{ background: 'var(--surface-2)' }}>
              <td className="b" style={{ fontSize: 12 }}>
                {residenceName} tax due
              </td>
              <td className="r b" style={{ color: 'var(--down)', fontSize: 14 }}>
                €{fmt(Math.round(domestic.final))}
              </td>
            </tr>
          </tbody>
        </table>
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            background: 'oklch(0.97 0.03 165)',
            borderRadius: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600 }}>Net kept after all taxes</span>
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--up-fg, oklch(0.36 0.08 165))',
            }}
          >
            €{fmt(Math.round(finalNetEur))}
          </span>
        </div>
      </div>

      {/* Reclaim opportunities */}
      <div className="pcard cdn-anim" style={{ '--i': 4 } as React.CSSProperties}>
        <div className="pcard-h">
          <div className="t">Reclaim opportunities</div>
          <span className="more">treaty vs effective</span>
        </div>
        {reclaimable.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', padding: '8px 0' }}>
            You&rsquo;re already at treaty rates. 🎉
          </div>
        ) : (
          <div>
            {reclaimable.map((r) => (
              <div
                key={r.country}
                style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.countryName}</div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--up-fg, oklch(0.36 0.08 165))',
                    }}
                  >
                    +€{fmt(Math.round(r.reclaimableEur))}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                  Effective {r.effective.toFixed(1)}%
                  {r.treaty != null && <> · treaty {r.treaty.toFixed(1)}%</>}
                  {r.statutory != null && <> · statutory {r.statutory.toFixed(1)}%</>}
                </div>
              </div>
            ))}
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                fontSize: 11,
                color: 'var(--text-muted)',
                borderTop: '1px solid var(--border)',
                lineHeight: 1.5,
              }}
            >
              <b>€{fmt(Math.round(totalReclaimableEur))}</b> of foreign tax could be reclaimed via treaty
              paperwork.
            </div>
          </div>
        )}
      </div>

      <div style={{ height: 80 }} />
    </MobileShell>
  );
}

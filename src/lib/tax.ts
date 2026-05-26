// Dividend-withholding tax helpers.
//
// Two layers:
//
//   1. Static lookup tables — statutory withholding rates per source country
//      and the treaty-reduced rate when paired with a residence country.
//      These are widely-published numbers (most tax authorities post them
//      publicly); we hard-code instead of fetching because they change
//      maybe once a decade and the table is small.
//
//   2. A data aggregator that walks the user's dividend rows (real
//      transactions when present, projected payments from
//      `instrument_dividends` × held qty otherwise) and rolls them up by
//      source country with EUR-equivalent figures.
//
// This is general info, not tax advice. The numbers here cover the
// developed-market dividend universe most Cadence users will hold;
// anything else falls back to a sentinel that the UI can flag as
// "unknown — check broker statement".

import { type SupabaseClient } from '@supabase/supabase-js';

export type TaxResidence = 'IE' | 'NL' | 'DE' | 'FR' | 'ES' | 'IT' | 'GB' | 'BE' | 'PT' | 'AT';

// Default residence for accounts where profile.tax_country is null.
// Locale leans en-IE; safer than guessing the wrong continent.
export const DEFAULT_RESIDENCE: TaxResidence = 'IE';

/** Statutory withholding rate (%) on dividends paid by a company domiciled in `source`. */
export const STATUTORY_WTH: Record<string, number> = {
  US: 30,    CH: 35,    DE: 26.375, FR: 25,   CA: 25,
  GB: 0,     ES: 19,    NL: 15,     IE: 25,   JP: 20.42,
  AU: 30,    IT: 26,    BE: 30,     SE: 30,   DK: 27,
  NO: 25,    FI: 30,    AT: 27.5,   PT: 28,   HK: 0,
};

/**
 * Treaty-reduced withholding rate (%) under the bilateral double-tax
 * treaty between `source` and the user's residence. Lookups are by
 * residence -> source. Missing entries mean "no treaty / use statutory".
 *
 * Numbers reflect the standard portfolio-investor rate for individuals;
 * pension-fund / corporate sub-rates are not modelled.
 */
export const TREATY_WTH: Record<TaxResidence, Record<string, number>> = {
  IE: {
    US: 15, CH: 15, DE: 15,    FR: 15, CA: 15, GB: 0,  ES: 15, NL: 15,
    JP: 15, AU: 15, IT: 15,    BE: 15, SE: 15, DK: 15, NO: 15, FI: 15,
    AT: 15, PT: 15,
  },
  NL: {
    US: 15, CH: 15, DE: 15,    FR: 15, CA: 15, GB: 10, ES: 15, IE: 15,
    JP: 15, AU: 15, IT: 15,    BE: 15, SE: 15, DK: 15, NO: 15, FI: 15,
    AT: 15, PT: 10,
  },
  DE: {
    US: 15, CH: 15, FR: 15,    CA: 15, GB: 15, ES: 15, NL: 15, IE: 15,
    JP: 15, AU: 15, IT: 15,    BE: 15, SE: 15, DK: 15, NO: 15, FI: 15,
    AT: 15, PT: 15,
  },
  FR: {
    US: 15, CH: 15, DE: 15,    CA: 15, GB: 15, ES: 15, NL: 15, IE: 15,
    JP: 15, AU: 15, IT: 15,    BE: 15, SE: 15, DK: 15, NO: 15, FI: 15,
    AT: 15, PT: 15,
  },
  ES: {
    US: 15, CH: 15, DE: 15,    FR: 15, CA: 15, GB: 15, NL: 15, IE: 15,
    JP: 15, AU: 15, IT: 15,    BE: 15, SE: 15, DK: 15, NO: 15, FI: 15,
    AT: 15, PT: 15,
  },
  IT: { US: 15, CH: 15, DE: 15, FR: 15, GB: 15, ES: 15, NL: 15, IE: 15 },
  GB: { US: 15, CH: 15, DE: 15, FR: 15, CA: 15, ES: 15, NL: 15, IE: 15 },
  BE: { US: 15, CH: 15, DE: 15, FR: 15, GB: 15, ES: 15, NL: 15, IE: 15 },
  PT: { US: 15, CH: 15, DE: 15, FR: 15, GB: 15, ES: 15, NL: 15, IE: 15 },
  AT: { US: 15, CH: 15, DE: 15, FR: 15, GB: 15, ES: 15, NL: 15, IE: 15 },
};

// Human-readable country names for the UI. ISO-2 codes are stored on
// the instruments table — these get joined to render rows.
export const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',  CH: 'Switzerland',  DE: 'Germany',
  FR: 'France',         CA: 'Canada',       GB: 'United Kingdom',
  ES: 'Spain',          NL: 'Netherlands',  IE: 'Ireland',
  JP: 'Japan',          AU: 'Australia',    IT: 'Italy',
  BE: 'Belgium',        SE: 'Sweden',       DK: 'Denmark',
  NO: 'Norway',         FI: 'Finland',      AT: 'Austria',
  PT: 'Portugal',       HK: 'Hong Kong',
};

/** Returns { statutory, treaty } for a source country given the user's residence. */
export function lookupRates(residence: TaxResidence, sourceCountry: string): {
  statutory: number | null;
  treaty: number | null;
} {
  const statutory = STATUTORY_WTH[sourceCountry] ?? null;
  const treaty = TREATY_WTH[residence]?.[sourceCountry] ?? null;
  return { statutory, treaty };
}

// ─── Aggregated view fed to the Tax page ──────────────────────────────

export interface JurisdictionRow {
  country: string;         // ISO-2
  countryName: string;
  currency: string;
  /** True when this row was synthesized from projected ex-dates rather
   *  than logged dividend transactions. */
  projected: boolean;
  grossLocal: number;
  grossEur: number;
  withheldLocal: number;
  withheldEur: number;
  netEur: number;
  effectiveRate: number;   // % — derived from withheld/gross when present, else treaty
  statutoryRate: number | null;
  treatyRate: number | null;
  /** Positive when current withholding exceeds the treaty rate — reclaimable. */
  reclaimableEur: number;
}

export interface TaxSummary {
  residence: TaxResidence;
  fiscalYear: number;
  rows: JurisdictionRow[];
  totalGrossEur: number;
  totalWithheldEur: number;
  totalNetEur: number;
  totalReclaimableEur: number;
  effectiveRatePct: number;
  /** True when the underlying data is projected (no logged dividends). */
  projected: boolean;
}

// ─── Residence-side tax models ────────────────────────────────────────
// Each EU residence applies its own tax to dividend income on top of any
// foreign withholding. The shapes below cover the universe of regimes
// our residence list spans; the actual `computeDomesticTax()` switch
// handles each kind. NL is the outlier — Box 3 is a notional wealth tax,
// not a per-dividend tax, so it's modelled separately.

export type ResidenceModel =
  | {
      kind: 'flat';
      rate: number;                  // % e.g. 26.375 for DE
      allowance?: number;            // EUR, deducted before tax
      allowanceLabel?: string;
      surchargeLabel?: string;       // optional descriptive label for the UI
    }
  | {
      kind: 'progressive';
      // Ascending bands. Each rate applies to the slice up to `upTo`.
      // Last entry should use Infinity.
      bands: { upTo: number; rate: number }[];
      allowance?: number;
      allowanceLabel?: string;
    }
  | {
      kind: 'marginal-passthrough';
      // Treats dividends as ordinary income. We can't know the user's
      // marginal band so we assume a default and let them override later.
      defaultMarginal: number;
      socialSurchargePct?: number;   // e.g. IE USC+PRSI roughly 12pp
      surchargeLabel?: string;
    }
  | {
      kind: 'box3';
      // Per-dividend tax doesn't apply; instead, a forfaitair return on
      // taxable assets above a threshold is taxed at a flat rate.
      forfaitairPct: number;         // e.g. 6.04 for 2026
      rate: number;                  // e.g. 36
      threshold: number;             // heffingvrij vermogen, EUR
    };

export const RESIDENCE_MODELS: Record<TaxResidence, ResidenceModel> = {
  IE: { kind: 'marginal-passthrough', defaultMarginal: 40, socialSurchargePct: 12, surchargeLabel: 'USC + PRSI' },
  NL: { kind: 'box3', forfaitairPct: 6.04, rate: 36, threshold: 57000 },
  DE: { kind: 'flat', rate: 26.375, allowance: 1000, allowanceLabel: 'Sparer-Pauschbetrag', surchargeLabel: 'incl. Soli' },
  FR: { kind: 'flat', rate: 30, surchargeLabel: 'PFU · 12.8 IT + 17.2 social' },
  ES: { kind: 'progressive', bands: [
    { upTo: 6000,   rate: 19 },
    { upTo: 50000,  rate: 21 },
    { upTo: 200000, rate: 23 },
    { upTo: 300000, rate: 27 },
    { upTo: Infinity, rate: 28 },
  ]},
  IT: { kind: 'flat', rate: 26 },
  BE: { kind: 'flat', rate: 30, allowance: 833, allowanceLabel: 'Précompte mobilier exemption' },
  PT: { kind: 'flat', rate: 28 },
  AT: { kind: 'flat', rate: 27.5, surchargeLabel: 'KESt' },
  GB: { kind: 'flat', rate: 8.75, allowance: 500, allowanceLabel: 'Dividend allowance' },
};

export interface DomesticTaxInputs {
  /** IE override (marginal-passthrough): user's top income-tax band, % */
  marginalPct?: number;
  /** NL override (box3): taxable portfolio value at 1 Jan of fiscal year */
  portfolioValueJan1?: number;
}

export interface DomesticTaxBreakdown {
  model: ResidenceModel;
  /** Domestic tax before foreign-tax credit is applied. */
  preCreditEur: number;
  /** Foreign WTH eligible for credit: min(treaty-rate portion of WTH,
   *  domestic tax on the same income). */
  foreignCreditEur: number;
  /** Domestic tax actually owed: max(0, preCreditEur − foreignCreditEur). */
  finalEur: number;
  /** Allowance applied (DE Sparer-Pauschbetrag, BE exemption, GB allowance). */
  allowanceUsedEur: number;
  /** Effective overall rate including domestic tax: (foreignWith + finalDomestic) / gross */
  effectiveTotalPct: number;
  /** Free-text caveat shown in the UI (e.g. "approximated from current portfolio value"). */
  note?: string;
}

/**
 * Apply the residence-country tax on top of the source-country withholding.
 * Returns enough detail for the page to render a "what you actually keep"
 * breakdown.
 */
export function computeDomesticTax(
  summary: TaxSummary,
  inputs: DomesticTaxInputs = {},
): DomesticTaxBreakdown {
  const model = RESIDENCE_MODELS[summary.residence];
  if (!model || summary.totalGrossEur <= 0) {
    return emptyDomesticTax(model);
  }

  // Foreign credit eligible at home: per-row, treaty-rate portion of gross
  // capped by what was actually withheld. The excess (effective > treaty)
  // is the "reclaim from source" side — already in summary.totalReclaimableEur.
  let creditEligibleAtTreaty = 0;
  for (const r of summary.rows) {
    if (r.treatyRate == null) continue;
    const treatyCap = (r.grossEur * r.treatyRate) / 100;
    creditEligibleAtTreaty += Math.min(r.withheldEur, treatyCap);
  }

  if (model.kind === 'box3') {
    // Box 3: notional tax on portfolio value, not on dividends.
    // For v0 we approximate with the user-supplied portfolioValueJan1 or
    // fall back to "skip — needs portfolio value" so the UI can prompt.
    const value = inputs.portfolioValueJan1;
    if (value == null || value <= 0) {
      return {
        ...emptyDomesticTax(model),
        note: 'Box 3 needs your portfolio value on 1 January to estimate. Add it in your profile to see the figure.',
      };
    }
    const base = Math.max(0, value - model.threshold);
    const notionalReturn = (base * model.forfaitairPct) / 100;
    const preCredit = (notionalReturn * model.rate) / 100;
    // NL allows tegemoetkoming for foreign WTH against Box 3, capped at
    // the foreign tax. We treat that as a straight credit for v0.
    const credit = Math.min(creditEligibleAtTreaty, preCredit);
    const final = Math.max(0, preCredit - credit);
    return {
      model,
      preCreditEur:     preCredit,
      foreignCreditEur: credit,
      finalEur:         final,
      allowanceUsedEur: model.threshold,
      effectiveTotalPct: ((summary.totalWithheldEur + final) / summary.totalGrossEur) * 100,
      note: 'Box 3 is a notional wealth tax, not a per-dividend tax — the figure here is the portion attributable to taxable assets above heffingvrij vermogen.',
    };
  }

  // Common path: residence taxes the dividend amount itself.
  const allowance = (model.kind === 'flat' || model.kind === 'progressive') ? (model.allowance ?? 0) : 0;
  const allowanceUsed = Math.min(allowance, summary.totalGrossEur);
  const taxable = Math.max(0, summary.totalGrossEur - allowanceUsed);
  let preCredit = 0;

  if (model.kind === 'flat') {
    preCredit = (taxable * model.rate) / 100;
  } else if (model.kind === 'progressive') {
    let remaining = taxable;
    let prev = 0;
    for (const band of model.bands) {
      const slice = Math.min(band.upTo, remaining + prev) - prev;
      if (slice <= 0) break;
      preCredit += (slice * band.rate) / 100;
      prev += slice;
      remaining -= slice;
      if (remaining <= 0) break;
    }
  } else if (model.kind === 'marginal-passthrough') {
    const margin = inputs.marginalPct ?? model.defaultMarginal;
    const surcharge = model.socialSurchargePct ?? 0;
    preCredit = (taxable * (margin + surcharge)) / 100;
  }

  // Foreign credit cap: can't exceed domestic tax on the credited income.
  const credit = Math.min(creditEligibleAtTreaty, preCredit);
  const final = Math.max(0, preCredit - credit);

  return {
    model,
    preCreditEur:     preCredit,
    foreignCreditEur: credit,
    finalEur:         final,
    allowanceUsedEur: allowanceUsed,
    effectiveTotalPct: ((summary.totalWithheldEur + final) / summary.totalGrossEur) * 100,
  };
}

function emptyDomesticTax(model: ResidenceModel | undefined): DomesticTaxBreakdown {
  return {
    model: model ?? { kind: 'flat', rate: 0 },
    preCreditEur: 0, foreignCreditEur: 0, finalEur: 0,
    allowanceUsedEur: 0, effectiveTotalPct: 0,
  };
}

/**
 * Single representative effective dividend-tax rate (0–1) for the user's
 * residence, given an annual dividend total and a portfolio value (the
 * latter only matters for box3-style regimes). This is a flat-rate
 * approximation for use in the income simulator — it intentionally
 * ignores foreign withholding credits and per-asset nuance.
 */
export function estimateDividendTaxRate(
  residence: TaxResidence,
  annualGrossEur: number,
  portfolioValueEur: number,
  inputs: DomesticTaxInputs = {},
): number {
  const model = RESIDENCE_MODELS[residence];
  if (!model || annualGrossEur <= 0) return 0;

  if (model.kind === 'flat') {
    const allowance = model.allowance ?? 0;
    const taxable = Math.max(0, annualGrossEur - allowance);
    const owed = (taxable * model.rate) / 100;
    return clampRate(owed / annualGrossEur);
  }

  if (model.kind === 'progressive') {
    const allowance = model.allowance ?? 0;
    const taxable = Math.max(0, annualGrossEur - allowance);
    let owed = 0;
    let prev = 0;
    let remaining = taxable;
    for (const band of model.bands) {
      const slice = Math.min(band.upTo, remaining + prev) - prev;
      if (slice <= 0) break;
      owed += (slice * band.rate) / 100;
      prev += slice;
      remaining -= slice;
      if (remaining <= 0) break;
    }
    return clampRate(owed / annualGrossEur);
  }

  if (model.kind === 'marginal-passthrough') {
    const margin = inputs.marginalPct ?? model.defaultMarginal;
    const surcharge = model.socialSurchargePct ?? 0;
    return clampRate((margin + surcharge) / 100);
  }

  if (model.kind === 'box3') {
    // Box 3 taxes a notional return on portfolio value, not the dividend
    // itself. Express it as an "effective rate on dividends" for the sim by
    // dividing the notional tax bill by gross dividend income.
    const base = Math.max(0, portfolioValueEur - model.threshold);
    if (base <= 0) return 0;
    const notionalReturn = (base * model.forfaitairPct) / 100;
    const owed = (notionalReturn * model.rate) / 100;
    return clampRate(owed / annualGrossEur);
  }

  return 0;
}

function clampRate(r: number): number {
  if (!Number.isFinite(r) || r < 0) return 0;
  if (r > 0.75) return 0.75;  // sanity ceiling — protects the simulator from box3 edge cases
  return r;
}

interface DivTxRow {
  ticker: string;
  occurred_on: string;
  quantity: string | number;
  price_local: string | number;
  withholding_local: string | number | null;
  fx_to_base: string | number | null;
}

interface InstrumentRow {
  ticker: string;
  country: string | null;
  currency: string | null;
}

/**
 * Build the dividend-tax summary for a portfolio + fiscal year.
 *
 * Path A — logged transactions: if the portfolio has any `kind='dividend'`
 *   rows in the given year, those are authoritative.
 *
 * Path B — projection: otherwise, walk `instrument_dividends` (real + cadence
 *   rollforward), multiply each by the quantity-held-at-ex-date, and assume
 *   the treaty rate was withheld. The row is flagged `projected=true`.
 *
 * Either way, output is keyed by source-country (ISO-2). Tickers in
 * unknown countries fall under 'XX'.
 */
export async function getTaxSummary(
  supabase: SupabaseClient,
  portfolioId: string,
  fiscalYear: number,
  residence: TaxResidence,
): Promise<TaxSummary> {
  const yearStart = `${fiscalYear}-01-01`;
  const yearEnd   = `${fiscalYear}-12-31`;

  const [divTxRes, holdingsRes, txRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('ticker, occurred_on, quantity, price_local, withholding_local, fx_to_base')
      .eq('portfolio_id', portfolioId)
      .eq('kind', 'dividend')
      .gte('occurred_on', yearStart)
      .lte('occurred_on', yearEnd),
    supabase
      .from('holdings')
      .select('ticker')
      .eq('portfolio_id', portfolioId),
    supabase
      .from('transactions')
      .select('ticker, kind, occurred_on, quantity')
      .eq('portfolio_id', portfolioId)
      .in('kind', ['buy', 'sell'])
      .order('occurred_on', { ascending: true }),
  ]);

  const divTxs = (divTxRes.data ?? []) as DivTxRow[];
  const holdings = (holdingsRes.data ?? []) as { ticker: string }[];
  const buySellTxs = (txRes.data ?? []) as { ticker: string; kind: string; occurred_on: string; quantity: string | number }[];

  // Always need country + currency for every ticker we'll touch.
  const tickerSet = new Set<string>([
    ...divTxs.map((t) => t.ticker),
    ...holdings.map((h) => h.ticker),
  ]);
  if (tickerSet.size === 0) {
    return emptySummary(residence, fiscalYear);
  }

  const { data: instData } = await supabase
    .from('instruments')
    .select('ticker, country, currency')
    .in('ticker', Array.from(tickerSet));
  const instByT = new Map(
    (instData as InstrumentRow[] ?? []).map((r) => [r.ticker, r]),
  );

  // ─── Path A: logged dividend transactions ───────────────────────────
  if (divTxs.length > 0) {
    return aggregate(
      divTxs.map((t) => {
        const inst = instByT.get(t.ticker);
        const gross = Number(t.quantity) * Number(t.price_local);
        const withheld = Number(t.withholding_local ?? 0);
        const fx = Number(t.fx_to_base ?? 1);
        return {
          country:       inst?.country ?? 'XX',
          currency:      inst?.currency ?? 'EUR',
          grossLocal:    gross,
          withheldLocal: withheld,
          fx,
          projected:     false,
        };
      }),
      residence,
      fiscalYear,
      false,
    );
  }

  // ─── Path B: projection from ex-dates × held qty ────────────────────
  const tickers = Array.from(tickerSet);
  const { data: divHistory } = await supabase
    .from('instrument_dividends')
    .select('ticker, ex_date, amount_local')
    .in('ticker', tickers)
    .gte('ex_date', yearStart)
    .lte('ex_date', yearEnd);

  // Quantity-at-date lookup using trade history.
  const tradesByT = new Map<string, { kind: string; date: Date; qty: number }[]>();
  for (const t of buySellTxs) {
    if (!tradesByT.has(t.ticker)) tradesByT.set(t.ticker, []);
    tradesByT.get(t.ticker)!.push({
      kind: t.kind,
      date: new Date(t.occurred_on),
      qty: Number(t.quantity),
    });
  }

  // Need an FX snapshot per ticker currency. Cheapest path is one
  // fx_rates select for the EUR base.
  const { data: fxRows } = await supabase
    .from('fx_rates')
    .select('base, quote, rate')
    .eq('base', 'EUR');
  const fxToEur = new Map<string, number>(
    (fxRows ?? []).map((r) => [r.quote as string, 1 / Number(r.rate)]),
  );
  fxToEur.set('EUR', 1);

  const projected = (divHistory ?? []).flatMap((d) => {
    const inst = instByT.get(d.ticker);
    if (!inst) return [];
    const exDate = new Date(d.ex_date);
    const heldQty = quantityAt(tradesByT.get(d.ticker) ?? [], exDate);
    if (heldQty <= 0) return [];
    const grossLocal = heldQty * Number(d.amount_local);
    const ccy = inst.currency ?? 'EUR';
    const fx = fxToEur.get(ccy) ?? 1;
    const country = inst.country ?? 'XX';
    const { treaty, statutory } = lookupRates(residence, country);
    const assumedRate = treaty ?? statutory ?? 0;
    const withheldLocal = grossLocal * (assumedRate / 100);
    return [{
      country, currency: ccy,
      grossLocal, withheldLocal, fx,
      projected: true,
    }];
  });

  return aggregate(projected, residence, fiscalYear, true);
}

interface AggInput {
  country: string;
  currency: string;
  grossLocal: number;
  withheldLocal: number;
  fx: number;
  projected: boolean;
}

function aggregate(
  rows: AggInput[],
  residence: TaxResidence,
  fiscalYear: number,
  projected: boolean,
): TaxSummary {
  if (rows.length === 0) return emptySummary(residence, fiscalYear);

  const byCountry = new Map<string, JurisdictionRow>();
  for (const r of rows) {
    const grossEur = r.grossLocal * r.fx;
    const withheldEur = r.withheldLocal * r.fx;
    const existing = byCountry.get(r.country);
    if (existing) {
      existing.grossLocal    += r.grossLocal;
      existing.grossEur      += grossEur;
      existing.withheldLocal += r.withheldLocal;
      existing.withheldEur   += withheldEur;
      existing.netEur         = existing.grossEur - existing.withheldEur;
    } else {
      const { statutory, treaty } = lookupRates(residence, r.country);
      byCountry.set(r.country, {
        country:        r.country,
        countryName:    COUNTRY_NAMES[r.country] ?? r.country,
        currency:       r.currency,
        projected:      r.projected,
        grossLocal:     r.grossLocal,
        grossEur,
        withheldLocal:  r.withheldLocal,
        withheldEur,
        netEur:         grossEur - withheldEur,
        effectiveRate:  0,           // filled in below
        statutoryRate:  statutory,
        treatyRate:     treaty,
        reclaimableEur: 0,           // filled in below
      });
    }
  }

  let totalGross = 0, totalWithheld = 0, totalReclaim = 0;
  for (const row of byCountry.values()) {
    row.effectiveRate = row.grossEur > 0 ? (row.withheldEur / row.grossEur) * 100 : 0;
    if (row.treatyRate != null && row.effectiveRate > row.treatyRate + 0.01) {
      // Withheld above treaty — the over-withholding is reclaimable.
      const excessPct = row.effectiveRate - row.treatyRate;
      row.reclaimableEur = (row.grossEur * excessPct) / 100;
    }
    totalGross    += row.grossEur;
    totalWithheld += row.withheldEur;
    totalReclaim  += row.reclaimableEur;
  }

  const sortedRows = [...byCountry.values()].sort((a, b) => b.grossEur - a.grossEur);

  return {
    residence,
    fiscalYear,
    rows: sortedRows,
    totalGrossEur:       totalGross,
    totalWithheldEur:    totalWithheld,
    totalNetEur:         totalGross - totalWithheld,
    totalReclaimableEur: totalReclaim,
    effectiveRatePct:    totalGross > 0 ? (totalWithheld / totalGross) * 100 : 0,
    projected,
  };
}

function emptySummary(residence: TaxResidence, fiscalYear: number): TaxSummary {
  return {
    residence, fiscalYear, rows: [],
    totalGrossEur: 0, totalWithheldEur: 0, totalNetEur: 0,
    totalReclaimableEur: 0, effectiveRatePct: 0, projected: false,
  };
}

function quantityAt(trades: { kind: string; date: Date; qty: number }[], onDate: Date): number {
  let q = 0;
  for (const t of trades) {
    if (t.date > onDate) break;
    if (t.kind === 'buy') q += t.qty;
    else if (t.kind === 'sell') q -= t.qty;
  }
  return q;
}

// ─── Capital gains (realized) ─────────────────────────────────────────
//
// Walks every buy/sell across the portfolio, matches sells against the
// oldest open buy lots (FIFO), and reports realized gain in EUR per sale.
// Sells outside the requested fiscal year still consume lots (so FIFO
// order is preserved across years), but only fiscal-year sells appear in
// the output rows.
//
// Gross figures are local-currency × the sell-row's fx_to_base. Cost
// basis uses the buy lot's own fx_to_base — i.e. the EUR cost is what
// the user paid in EUR at the time, not what it would be at today's FX.
// That matches how most tax authorities want gains computed.

export interface RealizedSale {
  txId: string;
  ticker: string;
  saleDate: string;
  currency: string;
  qty: number;
  proceedsLocal: number;
  proceedsEur: number;
  costBasisLocal: number;
  costBasisEur: number;
  realizedGainEur: number;
  holdingDays: number;     // weighted-average across consumed lots, in days
}

export interface TickerGainRow {
  ticker: string;
  qtySold: number;
  proceedsEur: number;
  costBasisEur: number;
  realizedGainEur: number;
}

export interface CapitalGainsSummary {
  residence: TaxResidence;
  fiscalYear: number;
  sales: RealizedSale[];
  byTicker: TickerGainRow[];
  totalProceedsEur: number;
  totalCostBasisEur: number;
  /** Net of gains and losses (gains − |losses|). */
  totalRealizedGainEur: number;
  /** Sum of positive sale gains only. */
  totalGainsEur: number;
  /** Sum of absolute losses (always ≥ 0). */
  totalLossesEur: number;
  /** True when any sell consumed more shares than the FIFO queue contained
   *  — usually means the user has buys missing for an inherited holding.
   *  Cost basis for the un-matched portion is treated as zero (worst case). */
  hasUnmatchedSells: boolean;
}

interface TradeRow {
  id: string;
  ticker: string;
  kind: string;
  occurred_on: string;
  quantity: string | number;
  price_local: string | number;
  fee_local: string | number | null;
  fx_to_base: string | number | null;
}

interface FifoLot {
  date: Date;
  qty: number;            // mutable, depleted by sells
  priceLocal: number;
  feePerShareLocal: number;
  fx: number;             // fx_to_base captured at buy time
}

/**
 * Build the realized-gain summary for a portfolio + fiscal year, FIFO-matched.
 */
export async function getCapitalGainsSummary(
  supabase: SupabaseClient,
  portfolioId: string,
  fiscalYear: number,
  residence: TaxResidence,
): Promise<CapitalGainsSummary> {
  const yearStart = `${fiscalYear}-01-01`;
  const yearEnd   = `${fiscalYear}-12-31`;

  const { data: txData } = await supabase
    .from('transactions')
    .select('id, ticker, kind, occurred_on, quantity, price_local, fee_local, fx_to_base')
    .eq('portfolio_id', portfolioId)
    .in('kind', ['buy', 'sell'])
    .order('occurred_on', { ascending: true });

  const txs = (txData ?? []) as TradeRow[];
  if (txs.length === 0) return emptyCapitalGains(residence, fiscalYear);

  // Group by ticker so each ticker has its own FIFO queue.
  const byTicker = new Map<string, TradeRow[]>();
  for (const t of txs) {
    if (!byTicker.has(t.ticker)) byTicker.set(t.ticker, []);
    byTicker.get(t.ticker)!.push(t);
  }

  // Need currency per ticker for the per-sale view.
  const { data: instData } = await supabase
    .from('instruments')
    .select('ticker, currency')
    .in('ticker', Array.from(byTicker.keys()));
  const ccyByTicker = new Map(
    (instData ?? []).map((r) => [r.ticker, r.currency ?? 'EUR']),
  );

  const sales: RealizedSale[] = [];
  let hasUnmatchedSells = false;

  for (const [ticker, rows] of byTicker) {
    const lots: FifoLot[] = [];

    for (const tx of rows) {
      const qty = Number(tx.quantity);
      const price = Number(tx.price_local);
      const fee = Number(tx.fee_local ?? 0);
      const fx = Number(tx.fx_to_base ?? 1);
      const date = new Date(tx.occurred_on);

      if (tx.kind === 'buy') {
        if (qty <= 0) continue;
        lots.push({
          date,
          qty,
          priceLocal: price,
          feePerShareLocal: fee / qty,
          fx,
        });
        continue;
      }

      // Sell — match against FIFO lots regardless of whether the sale is
      // in the requested fiscal year (lots consumed in earlier years can't
      // be re-used for current-year gains).
      let remaining = qty;
      let costLocal = 0;
      let costEur = 0;
      let weightedHoldingDays = 0;
      let matchedQty = 0;

      while (remaining > 1e-9 && lots.length > 0) {
        const lot = lots[0];
        const taken = Math.min(lot.qty, remaining);
        const lotCostPerShareLocal = lot.priceLocal + lot.feePerShareLocal;
        costLocal += taken * lotCostPerShareLocal;
        costEur   += taken * lotCostPerShareLocal * lot.fx;
        weightedHoldingDays += taken * Math.max(0, daysBetween(lot.date, date));
        matchedQty += taken;
        lot.qty -= taken;
        remaining -= taken;
        if (lot.qty <= 1e-9) lots.shift();
      }

      // Un-matched portion: cost basis is 0 (worst case — full proceeds
      // treated as gain). Flag the summary so the UI can warn.
      if (remaining > 1e-9) {
        hasUnmatchedSells = true;
      }

      // Only emit a row when the sale is in the requested fiscal year.
      if (tx.occurred_on < yearStart || tx.occurred_on > yearEnd) continue;

      const proceedsLocal = qty * price - fee;
      const proceedsEur = proceedsLocal * fx;
      const realizedGainEur = proceedsEur - costEur;
      const holdingDays = matchedQty > 0 ? weightedHoldingDays / matchedQty : 0;

      sales.push({
        txId:             tx.id,
        ticker,
        saleDate:         tx.occurred_on,
        currency:         ccyByTicker.get(ticker) ?? 'EUR',
        qty,
        proceedsLocal,
        proceedsEur,
        costBasisLocal:   costLocal,
        costBasisEur:     costEur,
        realizedGainEur,
        holdingDays,
      });
    }
  }

  // Roll up by ticker for the side table.
  const tickerAgg = new Map<string, TickerGainRow>();
  let totalProceeds = 0, totalCost = 0, totalGains = 0, totalLosses = 0;
  for (const s of sales) {
    const existing = tickerAgg.get(s.ticker);
    if (existing) {
      existing.qtySold         += s.qty;
      existing.proceedsEur     += s.proceedsEur;
      existing.costBasisEur    += s.costBasisEur;
      existing.realizedGainEur += s.realizedGainEur;
    } else {
      tickerAgg.set(s.ticker, {
        ticker:           s.ticker,
        qtySold:          s.qty,
        proceedsEur:      s.proceedsEur,
        costBasisEur:     s.costBasisEur,
        realizedGainEur:  s.realizedGainEur,
      });
    }
    totalProceeds += s.proceedsEur;
    totalCost     += s.costBasisEur;
    if (s.realizedGainEur >= 0) totalGains += s.realizedGainEur;
    else totalLosses += -s.realizedGainEur;
  }

  const byTickerSorted = [...tickerAgg.values()].sort(
    (a, b) => Math.abs(b.realizedGainEur) - Math.abs(a.realizedGainEur),
  );
  const salesSorted = [...sales].sort((a, b) => b.saleDate.localeCompare(a.saleDate));

  return {
    residence,
    fiscalYear,
    sales: salesSorted,
    byTicker: byTickerSorted,
    totalProceedsEur:     totalProceeds,
    totalCostBasisEur:    totalCost,
    totalRealizedGainEur: totalGains - totalLosses,
    totalGainsEur:        totalGains,
    totalLossesEur:       totalLosses,
    hasUnmatchedSells,
  };
}

function emptyCapitalGains(residence: TaxResidence, fiscalYear: number): CapitalGainsSummary {
  return {
    residence, fiscalYear,
    sales: [], byTicker: [],
    totalProceedsEur: 0, totalCostBasisEur: 0,
    totalRealizedGainEur: 0, totalGainsEur: 0, totalLossesEur: 0,
    hasUnmatchedSells: false,
  };
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

// ─── Residence-side CGT models ────────────────────────────────────────
//
// Mirrors the dividend `RESIDENCE_MODELS` shape. Most EU jurisdictions
// tax capital gains separately from dividends — same flat rate in some
// (DE/AT/IT use the same rate, but allowances are typically separate
// pools so we treat them independently here), different in others (IE
// 33% CGT vs 40%+USC marginal on dividends; FR 30% PFU on both; BE has
// no general CGT on listed-share gains for private investors).

export type CGTModel =
  | {
      kind: 'flat';
      rate: number;
      allowance?: number;
      allowanceLabel?: string;
      surchargeLabel?: string;
    }
  | {
      kind: 'progressive';
      bands: { upTo: number; rate: number }[];
      allowance?: number;
      allowanceLabel?: string;
    }
  | {
      kind: 'box3';
      // NL: gains on listed shares aren't taxed per-event; the wealth
      // sits inside Box 3. We surface this with a note rather than a number.
    }
  | {
      kind: 'none';
      // BE individual investors on regular share trades; flagged with a note.
      note: string;
    };

export const RESIDENCE_CGT_MODELS: Record<TaxResidence, CGTModel> = {
  IE: { kind: 'flat', rate: 33, allowance: 1270, allowanceLabel: 'Personal CGT exemption' },
  NL: { kind: 'box3' },
  DE: { kind: 'flat', rate: 26.375, allowance: 1000, allowanceLabel: 'Sparer-Pauschbetrag', surchargeLabel: 'incl. Soli' },
  FR: { kind: 'flat', rate: 30, surchargeLabel: 'PFU · 12.8 IT + 17.2 social' },
  ES: { kind: 'progressive', bands: [
    { upTo: 6000,   rate: 19 },
    { upTo: 50000,  rate: 21 },
    { upTo: 200000, rate: 23 },
    { upTo: 300000, rate: 27 },
    { upTo: Infinity, rate: 28 },
  ]},
  IT: { kind: 'flat', rate: 26 },
  BE: { kind: 'none', note: 'Belgium does not tax capital gains on listed shares for individual investors managing private assets.' },
  PT: { kind: 'flat', rate: 28 },
  AT: { kind: 'flat', rate: 27.5, surchargeLabel: 'KESt' },
  GB: { kind: 'flat', rate: 24, allowance: 3000, allowanceLabel: 'Annual exempt amount (£3,000)' },
};

export interface CGTBreakdown {
  model: CGTModel;
  /** Net realized gain before allowance & tax. Equal to summary.totalRealizedGainEur. */
  netGainEur: number;
  /** Allowance applied this year. */
  allowanceUsedEur: number;
  /** Gain after allowance (the part actually subject to tax). */
  taxableGainEur: number;
  /** Estimated CGT owed at residence. */
  taxDueEur: number;
  /** Net the user keeps after CGT: netGainEur − taxDueEur. */
  netAfterTaxEur: number;
  /** Effective CGT rate on the realized gain. */
  effectiveRatePct: number;
  /** Free-text caveat shown in the UI. */
  note?: string;
}

/**
 * Apply the residence-country CGT to a capital-gains summary. Losses
 * (net gain < 0) yield zero tax — loss carry-forward is intentionally
 * out of scope for v1.
 */
export function computeCapitalGainsTax(summary: CapitalGainsSummary): CGTBreakdown {
  const model = RESIDENCE_CGT_MODELS[summary.residence];
  const net = summary.totalRealizedGainEur;

  if (model.kind === 'box3') {
    return {
      model,
      netGainEur:       net,
      allowanceUsedEur: 0,
      taxableGainEur:   0,
      taxDueEur:        0,
      netAfterTaxEur:   net,
      effectiveRatePct: 0,
      note: 'Listed-share gains aren’t taxed per sale in NL — wealth sits in Box 3 alongside dividends.',
    };
  }
  if (model.kind === 'none') {
    return {
      model,
      netGainEur:       net,
      allowanceUsedEur: 0,
      taxableGainEur:   0,
      taxDueEur:        0,
      netAfterTaxEur:   net,
      effectiveRatePct: 0,
      note: model.note,
    };
  }

  if (net <= 0) {
    return {
      model,
      netGainEur:       net,
      allowanceUsedEur: 0,
      taxableGainEur:   0,
      taxDueEur:        0,
      netAfterTaxEur:   net,
      effectiveRatePct: 0,
      note: net < 0 ? 'Net loss for the year — no CGT owed. Loss carry-forward isn’t modelled in this estimate.' : undefined,
    };
  }

  const allowance = model.allowance ?? 0;
  const allowanceUsed = Math.min(allowance, net);
  const taxable = Math.max(0, net - allowanceUsed);
  let tax = 0;

  if (model.kind === 'flat') {
    tax = (taxable * model.rate) / 100;
  } else if (model.kind === 'progressive') {
    let prev = 0;
    let remaining = taxable;
    for (const band of model.bands) {
      const slice = Math.min(band.upTo, remaining + prev) - prev;
      if (slice <= 0) break;
      tax += (slice * band.rate) / 100;
      prev += slice;
      remaining -= slice;
      if (remaining <= 0) break;
    }
  }

  return {
    model,
    netGainEur:       net,
    allowanceUsedEur: allowanceUsed,
    taxableGainEur:   taxable,
    taxDueEur:        tax,
    netAfterTaxEur:   net - tax,
    effectiveRatePct: net > 0 ? (tax / net) * 100 : 0,
  };
}

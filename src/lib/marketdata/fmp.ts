// Financial Modeling Prep — dividend history, fundamentals, payout ratio.
// Free tier: 250 calls/day. Reserve for daily refresh job, not on-demand.
//
// As of Aug 31 2025 the legacy /api/v3 endpoints stopped serving new accounts.
// Use /stable/ with `?symbol=` query params instead.

const BASE_STABLE = 'https://financialmodelingprep.com/stable';

export interface RawDividend {
  ex_date: string;
  pay_date: string | null;
  amount_local: number;
  frequency: string | null;  // raw FMP string, e.g. "Quarterly"
}

/** Map FMP frequency strings to payments-per-year. */
export function frequencyToPerYear(freq: string | null | undefined): number | null {
  if (!freq) return null;
  const f = freq.toLowerCase();
  if (f.includes('monthly')) return 12;
  if (f.includes('quarterly')) return 4;
  if (f.includes('semi')) return 2;
  if (f.includes('annual') || f === 'yearly') return 1;
  return null;
}

interface FmpDividendRow {
  date?: string;            // ex-date
  recordDate?: string;
  paymentDate?: string;
  declarationDate?: string;
  adjDividend?: number;
  dividend?: number;
  frequency?: string;
}

export async function fetchDividendHistory(ticker: string): Promise<RawDividend[]> {
  const key = process.env.FMP_KEY;
  if (!key) throw new Error('FMP_KEY missing');
  const url = `${BASE_STABLE}/dividends?symbol=${encodeURIComponent(ticker)}&apikey=${key}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`fmp dividends ${res.status}`);
  const arr = (await res.json()) as FmpDividendRow[];
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((d) => d.date != null && (d.dividend != null || d.adjDividend != null))
    .map((d) => ({
      ex_date:      d.date!,
      pay_date:     d.paymentDate ?? null,
      amount_local: Number(d.dividend ?? d.adjDividend ?? 0),
      frequency:    d.frequency ?? null,
    }));
}

export interface RawProfile {
  ticker: string;
  name: string | null;
  description: string | null;
  exchange: string | null;
  country: string | null;
  sector: string | null;
  industry: string | null;
  currency: string | null;
  price: number | null;
  /** FMP `lastDividend` — annualized dividend in instrument currency. */
  fwdDivAnnualLocal: number;
  beta: number | null;
}

interface FmpProfileRow {
  symbol: string;
  companyName?: string;
  description?: string;
  exchange?: string;
  exchangeFullName?: string;
  industry?: string;
  sector?: string;
  country?: string;
  currency?: string;
  price?: number;
  lastDividend?: number;
  beta?: number;
}

// Exchange → ISO-2 country fallback when FMP doesn't include `country`.
const EXCHANGE_COUNTRY: Record<string, string> = {
  NYSE: 'US', NASDAQ: 'US', AMEX: 'US', BATS: 'US', OTC: 'US',
  LSE: 'GB', AMS: 'NL', PAR: 'FR', BER: 'DE', ETR: 'DE', XETRA: 'DE',
  MIL: 'IT', SWX: 'CH', STO: 'SE', CPH: 'DK', OSL: 'NO', BRU: 'BE',
  MAD: 'ES', TSX: 'CA', TYO: 'JP', HKG: 'HK', ASX: 'AU',
};

export async function fetchProfile(ticker: string): Promise<RawProfile | null> {
  const key = process.env.FMP_KEY;
  if (!key) throw new Error('FMP_KEY missing');
  const url = `${BASE_STABLE}/profile?symbol=${encodeURIComponent(ticker)}&apikey=${key}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`fmp profile ${res.status}`);
  const arr = (await res.json()) as FmpProfileRow[];
  const p = arr?.[0];
  if (!p) return null;
  const country = p.country ?? (p.exchange ? EXCHANGE_COUNTRY[p.exchange] ?? null : null);
  return {
    ticker:            p.symbol,
    name:              p.companyName ?? null,
    description:       p.description ?? null,
    exchange:          p.exchange ?? null,
    country,
    sector:            p.sector ?? null,
    industry:          p.industry ?? null,
    currency:          p.currency ?? null,
    price:             p.price != null ? Number(p.price) : null,
    fwdDivAnnualLocal: p.lastDividend != null ? Number(p.lastDividend) : 0,
    beta:              p.beta != null ? Number(p.beta) : null,
  };
}

/**
 * Infer payments-per-year from a profile when /stable/dividends is blocked.
 * Falls back to Quarterly (the most common cadence) when no signal is found.
 */
export function inferPayoutFreq(profile: { description: string | null; industry: string | null }): number {
  const text = `${profile.industry ?? ''} ${profile.description ?? ''}`.toLowerCase();
  if (text.includes('monthly dividend') || /\bmonthly\b/.test(text)) return 12;
  if (text.includes('semi-annual') || text.includes('semiannual')) return 2;
  if (text.includes('annual dividend')) return 1;
  // Quarterly is the modal US dividend cadence — safe default.
  return 4;
}

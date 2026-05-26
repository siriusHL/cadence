// Per-year tax-export builders.
//
// Two CSVs are produced — one for dividend income, one for realized
// capital gains. Each maps onto its own tax form, which is why we don't
// merge them: cost basis is meaningless on a dividend row and dividend
// withholding is meaningless on a sale row.
//
// CSVs are emitted with a UTF-8 BOM so Excel opens them with the right
// codepage on Windows (otherwise é, £, € render as mojibake).

import Papa from 'papaparse';
import { type SupabaseClient } from '@supabase/supabase-js';
import {
  getCapitalGainsSummary,
  COUNTRY_NAMES,
  type TaxResidence,
} from '@/lib/tax';

const UTF8_BOM = '﻿';

/** Distinct fiscal years where the portfolio had dividend or sell activity. */
export async function getActivityYears(
  supabase: SupabaseClient,
  portfolioId: string,
): Promise<{ year: number; hasDividends: boolean; hasSales: boolean }[]> {
  const { data } = await supabase
    .from('transactions')
    .select('kind, occurred_on')
    .eq('portfolio_id', portfolioId)
    .in('kind', ['dividend', 'sell']);

  const byYear = new Map<number, { hasDividends: boolean; hasSales: boolean }>();
  for (const row of data ?? []) {
    const year = Number((row.occurred_on as string).slice(0, 4));
    if (!Number.isFinite(year)) continue;
    const slot = byYear.get(year) ?? { hasDividends: false, hasSales: false };
    if (row.kind === 'dividend') slot.hasDividends = true;
    if (row.kind === 'sell')     slot.hasSales = true;
    byYear.set(year, slot);
  }

  return [...byYear.entries()]
    .map(([year, flags]) => ({ year, ...flags }))
    .sort((a, b) => b.year - a.year);  // newest first
}

interface DivExportRow {
  ticker: string;
  name?: string | null;
  country?: string | null;
  currency?: string | null;
  occurred_on: string;
  quantity: number;
  price_local: number;
  withholding_local: number;
  fx_to_base: number;
}

/**
 * Build the dividends CSV for a fiscal year. Pulls every `kind='dividend'`
 * row in the year, joins instrument metadata, and emits one CSV line per
 * payment with local + EUR columns alongside the source country.
 */
export async function buildDividendsCsv(
  supabase: SupabaseClient,
  portfolioId: string,
  fiscalYear: number,
): Promise<string> {
  const yearStart = `${fiscalYear}-01-01`;
  const yearEnd   = `${fiscalYear}-12-31`;

  const { data } = await supabase
    .from('transactions')
    .select('ticker, occurred_on, quantity, price_local, withholding_local, fx_to_base')
    .eq('portfolio_id', portfolioId)
    .eq('kind', 'dividend')
    .gte('occurred_on', yearStart)
    .lte('occurred_on', yearEnd)
    .order('occurred_on', { ascending: true });

  const rows = (data ?? []) as DivExportRow[];
  if (rows.length === 0) return UTF8_BOM + Papa.unparse([], { columns: divColumns() });

  const tickers = Array.from(new Set(rows.map((r) => r.ticker)));
  const { data: instData } = await supabase
    .from('instruments')
    .select('ticker, name, country, currency')
    .in('ticker', tickers);
  const instByT = new Map((instData ?? []).map((r) => [r.ticker, r]));

  const records = rows.map((r) => {
    const inst = instByT.get(r.ticker);
    const country = inst?.country ?? '';
    const grossLocal = Number(r.quantity) * Number(r.price_local);
    const withheldLocal = Number(r.withholding_local ?? 0);
    const netLocal = grossLocal - withheldLocal;
    const fx = Number(r.fx_to_base ?? 1);
    return {
      'Date':              r.occurred_on,
      'Ticker':            r.ticker,
      'Name':              inst?.name ?? '',
      'Country':           country,
      'Country name':      country ? (COUNTRY_NAMES[country] ?? country) : '',
      'Currency':          inst?.currency ?? '',
      'Shares held':       fmt(Number(r.quantity), 4),
      'Dividend per share (local)': fmt(Number(r.price_local), 6),
      'Gross (local)':     fmt(grossLocal, 2),
      'Withholding (local)': fmt(withheldLocal, 2),
      'Net (local)':       fmt(netLocal, 2),
      'FX to EUR':         fmt(fx, 6),
      'Gross (EUR)':       fmt(grossLocal * fx, 2),
      'Withholding (EUR)': fmt(withheldLocal * fx, 2),
      'Net (EUR)':         fmt(netLocal * fx, 2),
    } as const;
  });

  return UTF8_BOM + Papa.unparse(records, { columns: divColumns() });
}

function divColumns(): string[] {
  return [
    'Date', 'Ticker', 'Name', 'Country', 'Country name', 'Currency',
    'Shares held', 'Dividend per share (local)',
    'Gross (local)', 'Withholding (local)', 'Net (local)',
    'FX to EUR',
    'Gross (EUR)', 'Withholding (EUR)', 'Net (EUR)',
  ];
}

/**
 * Build the capital-gains CSV for a fiscal year. Reuses
 * `getCapitalGainsSummary` so the same FIFO walk that powers the Tax
 * page populates the export — gains line up with what's shown on screen.
 */
export async function buildCapitalGainsCsv(
  supabase: SupabaseClient,
  portfolioId: string,
  fiscalYear: number,
  residence: TaxResidence,
): Promise<string> {
  const summary = await getCapitalGainsSummary(supabase, portfolioId, fiscalYear, residence);

  // Name lookup for the optional "Name" column.
  const tickers = Array.from(new Set(summary.sales.map((s) => s.ticker)));
  let nameByT = new Map<string, string>();
  if (tickers.length > 0) {
    const { data: instData } = await supabase
      .from('instruments')
      .select('ticker, name')
      .in('ticker', tickers);
    nameByT = new Map((instData ?? []).map((r) => [r.ticker as string, r.name as string]));
  }

  const records = summary.sales
    .slice()
    .sort((a, b) => a.saleDate.localeCompare(b.saleDate))
    .map((s) => ({
      'Sale date':              s.saleDate,
      'Ticker':                 s.ticker,
      'Name':                   nameByT.get(s.ticker) ?? '',
      'Currency':               s.currency,
      'Shares sold':            fmt(s.qty, 4),
      'Proceeds (local)':       fmt(s.proceedsLocal, 2),
      'Cost basis (local, FIFO)': fmt(s.costBasisLocal, 2),
      'Proceeds (EUR)':         fmt(s.proceedsEur, 2),
      'Cost basis (EUR, FIFO)': fmt(s.costBasisEur, 2),
      'Realized gain/loss (EUR)': fmt(s.realizedGainEur, 2),
      'Holding period (days)':  fmt(s.holdingDays, 0),
    } as const));

  return UTF8_BOM + Papa.unparse(records, { columns: cgtColumns() });
}

function cgtColumns(): string[] {
  return [
    'Sale date', 'Ticker', 'Name', 'Currency',
    'Shares sold',
    'Proceeds (local)', 'Cost basis (local, FIFO)',
    'Proceeds (EUR)',   'Cost basis (EUR, FIFO)',
    'Realized gain/loss (EUR)',
    'Holding period (days)',
  ];
}

/** Returns a Response with the right headers for a CSV file download. */
export function csvResponse(body: string, filename: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type':        'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control':       'private, no-store',
    },
  });
}

/** Avoid the scientific-notation surprise on large values when CSVs land in Excel. */
function fmt(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return '';
  return n.toFixed(decimals);
}

// Per-year tax-export builders.
//
// Two output formats:
//   - CSV (one file per stream — dividends / capital gains).
//   - XLSX workbook (one file with both sheets) for the year-end tax pack.
//
// Both share the same row-building logic — see fetchDividendRows /
// fetchCapitalGainsRows. The CSV path formats numbers to fixed decimals
// so columns look tidy on tax forms; the XLSX path leaves numbers raw so
// Excel users can SUM / filter / re-format them in-cell.
//
// CSVs include a UTF-8 BOM so Excel on Windows opens them with the right
// codepage (otherwise é, £, € render as mojibake).

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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

// ─── Row shapes (raw numbers, no formatting) ──────────────────────────

interface DividendRow {
  date: string;
  ticker: string;
  name: string;
  country: string;
  countryName: string;
  currency: string;
  sharesHeld: number;
  divPerShareLocal: number;
  grossLocal: number;
  withholdingLocal: number;
  netLocal: number;
  fxToEur: number;
  grossEur: number;
  withholdingEur: number;
  netEur: number;
}

interface CapitalGainsRow {
  saleDate: string;
  ticker: string;
  name: string;
  currency: string;
  sharesSold: number;
  proceedsLocal: number;
  costBasisLocal: number;
  proceedsEur: number;
  costBasisEur: number;
  realizedGainEur: number;
  holdingDays: number;
}

interface DivExportSourceRow {
  ticker: string;
  occurred_on: string;
  quantity: number;
  price_local: number;
  withholding_local: number;
  fx_to_base: number;
}

async function fetchDividendRows(
  supabase: SupabaseClient,
  portfolioId: string,
  fiscalYear: number,
): Promise<DividendRow[]> {
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

  const rows = (data ?? []) as unknown as DivExportSourceRow[];
  if (rows.length === 0) return [];

  const tickers = Array.from(new Set(rows.map((r) => r.ticker)));
  const { data: instData } = await supabase
    .from('instruments')
    .select('ticker, name, country, currency')
    .in('ticker', tickers);
  const instByT = new Map((instData ?? []).map((r) => [r.ticker, r]));

  return rows.map((r) => {
    const inst = instByT.get(r.ticker);
    const country = inst?.country ?? '';
    const sharesHeld = Number(r.quantity);
    const divPerShare = Number(r.price_local);
    const grossLocal = sharesHeld * divPerShare;
    const withholdingLocal = Number(r.withholding_local ?? 0);
    const netLocal = grossLocal - withholdingLocal;
    const fx = Number(r.fx_to_base ?? 1);
    return {
      date:              r.occurred_on,
      ticker:            r.ticker,
      name:              (inst?.name as string | null) ?? '',
      country,
      countryName:       country ? (COUNTRY_NAMES[country] ?? country) : '',
      currency:          (inst?.currency as string | null) ?? '',
      sharesHeld,
      divPerShareLocal:  divPerShare,
      grossLocal,
      withholdingLocal,
      netLocal,
      fxToEur:           fx,
      grossEur:          grossLocal * fx,
      withholdingEur:    withholdingLocal * fx,
      netEur:            netLocal * fx,
    };
  });
}

async function fetchCapitalGainsRows(
  supabase: SupabaseClient,
  portfolioId: string,
  fiscalYear: number,
  residence: TaxResidence,
): Promise<CapitalGainsRow[]> {
  const summary = await getCapitalGainsSummary(supabase, portfolioId, fiscalYear, residence);

  const tickers = Array.from(new Set(summary.sales.map((s) => s.ticker)));
  let nameByT = new Map<string, string>();
  if (tickers.length > 0) {
    const { data: instData } = await supabase
      .from('instruments')
      .select('ticker, name')
      .in('ticker', tickers);
    nameByT = new Map((instData ?? []).map((r) => [r.ticker as string, r.name as string]));
  }

  return summary.sales
    .slice()
    .sort((a, b) => a.saleDate.localeCompare(b.saleDate))
    .map((s) => ({
      saleDate:        s.saleDate,
      ticker:          s.ticker,
      name:            nameByT.get(s.ticker) ?? '',
      currency:        s.currency,
      sharesSold:      s.qty,
      proceedsLocal:   s.proceedsLocal,
      costBasisLocal:  s.costBasisLocal,
      proceedsEur:     s.proceedsEur,
      costBasisEur:    s.costBasisEur,
      realizedGainEur: s.realizedGainEur,
      holdingDays:     s.holdingDays,
    }));
}

// ─── CSV builders ──────────────────────────────────────────────────────

const DIV_CSV_COLUMNS = [
  'Date', 'Ticker', 'Name', 'Country', 'Country name', 'Currency',
  'Shares held', 'Dividend per share (local)',
  'Gross (local)', 'Withholding (local)', 'Net (local)',
  'FX to EUR',
  'Gross (EUR)', 'Withholding (EUR)', 'Net (EUR)',
];

const CGT_CSV_COLUMNS = [
  'Sale date', 'Ticker', 'Name', 'Currency',
  'Shares sold',
  'Proceeds (local)', 'Cost basis (local, FIFO)',
  'Proceeds (EUR)',   'Cost basis (EUR, FIFO)',
  'Realized gain/loss (EUR)',
  'Holding period (days)',
];

export async function buildDividendsCsv(
  supabase: SupabaseClient,
  portfolioId: string,
  fiscalYear: number,
): Promise<string> {
  const rows = await fetchDividendRows(supabase, portfolioId, fiscalYear);
  const records = rows.map((r) => ({
    'Date':                       r.date,
    'Ticker':                     r.ticker,
    'Name':                       r.name,
    'Country':                    r.country,
    'Country name':               r.countryName,
    'Currency':                   r.currency,
    'Shares held':                fmt(r.sharesHeld, 4),
    'Dividend per share (local)': fmt(r.divPerShareLocal, 6),
    'Gross (local)':              fmt(r.grossLocal, 2),
    'Withholding (local)':        fmt(r.withholdingLocal, 2),
    'Net (local)':                fmt(r.netLocal, 2),
    'FX to EUR':                  fmt(r.fxToEur, 6),
    'Gross (EUR)':                fmt(r.grossEur, 2),
    'Withholding (EUR)':          fmt(r.withholdingEur, 2),
    'Net (EUR)':                  fmt(r.netEur, 2),
  }));
  return UTF8_BOM + Papa.unparse(records, { columns: DIV_CSV_COLUMNS });
}

export async function buildCapitalGainsCsv(
  supabase: SupabaseClient,
  portfolioId: string,
  fiscalYear: number,
  residence: TaxResidence,
): Promise<string> {
  const rows = await fetchCapitalGainsRows(supabase, portfolioId, fiscalYear, residence);
  const records = rows.map((r) => ({
    'Sale date':                r.saleDate,
    'Ticker':                   r.ticker,
    'Name':                     r.name,
    'Currency':                 r.currency,
    'Shares sold':              fmt(r.sharesSold, 4),
    'Proceeds (local)':         fmt(r.proceedsLocal, 2),
    'Cost basis (local, FIFO)': fmt(r.costBasisLocal, 2),
    'Proceeds (EUR)':           fmt(r.proceedsEur, 2),
    'Cost basis (EUR, FIFO)':   fmt(r.costBasisEur, 2),
    'Realized gain/loss (EUR)': fmt(r.realizedGainEur, 2),
    'Holding period (days)':    fmt(r.holdingDays, 0),
  }));
  return UTF8_BOM + Papa.unparse(records, { columns: CGT_CSV_COLUMNS });
}

// ─── XLSX builder (two-sheet workbook per year) ────────────────────────

/**
 * Build the "tax pack" workbook for a fiscal year — one .xlsx with two
 * sheets ("Dividends" and "Capital gains"). Numbers are emitted raw so
 * Excel treats them as numeric values (SUM / filter / chart all work);
 * column widths are pre-sized so the sheet opens readable without
 * tweaking. Both sheets are always present, even if empty, so a multi-
 * year archive has a consistent shape.
 */
export async function buildTaxPackXlsx(
  supabase: SupabaseClient,
  portfolioId: string,
  fiscalYear: number,
  residence: TaxResidence,
): Promise<Buffer> {
  const [divRows, gainRows] = await Promise.all([
    fetchDividendRows(supabase, portfolioId, fiscalYear),
    fetchCapitalGainsRows(supabase, portfolioId, fiscalYear, residence),
  ]);

  const wb = XLSX.utils.book_new();

  // Dividends sheet
  const divRecords = divRows.map((r) => ({
    'Date':                       r.date,
    'Ticker':                     r.ticker,
    'Name':                       r.name,
    'Country':                    r.country,
    'Country name':               r.countryName,
    'Currency':                   r.currency,
    'Shares held':                r.sharesHeld,
    'Dividend per share (local)': r.divPerShareLocal,
    'Gross (local)':              r.grossLocal,
    'Withholding (local)':        r.withholdingLocal,
    'Net (local)':                r.netLocal,
    'FX to EUR':                  r.fxToEur,
    'Gross (EUR)':                r.grossEur,
    'Withholding (EUR)':          r.withholdingEur,
    'Net (EUR)':                  r.netEur,
  }));
  const divSheet = XLSX.utils.json_to_sheet(divRecords, { header: DIV_CSV_COLUMNS });
  divSheet['!cols'] = divColWidths();
  XLSX.utils.book_append_sheet(wb, divSheet, 'Dividends');

  // Capital gains sheet
  const gainRecords = gainRows.map((r) => ({
    'Sale date':                r.saleDate,
    'Ticker':                   r.ticker,
    'Name':                     r.name,
    'Currency':                 r.currency,
    'Shares sold':              r.sharesSold,
    'Proceeds (local)':         r.proceedsLocal,
    'Cost basis (local, FIFO)': r.costBasisLocal,
    'Proceeds (EUR)':           r.proceedsEur,
    'Cost basis (EUR, FIFO)':   r.costBasisEur,
    'Realized gain/loss (EUR)': r.realizedGainEur,
    'Holding period (days)':    r.holdingDays,
  }));
  const gainSheet = XLSX.utils.json_to_sheet(gainRecords, { header: CGT_CSV_COLUMNS });
  gainSheet['!cols'] = cgtColWidths();
  XLSX.utils.book_append_sheet(wb, gainSheet, 'Capital gains');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Column widths roughly sized to header text + typical value length so
// the workbook opens with all columns readable. SheetJS uses "wch"
// (character widths).
function divColWidths(): { wch: number }[] {
  return [
    { wch: 12 }, // Date
    { wch: 10 }, // Ticker
    { wch: 24 }, // Name
    { wch: 9 },  // Country
    { wch: 16 }, // Country name
    { wch: 10 }, // Currency
    { wch: 12 }, // Shares held
    { wch: 24 }, // Dividend per share (local)
    { wch: 14 }, // Gross (local)
    { wch: 20 }, // Withholding (local)
    { wch: 14 }, // Net (local)
    { wch: 11 }, // FX to EUR
    { wch: 14 }, // Gross (EUR)
    { wch: 20 }, // Withholding (EUR)
    { wch: 14 }, // Net (EUR)
  ];
}

function cgtColWidths(): { wch: number }[] {
  return [
    { wch: 12 }, // Sale date
    { wch: 10 }, // Ticker
    { wch: 24 }, // Name
    { wch: 10 }, // Currency
    { wch: 12 }, // Shares sold
    { wch: 16 }, // Proceeds (local)
    { wch: 22 }, // Cost basis (local, FIFO)
    { wch: 16 }, // Proceeds (EUR)
    { wch: 22 }, // Cost basis (EUR, FIFO)
    { wch: 22 }, // Realized gain/loss (EUR)
    { wch: 18 }, // Holding period (days)
  ];
}

// ─── Response helpers ──────────────────────────────────────────────────

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

/** Returns a Response with the right headers for an XLSX workbook. */
export function xlsxResponse(body: Buffer, filename: string): Response {
  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      'content-type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control':       'private, no-store',
    },
  });
}

/** Format a number with fixed decimals for CSV output. */
function fmt(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return '';
  return n.toFixed(decimals);
}

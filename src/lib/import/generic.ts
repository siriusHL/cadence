// Generic CSV mapper — the user explicitly maps which header is which.
// Used as the "Other broker" fallback when none of the built-in parsers
// recognise the file, or when the user wants to import an export that
// doesn't match any baked-in format.

import type { ImportKind, ImportedRow, ParseResult } from './types';
import { parseNumber, parseDate } from './numbers';

export type KindMapping =
  | { type: 'fixed';  value: ImportKind }
  | { type: 'column'; header: string };

export interface GenericMapping {
  date:     string;
  ticker?:  string;
  isin?:    string;
  kind:     KindMapping;
  quantity: string;
  price:    string;
  currency?: string;
  fee?:     string;
}

const KIND_ALIASES: Record<string, ImportKind> = {
  buy:        'buy',
  purchase:   'buy',
  long:       'buy',
  'market buy': 'buy',
  sell:       'sell',
  sale:       'sell',
  short:      'sell',
  'market sell': 'sell',
  dividend:   'dividend',
  div:        'dividend',
  distribution: 'dividend',
};

function aliasToKind(raw: string): ImportKind | null {
  const v = raw.toLowerCase().trim();
  if (v in KIND_ALIASES) return KIND_ALIASES[v];
  for (const key of Object.keys(KIND_ALIASES)) {
    if (v.includes(key)) return KIND_ALIASES[key];
  }
  return null;
}

export function genericParse(
  rows: Record<string, string>[],
  mapping: GenericMapping,
): ParseResult {
  const out: ImportedRow[] = [];
  const skipped: ParseResult['skipped'] = [];

  rows.forEach((row, idx) => {
    // Resolve kind.
    let kind: ImportKind;
    if (mapping.kind.type === 'fixed') {
      kind = mapping.kind.value;
    } else {
      const raw = row[mapping.kind.header] ?? '';
      const resolved = aliasToKind(raw);
      if (!resolved) {
        skipped.push({ lineNumber: idx + 2, reason: `Couldn't read kind "${raw}"` });
        return;
      }
      kind = resolved;
    }

    const qty = parseNumber(row[mapping.quantity]);
    const price = parseNumber(row[mapping.price]);
    const date = parseDate(row[mapping.date]);
    if (!date || !Number.isFinite(qty) || qty === 0 || !Number.isFinite(price)) {
      skipped.push({ lineNumber: idx + 2, reason: 'Could not parse date/quantity/price' });
      return;
    }

    const fee = mapping.fee
      ? Math.abs(parseNumber(row[mapping.fee] ?? '0')) || 0
      : 0;
    const currency = mapping.currency
      ? ((row[mapping.currency] ?? 'EUR').toUpperCase() || 'EUR')
      : 'EUR';
    const ticker = mapping.ticker ? (row[mapping.ticker] ?? '').trim().toUpperCase() : '';
    const isin = mapping.isin ? (row[mapping.isin] ?? '').trim() : '';

    out.push({
      uid: `gen-${idx}`,
      kind,
      occurredOn: date,
      ticker,
      isin: isin || undefined,
      quantity: Math.abs(qty),
      priceLocal: price,
      currency,
      feeLocal: fee,
      fxToBase: 1,
      warning: ticker ? undefined : 'No ticker mapped — fill in the preview row.',
    });
  });

  return { broker: 'other', rows: out, skipped };
}

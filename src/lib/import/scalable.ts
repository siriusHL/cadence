// Scalable Capital — broker statement CSV (Broker → Transactions → Export).
//
// Headers (subset):
//   Date, Time, Status, Reference, Description, Asset, ISIN, Type,
//   Shares, Price, Amount, Fee, Tax, Total, Currency
//
// Type values: "Buy", "Sell", "Distribution" (dividend),
// "Saveback" (Premium cashback reinvested, mapped to buy), "Deposit",
// "Withdrawal", "Interest", "Fee".

import type { BrokerParser, ImportKind, ImportedRow, ParseResult } from './types';
import { parseNumber, parseDate, getCell } from './numbers';

function looksLikeScalable(headers: string[]): boolean {
  const h = headers.map((x) => x.toLowerCase());
  return h.includes('isin') && h.includes('type')
      && (h.includes('shares') || h.includes('quantity'))
      && h.includes('price') && h.includes('asset');
}

const TYPE_MAP: Record<string, ImportKind | null> = {
  buy:          'buy',
  saveback:     'buy',
  sell:         'sell',
  distribution: 'dividend',
  dividend:     'dividend',
};

export const scalableParser: BrokerParser = {
  id: 'scalable',
  detect: looksLikeScalable,
  parse: (rows): ParseResult => {
    const out: ImportedRow[] = [];
    const skipped: ParseResult['skipped'] = [];

    rows.forEach((row, idx) => {
      const typeRaw = (getCell(row, 'Type') ?? '').toLowerCase().trim();
      const kind = TYPE_MAP[typeRaw];
      if (!kind) {
        skipped.push({ lineNumber: idx + 2, reason: `Unhandled type "${typeRaw}"` });
        return;
      }

      const qty = parseNumber(getCell(row, 'Shares', 'Quantity') ?? '');
      const price = parseNumber(getCell(row, 'Price') ?? '');
      const date = parseDate(getCell(row, 'Date') ?? '');
      if (!date || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price)) {
        skipped.push({ lineNumber: idx + 2, reason: 'Could not parse numbers' });
        return;
      }

      const fee = Math.abs(parseNumber(getCell(row, 'Fee', 'Fees') ?? '0')) || 0;
      const currency = (getCell(row, 'Currency') ?? 'EUR').toUpperCase();
      const isin = (getCell(row, 'ISIN') ?? '').trim();
      const name = (getCell(row, 'Asset', 'Description') ?? '').trim();

      out.push({
        uid: `scal-${idx}`,
        kind,
        occurredOn: date,
        ticker: '',
        isin: isin || undefined,
        name: name || undefined,
        quantity: qty,
        priceLocal: price,
        currency,
        feeLocal: fee,
        fxToBase: 1,
        warning: "Scalable Capital doesn't include a ticker — pick one in the preview row.",
      });
    });

    return { broker: 'scalable', rows: out, skipped };
  },
};

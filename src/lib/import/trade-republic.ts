// Trade Republic — transaction export (Settings → Reports → Account statement).
//
// Two formats are floating around in the wild; we support the modern CSV with
// these key columns:
//   Date, Type, Asset/Name, ISIN, Quantity, Price, Amount, Currency, Fee
//
// "Type" values relevant to imports: Purchase / Sale / Dividend / Saveback.

import type { BrokerParser, ImportedRow, ImportKind, ParseResult } from './types';
import { parseNumber, parseDate, getCell } from './numbers';

function looksLikeTradeRepublic(headers: string[]): boolean {
  const h = headers.map((x) => x.toLowerCase());
  return h.includes('isin') && h.includes('type')
      && (h.includes('quantity') || h.includes('shares'))
      && (h.includes('asset') || h.includes('name') || h.includes('instrument'));
}

const KIND_BY_TYPE: Record<string, ImportKind | null> = {
  purchase:  'buy',
  buy:       'buy',
  saveback:  'buy',
  trade:     'buy',
  sale:      'sell',
  sell:      'sell',
  dividend:  'dividend',
};

export const tradeRepublicParser: BrokerParser = {
  id: 'trade-republic',
  detect: looksLikeTradeRepublic,
  parse: (rows): ParseResult => {
    const out: ImportedRow[] = [];
    const skipped: ParseResult['skipped'] = [];

    rows.forEach((row, idx) => {
      const typeRaw = (getCell(row, 'Type') ?? '').toLowerCase().trim();
      const kind = KIND_BY_TYPE[typeRaw];
      if (!kind) {
        skipped.push({ lineNumber: idx + 2, reason: `Unhandled type "${typeRaw || '?'}"` });
        return;
      }

      const dateRaw = getCell(row, 'Date');
      const qtyRaw = getCell(row, 'Quantity', 'Shares');
      const priceRaw = getCell(row, 'Price', 'Share Price');
      if (!dateRaw || !qtyRaw || !priceRaw) {
        skipped.push({ lineNumber: idx + 2, reason: 'Missing date/quantity/price' });
        return;
      }

      const qty = parseNumber(qtyRaw);
      const price = parseNumber(priceRaw);
      const date = parseDate(dateRaw);
      if (!date || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price)) {
        skipped.push({ lineNumber: idx + 2, reason: 'Could not parse numbers' });
        return;
      }

      const fee = Math.abs(parseNumber(getCell(row, 'Fee', 'Fees', 'Commission') ?? '0')) || 0;
      const currency = (getCell(row, 'Currency') ?? 'EUR').toUpperCase();
      const isin = (getCell(row, 'ISIN') ?? '').trim();
      const name = (getCell(row, 'Asset', 'Name', 'Instrument') ?? '').trim();

      out.push({
        uid: `tr-${idx}`,
        kind,
        occurredOn: date,
        ticker: '',  // Trade Republic exports don't include a ticker — set in preview.
        isin: isin || undefined,
        name: name || undefined,
        quantity: qty,
        priceLocal: price,
        currency,
        feeLocal: fee,
        fxToBase: 1,
        warning: "Trade Republic doesn't include a ticker — pick one in the preview row.",
      });
    });

    return { broker: 'trade-republic', rows: out, skipped };
  },
};

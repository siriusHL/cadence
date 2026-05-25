// DEGIRO — "Transactions.csv" export from My Account → Activity → Export.
//
// Typical English header (some columns vary by locale):
//   Date, Time, Product, ISIN, Reference, Venue, Quantity, Price, Local value,
//   Value, Exchange rate, Transaction and/or third party costs, Total
//
// DEGIRO splits a single trade into multiple lines (buy + fee + currency
// conversion) — we only keep rows that have both Quantity and Price set,
// which excludes the FX/cash legs.

import type { BrokerParser, ImportedRow, ParseResult } from './types';
import { parseNumber, parseDate, getCell } from './numbers';

function looksLikeDegiro(headers: string[]): boolean {
  const h = headers.map((x) => x.toLowerCase());
  return h.includes('product') && h.includes('isin') && h.includes('quantity')
      && (h.includes('price') || h.includes('local value'));
}

export const degiroParser: BrokerParser = {
  id: 'degiro',
  detect: looksLikeDegiro,
  parse: (rows): ParseResult => {
    const out: ImportedRow[] = [];
    const skipped: ParseResult['skipped'] = [];

    rows.forEach((row, idx) => {
      const qtyRaw = getCell(row, 'Quantity');
      const priceRaw = getCell(row, 'Price');
      const dateRaw = getCell(row, 'Date');
      if (!qtyRaw || !priceRaw || !dateRaw) {
        skipped.push({ lineNumber: idx + 2, reason: 'Missing date/quantity/price' });
        return;
      }

      const qty = parseNumber(qtyRaw);
      const price = parseNumber(priceRaw);
      const date = parseDate(dateRaw);
      if (!date || !Number.isFinite(qty) || qty === 0 || !Number.isFinite(price)) {
        skipped.push({ lineNumber: idx + 2, reason: 'Could not parse numbers' });
        return;
      }

      const kind = qty > 0 ? 'buy' : 'sell';
      const fee = Math.abs(parseNumber(
        getCell(row, 'Transaction and/or third party costs', 'Costs', 'Fees') ?? '0',
      )) || 0;
      const currency = (getCell(row, 'Currency') ?? '').toUpperCase()
        || (getCell(row, 'Price (currency)') ?? '').toUpperCase()
        || 'EUR';
      const fxRaw = parseNumber(getCell(row, 'Exchange rate') ?? '');
      const fxToBase = Number.isFinite(fxRaw) && fxRaw > 0 ? fxRaw : 1;

      const isin = (getCell(row, 'ISIN') ?? '').trim();
      const product = (getCell(row, 'Product') ?? '').trim();
      const ticker = inferTickerFromProduct(product);

      out.push({
        uid: `degiro-${idx}`,
        kind,
        occurredOn: date,
        ticker,
        isin: isin || undefined,
        name: product || undefined,
        quantity: Math.abs(qty),
        priceLocal: price,
        currency,
        feeLocal: fee,
        fxToBase,
        warning: ticker ? undefined
          : "DEGIRO didn't include a ticker — pick one in the preview row.",
      });
    });

    return { broker: 'degiro', rows: out, skipped };
  },
};

// DEGIRO product names are like "APPLE INC. - COMMON STOCK" or "ASML
// HOLDING NV". There's no reliable ticker in the row, so we leave it
// blank when the heuristic fails; the user fills it in on the preview.
function inferTickerFromProduct(product: string): string {
  const match = product.match(/\b([A-Z]{1,5})\b/);
  return match ? match[1] : '';
}

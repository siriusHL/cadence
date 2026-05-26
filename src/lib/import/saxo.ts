// Saxo Bank — Trade History CSV (Account → Reports → Trades → Export).
//
// Headers (subset):
//   Booking Date, Trade Date, Account, Trade Type, Instrument, Symbol,
//   Description, ISIN, BS Indicator, Amount, Currency, Price,
//   Currency Conversion Rate, Commission
//
// BS Indicator is "Buy" or "Sell". Saxo also exports dividends in a
// separate "Cash Movements" report — not supported in this parser.

import type { BrokerParser, ImportKind, ImportedRow, ParseResult } from './types';
import { parseNumber, parseDate, getCell } from './numbers';

function looksLikeSaxo(headers: string[]): boolean {
  const h = headers.map((x) => x.toLowerCase());
  return h.includes('instrument') && h.includes('isin')
      && (h.includes('bs indicator') || h.includes('buy/sell'))
      && h.includes('price');
}

function kindFromBs(bs: string): ImportKind | null {
  const v = bs.toLowerCase().trim();
  if (v === 'buy' || v === 'b') return 'buy';
  if (v === 'sell' || v === 's') return 'sell';
  return null;
}

export const saxoParser: BrokerParser = {
  id: 'saxo',
  detect: looksLikeSaxo,
  parse: (rows): ParseResult => {
    const out: ImportedRow[] = [];
    const skipped: ParseResult['skipped'] = [];

    rows.forEach((row, idx) => {
      const bs = getCell(row, 'BS Indicator', 'Buy/Sell') ?? '';
      const kind = kindFromBs(bs);
      if (!kind) {
        skipped.push({ lineNumber: idx + 2, reason: `Unhandled BS indicator "${bs}"` });
        return;
      }

      const qty = parseNumber(getCell(row, 'Amount', 'Quantity') ?? '');
      const price = parseNumber(getCell(row, 'Price') ?? '');
      const date = parseDate(getCell(row, 'Trade Date', 'Booking Date', 'Date') ?? '');
      if (!date || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price)) {
        skipped.push({ lineNumber: idx + 2, reason: 'Could not parse numbers' });
        return;
      }

      const fee = Math.abs(parseNumber(getCell(row, 'Commission', 'Fees') ?? '0')) || 0;
      const currency = (getCell(row, 'Currency') ?? 'EUR').toUpperCase();
      const fxRaw = parseNumber(getCell(row, 'Currency Conversion Rate') ?? '');
      const fxToBase = Number.isFinite(fxRaw) && fxRaw > 0 ? fxRaw : 1;
      const ticker = (getCell(row, 'Symbol') ?? '').trim().toUpperCase();
      const isin = (getCell(row, 'ISIN') ?? '').trim();
      const description = (getCell(row, 'Description', 'Instrument') ?? '').trim();

      out.push({
        uid: `saxo-${idx}`,
        kind,
        occurredOn: date,
        ticker,
        isin: isin || undefined,
        name: description || undefined,
        quantity: qty,
        priceLocal: price,
        currency,
        feeLocal: fee,
        fxToBase,
        warning: ticker ? undefined : 'Saxo Symbol column was empty — pick a ticker in the preview row.',
      });
    });

    return { broker: 'saxo', rows: out, skipped };
  },
};

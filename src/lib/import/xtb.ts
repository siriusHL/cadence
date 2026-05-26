// XTB — xStation 5 → Account History → CSV.
//
// Two layouts are common; we detect either:
//
//   Cash Operations:
//     Type, Time, Symbol, Comment, Amount, Balance
//
//   Closed Positions:
//     Position, Symbol, Type (BUY/SELL), Volume, Open time, Open price,
//     Close time, Close price, Commission, Swap, Profit
//
// Cash Operations is the more useful trade feed — each filled order
// shows as a row whose Type is "Stocks/ETF - Open Position" /
// "...Close Position" or "Free Funds - Dividend".

import type { BrokerParser, ImportKind, ImportedRow, ParseResult } from './types';
import { parseNumber, parseDate, getCell } from './numbers';

function looksLikeXtb(headers: string[]): boolean {
  const h = headers.map((x) => x.toLowerCase());
  const hasSymbol = h.includes('symbol');
  return hasSymbol && (
    (h.includes('type') && h.includes('amount') && h.includes('time')) ||
    (h.includes('open price') && (h.includes('volume') || h.includes('size')))
  );
}

function kindFromXtbType(typeStr: string): ImportKind | null {
  const t = typeStr.toLowerCase();
  if (t.includes('dividend'))      return 'dividend';
  if (t.includes('open position')) return 'buy';
  if (t.includes('buy'))           return 'buy';
  if (t.includes('close position'))return 'sell';
  if (t.includes('sell'))          return 'sell';
  return null;
}

export const xtbParser: BrokerParser = {
  id: 'xtb',
  detect: looksLikeXtb,
  parse: (rows): ParseResult => {
    const out: ImportedRow[] = [];
    const skipped: ParseResult['skipped'] = [];

    rows.forEach((row, idx) => {
      const symbol = (getCell(row, 'Symbol') ?? '').trim().toUpperCase();
      if (!symbol) {
        skipped.push({ lineNumber: idx + 2, reason: 'Missing symbol' });
        return;
      }

      const typeRaw = getCell(row, 'Type') ?? '';
      const kind = kindFromXtbType(typeRaw);
      if (!kind) {
        skipped.push({ lineNumber: idx + 2, reason: `Unhandled type "${typeRaw}"` });
        return;
      }

      // Cash Operations rows have Amount (cash flow) but no per-share price.
      // Closed Positions rows have Open price + Volume.
      const volume = parseNumber(getCell(row, 'Volume', 'Size') ?? '');
      const openPrice = parseNumber(getCell(row, 'Open price', 'Open Price') ?? '');
      const closePrice = parseNumber(getCell(row, 'Close price', 'Close Price') ?? '');
      const dateRaw = getCell(row, 'Open time', 'Close time', 'Time', 'Date');
      const date = parseDate(dateRaw ?? '');
      if (!date) {
        skipped.push({ lineNumber: idx + 2, reason: 'Could not parse date' });
        return;
      }

      let qty = NaN;
      let price = NaN;
      if (Number.isFinite(volume) && Number.isFinite(openPrice)) {
        // Closed Positions style
        qty = Math.abs(volume);
        price = kind === 'sell' && Number.isFinite(closePrice) ? closePrice : openPrice;
      } else {
        const amount = parseNumber(getCell(row, 'Amount') ?? '');
        if (!Number.isFinite(amount)) {
          skipped.push({ lineNumber: idx + 2, reason: 'No volume/price or amount available' });
          return;
        }
        // Cash Operations gives total cash flow. Without per-share price we
        // can't split it; flag the row so the user fills it in on preview.
        qty = 1;
        price = Math.abs(amount);
      }
      if (qty <= 0 || !Number.isFinite(price)) {
        skipped.push({ lineNumber: idx + 2, reason: 'Could not parse numbers' });
        return;
      }

      const fee = Math.abs(parseNumber(getCell(row, 'Commission') ?? '0')) || 0;
      const currency = (getCell(row, 'Currency') ?? 'EUR').toUpperCase();

      out.push({
        uid: `xtb-${idx}`,
        kind,
        occurredOn: date,
        ticker: symbol,
        quantity: qty,
        priceLocal: price,
        currency,
        feeLocal: fee,
        fxToBase: 1,
      });
    });

    return { broker: 'xtb', rows: out, skipped };
  },
};

// Trading 212 — Account → History → Export (CSV).
//
// Headers (subset):
//   Action, Time, ISIN, Ticker, Name, Quantity, Price / share,
//   Currency (Price / share), Exchange rate, Total, Currency (Total),
//   Charge amount, Currency (Charge amount), Withholding tax, ...
//
// Action values we map: "Market buy", "Market sell", "Limit buy",
// "Limit sell", "Dividend (Dividend)", "Dividend (Ordinary Dividend)".
// Deposits, withdrawals, interest, FX swaps are skipped.

import type { BrokerParser, ImportKind, ImportedRow, ParseResult } from './types';
import { parseNumber, parseDate, getCell } from './numbers';

function looksLikeTrading212(headers: string[]): boolean {
  const h = headers.map((x) => x.toLowerCase());
  return h.includes('action') && h.includes('ticker') && h.includes('isin')
      && (h.includes('price / share') || h.includes('price/share'))
      && (h.includes('total') || h.includes('quantity'));
}

function kindFromAction(action: string): ImportKind | null {
  const a = action.toLowerCase();
  if (a.includes('dividend')) return 'dividend';
  if (a.includes('buy'))      return 'buy';
  if (a.includes('sell'))     return 'sell';
  return null;
}

export const trading212Parser: BrokerParser = {
  id: 'trading-212',
  detect: looksLikeTrading212,
  parse: (rows): ParseResult => {
    const out: ImportedRow[] = [];
    const skipped: ParseResult['skipped'] = [];

    rows.forEach((row, idx) => {
      const action = (getCell(row, 'Action') ?? '').trim();
      const kind = kindFromAction(action);
      if (!kind) {
        skipped.push({ lineNumber: idx + 2, reason: `Unhandled action "${action}"` });
        return;
      }

      const qty = parseNumber(getCell(row, 'Quantity') ?? '');
      const price = parseNumber(getCell(row, 'Price / share', 'Price/share', 'Price per share') ?? '');
      const date = parseDate(getCell(row, 'Time', 'Date') ?? '');
      if (!date || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price)) {
        skipped.push({ lineNumber: idx + 2, reason: 'Could not parse numbers' });
        return;
      }

      const fee = Math.abs(parseNumber(
        getCell(row, 'Charge amount', 'Stamp duty reserve tax', 'French transaction tax') ?? '0',
      )) || 0;
      const currency = (
        getCell(row, 'Currency (Price / share)', 'Currency (Price/share)', 'Currency') ?? 'EUR'
      ).toUpperCase();
      const fxRaw = parseNumber(getCell(row, 'Exchange rate') ?? '');
      const fxToBase = Number.isFinite(fxRaw) && fxRaw > 0 ? fxRaw : 1;
      const ticker = (getCell(row, 'Ticker') ?? '').trim().toUpperCase();
      const isin = (getCell(row, 'ISIN') ?? '').trim();
      const name = (getCell(row, 'Name') ?? '').trim();

      out.push({
        uid: `t212-${idx}`,
        kind,
        occurredOn: date,
        ticker,
        isin: isin || undefined,
        name: name || undefined,
        quantity: qty,
        priceLocal: price,
        currency,
        feeLocal: fee,
        fxToBase,
      });
    });

    return { broker: 'trading-212', rows: out, skipped };
  },
};

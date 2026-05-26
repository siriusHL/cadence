// Interactive Brokers — Flex Query CSV (Activity → Trades → Run flex query).
//
// Trade rows have these key columns:
//   ClientAccountID, CurrencyPrimary, AssetClass, Symbol, ISIN,
//   TradeDate (or Date/Time), Quantity, TradePrice, IBCommission,
//   FXRateToBase
//
// Some users also export the Activity Statement → Trades section. That
// CSV uses 'Date/Time' instead of 'TradeDate' and 'T. Price' / 'Comm/Fee'.

import type { BrokerParser, ImportedRow, ParseResult } from './types';
import { parseNumber, parseDate, getCell } from './numbers';

function looksLikeIbkr(headers: string[]): boolean {
  const h = headers.map((x) => x.toLowerCase());
  const hasSym = h.includes('symbol');
  const hasIbCols = h.includes('tradeprice') || h.includes('t. price') || h.includes('ibcommission');
  return hasSym && hasIbCols;
}

export const ibkrParser: BrokerParser = {
  id: 'ibkr',
  detect: looksLikeIbkr,
  parse: (rows): ParseResult => {
    const out: ImportedRow[] = [];
    const skipped: ParseResult['skipped'] = [];

    rows.forEach((row, idx) => {
      const symbol = (getCell(row, 'Symbol') ?? '').trim();
      const qtyRaw = getCell(row, 'Quantity');
      const priceRaw = getCell(row, 'TradePrice', 'T. Price', 'Price');
      const dateRaw = getCell(row, 'TradeDate', 'Date/Time', 'Date');

      if (!symbol || !qtyRaw || !priceRaw || !dateRaw) {
        skipped.push({ lineNumber: idx + 2, reason: 'Missing symbol/date/quantity/price' });
        return;
      }

      const qty = parseNumber(qtyRaw);
      const price = parseNumber(priceRaw);
      const date = parseDate(dateRaw);
      if (!date || !Number.isFinite(qty) || qty === 0 || !Number.isFinite(price)) {
        skipped.push({ lineNumber: idx + 2, reason: 'Could not parse numbers' });
        return;
      }

      const assetClass = (getCell(row, 'AssetClass', 'Asset Category') ?? 'STK').toUpperCase();
      if (assetClass && !['STK', 'STOCKS', 'EQUITY'].includes(assetClass)) {
        skipped.push({ lineNumber: idx + 2, reason: `Skipped non-stock asset (${assetClass})` });
        return;
      }

      const kind = qty > 0 ? 'buy' : 'sell';
      const fee = Math.abs(parseNumber(
        getCell(row, 'IBCommission', 'Comm/Fee', 'Commission') ?? '0',
      )) || 0;
      const currency = (getCell(row, 'CurrencyPrimary', 'Currency') ?? 'USD').toUpperCase();
      const fxRaw = parseNumber(getCell(row, 'FXRateToBase') ?? '');
      const fxToBase = Number.isFinite(fxRaw) && fxRaw > 0 ? fxRaw : 1;
      const isin = (getCell(row, 'ISIN') ?? '').trim();
      const description = (getCell(row, 'Description') ?? '').trim();

      out.push({
        uid: `ibkr-${idx}`,
        kind,
        occurredOn: date,
        ticker: symbol.toUpperCase(),
        isin: isin || undefined,
        name: description || undefined,
        quantity: Math.abs(qty),
        priceLocal: price,
        currency,
        feeLocal: fee,
        fxToBase,
      });
    });

    return { broker: 'ibkr', rows: out, skipped };
  },
};

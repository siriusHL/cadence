// eToro — Account Statement → Closed Positions sheet exported as CSV.
//
// eToro's export is messy: multiple sheets, asset mix (CFDs, copy trades,
// equities), and the column names use spaces and slashes. This parser
// targets the Closed Positions / Account Activity layout most retail
// users actually want to import:
//
//   Position ID, Action, Long/Short, Amount, Units, Open Date,
//   Close Date, Open Rate, Close Rate, Spread, P/L
//
// We treat each row as TWO transactions (open + close), splitting the
// position into a buy on the open date and a sell on the close date
// when units / rates are present. CFDs and copy-trade rows are skipped
// because Cadence only models direct equity ownership today.

import type { BrokerParser, ImportedRow, ParseResult } from './types';
import { parseNumber, parseDate, getCell } from './numbers';

function looksLikeEtoro(headers: string[]): boolean {
  const h = headers.map((x) => x.toLowerCase());
  return h.includes('action') && h.includes('units')
      && (h.includes('open date') || h.includes('open time'))
      && (h.includes('open rate') || h.includes('open price'));
}

export const etoroParser: BrokerParser = {
  id: 'etoro',
  detect: looksLikeEtoro,
  parse: (rows): ParseResult => {
    const out: ImportedRow[] = [];
    const skipped: ParseResult['skipped'] = [];

    rows.forEach((row, idx) => {
      const action = (getCell(row, 'Action') ?? '').trim();
      // eToro's "Action" looks like "Buy AAPL" or "Buy Copy ..." — we skip
      // copy/CFD rows and only keep direct equity buys.
      if (!action || /\b(copy|cfd|crypto)\b/i.test(action)) {
        skipped.push({ lineNumber: idx + 2, reason: `Skipped non-equity row (${action || 'empty'})` });
        return;
      }
      // Long/Short — only "Long" maps to a buy in our model. Shorts skipped.
      const ls = (getCell(row, 'Long/Short') ?? 'Long').toLowerCase();
      if (ls && ls !== 'long') {
        skipped.push({ lineNumber: idx + 2, reason: 'Skipped short position' });
        return;
      }

      const units = parseNumber(getCell(row, 'Units') ?? '');
      const openRate = parseNumber(getCell(row, 'Open Rate', 'Open Price') ?? '');
      const openDate = parseDate(getCell(row, 'Open Date', 'Open Time') ?? '');
      if (!openDate || !Number.isFinite(units) || units <= 0 || !Number.isFinite(openRate)) {
        skipped.push({ lineNumber: idx + 2, reason: 'Could not parse open position' });
        return;
      }

      // Best-effort ticker: "Buy AAPL" → "AAPL"
      const tickerMatch = action.match(/\b([A-Z]{1,5})\b/);
      const ticker = tickerMatch ? tickerMatch[1] : '';
      const currency = (getCell(row, 'Currency') ?? 'USD').toUpperCase();

      out.push({
        uid: `etoro-${idx}-open`,
        kind: 'buy',
        occurredOn: openDate,
        ticker,
        name: action,
        quantity: units,
        priceLocal: openRate,
        currency,
        feeLocal: 0,
        fxToBase: 1,
        warning: ticker ? undefined : 'Pick a ticker — eToro embeds it inside the Action label.',
      });

      // Closed positions also have a sell leg.
      const closeRate = parseNumber(getCell(row, 'Close Rate', 'Close Price') ?? '');
      const closeDate = parseDate(getCell(row, 'Close Date', 'Close Time') ?? '');
      if (closeDate && Number.isFinite(closeRate)) {
        out.push({
          uid: `etoro-${idx}-close`,
          kind: 'sell',
          occurredOn: closeDate,
          ticker,
          name: action,
          quantity: units,
          priceLocal: closeRate,
          currency,
          feeLocal: 0,
          fxToBase: 1,
          warning: ticker ? undefined : 'Pick a ticker — eToro embeds it inside the Action label.',
        });
      }
    });

    return { broker: 'etoro', rows: out, skipped };
  },
};

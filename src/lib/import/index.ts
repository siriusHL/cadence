import Papa from 'papaparse';
import type { BrokerId, BrokerParser, ParseResult } from './types';
import { degiroParser } from './degiro';
import { ibkrParser } from './ibkr';
import { tradeRepublicParser } from './trade-republic';

export const PARSERS: Record<BrokerId, BrokerParser> = {
  'degiro':         degiroParser,
  'ibkr':           ibkrParser,
  'trade-republic': tradeRepublicParser,
};

/** Auto-detect the broker from the first row of headers. Returns null if no match. */
export function detectBroker(headers: string[]): BrokerId | null {
  for (const id of Object.keys(PARSERS) as BrokerId[]) {
    if (PARSERS[id].detect(headers)) return id;
  }
  return null;
}

/**
 * Parse the raw CSV text. If broker is omitted, attempts auto-detection.
 * Throws on unparseable CSV; returns a ParseResult with skipped rows for
 * unhandled lines that still successfully parsed as CSV.
 */
export function parseCsv(text: string, broker?: BrokerId): ParseResult {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
  });
  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(`CSV parse failed: ${result.errors[0].message}`);
  }

  const headers = result.meta.fields ?? [];
  const id = broker ?? detectBroker(headers);
  if (!id) {
    throw new Error(
      `Couldn't identify the broker from headers. Detected columns: ${headers.slice(0, 8).join(', ')}…`,
    );
  }
  return PARSERS[id].parse(result.data);
}

export type { BrokerId, ImportedRow, ParseResult } from './types';
export { BROKER_LABEL } from './types';

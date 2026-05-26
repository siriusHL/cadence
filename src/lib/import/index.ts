import Papa from 'papaparse';
import type { BrokerId, BrokerParser, ParseResult } from './types';
import { degiroParser } from './degiro';
import { ibkrParser } from './ibkr';
import { tradeRepublicParser } from './trade-republic';
import { trading212Parser } from './trading212';
import { scalableParser } from './scalable';
import { etoroParser } from './etoro';
import { xtbParser } from './xtb';
import { saxoParser } from './saxo';
import { genericParse, type GenericMapping } from './generic';

/** Parsers that auto-detect from headers. 'other' is handled separately. */
export const PARSERS: Record<Exclude<BrokerId, 'other'>, BrokerParser> = {
  'degiro':         degiroParser,
  'ibkr':           ibkrParser,
  'trade-republic': tradeRepublicParser,
  'trading-212':    trading212Parser,
  'scalable':       scalableParser,
  'etoro':          etoroParser,
  'xtb':            xtbParser,
  'saxo':           saxoParser,
};

/** Auto-detect the broker from the first row of headers. Returns null if no match. */
export function detectBroker(headers: string[]): Exclude<BrokerId, 'other'> | null {
  for (const id of Object.keys(PARSERS) as Array<Exclude<BrokerId, 'other'>>) {
    if (PARSERS[id].detect(headers)) return id;
  }
  return null;
}

/** Parse the raw CSV text — auto-detects unless a broker is forced. */
export function parseCsv(text: string, broker?: BrokerId): ParseResult {
  if (broker === 'other') {
    throw new Error('Use parseCsvGeneric() for the manual-mapping path.');
  }
  const { rows, headers } = readCsv(text);
  const id = broker ?? detectBroker(headers);
  if (!id) {
    throw new Error(
      `Couldn't identify the broker from headers. Detected columns: ${headers.slice(0, 8).join(', ')}…`,
    );
  }
  return PARSERS[id].parse(rows);
}

/** Parse the raw CSV with a user-supplied column mapping. */
export function parseCsvGeneric(text: string, mapping: GenericMapping): ParseResult {
  const { rows } = readCsv(text);
  return genericParse(rows, mapping);
}

/** Just split the CSV into headers + rows without applying any parser. */
export function readCsv(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
  });
  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(`CSV parse failed: ${result.errors[0].message}`);
  }
  return { headers: result.meta.fields ?? [], rows: result.data };
}

export type { BrokerId, ImportedRow, ParseResult } from './types';
export type { GenericMapping, KindMapping } from './generic';
export { BROKER_LABEL } from './types';

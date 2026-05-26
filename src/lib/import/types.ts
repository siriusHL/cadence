// Shared types for the broker CSV import pipeline.

export type BrokerId =
  | 'degiro'
  | 'ibkr'
  | 'trade-republic'
  | 'trading-212'
  | 'scalable'
  | 'etoro'
  | 'xtb'
  | 'saxo'
  | 'other';                       // generic / user-mapped

export const BROKER_LABEL: Record<BrokerId, string> = {
  'degiro':         'DEGIRO',
  'ibkr':           'Interactive Brokers',
  'trade-republic': 'Trade Republic',
  'trading-212':    'Trading 212',
  'scalable':       'Scalable Capital',
  'etoro':          'eToro',
  'xtb':            'XTB',
  'saxo':           'Saxo Bank',
  'other':          'Other (map columns manually)',
};

/** Subset of transaction kinds importable today — splits/fees come later. */
export type ImportKind = 'buy' | 'sell' | 'dividend';

/** Canonical, broker-agnostic row produced by every parser. */
export interface ImportedRow {
  /** Stable identity within a single CSV — used as the React key in preview. */
  uid: string;
  kind: ImportKind;
  /** YYYY-MM-DD. */
  occurredOn: string;
  /** Best-effort ticker symbol. May be empty when the broker only gave an ISIN. */
  ticker: string;
  /** ISIN if available — useful as a fallback identifier. */
  isin?: string;
  /** Human label for the preview row (e.g. "APPLE INC."). */
  name?: string;
  /** Positive number. For dividends this is the share count held on pay date. */
  quantity: number;
  /** Per-share price (buy/sell) or per-share amount (dividend) in instrument currency. */
  priceLocal: number;
  /** Trading currency, ISO-4217 (e.g. 'EUR', 'USD'). */
  currency: string;
  /** Fees in instrument currency (buy/sell only). */
  feeLocal: number;
  /** FX rate from instrument currency to user's base currency at trade time. 1 if unknown. */
  fxToBase: number;
  /**
   * Soft warnings the user should see (e.g. "Couldn't infer ticker from ISIN").
   * Empty string for clean rows.
   */
  warning?: string;
}

export interface ParseResult {
  broker: BrokerId;
  rows: ImportedRow[];
  /** Lines that did not yield a row, with a reason. Shown in the preview footer. */
  skipped: { lineNumber: number; reason: string }[];
}

/** Module shape — every broker module exports both. */
export interface BrokerParser {
  id: BrokerId;
  /** Return true if the CSV's first row of headers matches this broker's signature. */
  detect: (headers: string[]) => boolean;
  /** Parse the full row set into canonical rows. */
  parse: (rows: Record<string, string>[]) => ParseResult;
}

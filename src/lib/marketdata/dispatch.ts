// Multi-provider dispatch — round-robin starting index per call, with
// fall-through to remaining providers on error or open circuit breaker.
//
// Goals:
//   1. Spread daily-quota load across FMP, Twelve Data, and Finnhub so no
//      single free-tier budget is exhausted before the others.
//   2. Stay available when one provider trips its breaker or returns garbage —
//      the next provider in line takes over transparently.
//
// Providers per capability are listed in priority order (best data first).
// The round-robin counter rotates the *starting* index per call; on error we
// always fall through to the remaining ones in their listed order.

import {
  fetchQuote as tdQuote,
  fetchEodOnDate as tdEod,
  fetchWeeklyHistory as tdWeekly,
  searchSymbols as tdSearch,
} from './twelvedata';
import {
  fetchProfile as fmpProfile,
  fetchDividendHistory as fmpDividends,
  isFmpQuotaExhausted,
} from './fmp';
import {
  fetchQuote as fhQuote,
  fetchProfile as fhProfile,
  fetchDividendHistory as fhDividends,
  fetchEodOnDate as fhEod,
  fetchWeeklyHistory as fhWeekly,
  searchSymbols as fhSearch,
  isFinnhubQuotaExhausted,
} from './finnhub';

interface Provider<Args extends unknown[], R> {
  name: string;
  call: (...args: Args) => Promise<R>;
  /** Optional skip predicate — return false to bypass this provider for this call. */
  healthy?: () => boolean;
}

function createDispatcher<Args extends unknown[], R>(
  providers: Provider<Args, R>[],
): (...args: Args) => Promise<R> {
  let counter = 0;
  return async (...args: Args): Promise<R> => {
    const n = providers.length;
    const start = counter++ % n;
    const errors: string[] = [];
    for (let i = 0; i < n; i++) {
      const p = providers[(start + i) % n];
      if (p.healthy && !p.healthy()) {
        errors.push(`${p.name}:breaker`);
        continue;
      }
      try {
        return await p.call(...args);
      } catch (e) {
        errors.push(`${p.name}:${e instanceof Error ? e.message : String(e)}`);
      }
    }
    throw new Error(`all_providers_failed [${errors.join(' | ')}]`);
  };
}

const fmpHealthy = () => !isFmpQuotaExhausted();
const fhHealthy = () => !isFinnhubQuotaExhausted();

// ─── Capabilities ──────────────────────────────────────────────────────

export const dispatchQuote = createDispatcher([
  { name: 'twelvedata', call: tdQuote },
  { name: 'finnhub',    call: fhQuote, healthy: fhHealthy },
]);

export const dispatchProfile = createDispatcher([
  { name: 'fmp',     call: fmpProfile, healthy: fmpHealthy },
  { name: 'finnhub', call: fhProfile,  healthy: fhHealthy  },
]);

export const dispatchDividendHistory = createDispatcher([
  { name: 'fmp',     call: fmpDividends, healthy: fmpHealthy },
  // Finnhub /stock/dividend is premium-tier; included so a paid key would
  // pick up automatically. On free keys it 403s and dispatch falls back.
  { name: 'finnhub', call: fhDividends,  healthy: fhHealthy  },
]);

export const dispatchEodOnDate = createDispatcher([
  { name: 'twelvedata', call: tdEod },
  // Finnhub /stock/candle is also premium-tier — same fallback story.
  { name: 'finnhub',    call: fhEod, healthy: fhHealthy },
]);

export const dispatchWeeklyHistory = createDispatcher([
  { name: 'twelvedata', call: tdWeekly },
  { name: 'finnhub',    call: fhWeekly, healthy: fhHealthy },
]);

export const dispatchSymbolSearch = createDispatcher([
  { name: 'twelvedata', call: tdSearch },
  { name: 'finnhub',    call: fhSearch, healthy: fhHealthy },
]);

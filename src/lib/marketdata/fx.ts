// Frankfurter — ECB-sourced FX, no key required, no rate limit advertised.
// https://www.frankfurter.app/docs/

const BASE = 'https://api.frankfurter.app';

export async function fetchLatestFx(base: string, quotes: string[]): Promise<Record<string, number>> {
  if (quotes.length === 0) return {};
  const symbols = quotes.filter((q) => q !== base).join(',');
  if (!symbols) return { [base]: 1 };
  const url = `${BASE}/latest?from=${base}&to=${symbols}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`frankfurter ${res.status}`);
  const j = await res.json() as { rates: Record<string, number> };
  return { ...j.rates, [base]: 1 };
}

// In-process singleflight + small LRU. v0 cache layer — Postgres is the durable store.
// Swap for Upstash Redis when we cross the single-instance horizon.

const inflight = new Map<string, Promise<unknown>>();

export function singleflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = inflight.get(key) as Promise<T> | undefined;
  if (hit) return hit;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function isFresh(asOf: string | Date | null | undefined, maxAgeMin: number): boolean {
  if (!asOf) return false;
  const t = typeof asOf === 'string' ? new Date(asOf).getTime() : asOf.getTime();
  return Date.now() - t < maxAgeMin * 60_000;
}

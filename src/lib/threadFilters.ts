const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface DateFilters {
  /** 'YYYY-MM-DD' inclusive lower day bound. */
  from?: string;
  /** 'YYYY-MM-DD' inclusive upper day bound. */
  to?: string;
  /** ISO timestamp lower bound, for sub-day presets like "last 4h". */
  since?: string;
}

/** True if an ISO timestamp satisfies the active date bounds. Invalid/absent
 *  bounds are ignored. */
export function inDateRange(iso: string, { from, to, since }: DateFilters): boolean {
  const t = new Date(iso).getTime();
  if (from && DATE_RE.test(from) && t < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && DATE_RE.test(to) && t > new Date(`${to}T23:59:59.999`).getTime()) return false;
  if (since) {
    const s = new Date(since).getTime();
    if (!Number.isNaN(s) && t < s) return false;
  }
  return true;
}

/** Build a query string for the status pills that preserves the other filters. */
export function buildListHref(
  basePath: string,
  parts: { status?: string; from?: string; to?: string; since?: string; q?: string },
): string {
  const sp = new URLSearchParams();
  if (parts.status) sp.set('status', parts.status);
  if (parts.from) sp.set('from', parts.from);
  if (parts.to) sp.set('to', parts.to);
  if (parts.since) sp.set('since', parts.since);
  if (parts.q) sp.set('q', parts.q);
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

// Shared helpers for parsing broker CSVs. Each broker uses its own number /
// date formats; centralising the heuristics keeps the parsers small.

/**
 * Parse a number from a broker CSV cell. Handles US (1,234.56) and EU
 * (1.234,56) decimal formats. Returns NaN on garbage.
 */
export function parseNumber(raw: string | undefined | null): number {
  if (raw == null) return NaN;
  const trimmed = String(raw).trim().replace(/[ \s]/g, '');
  if (!trimmed) return NaN;

  // If the string contains both ',' and '.', the last occurrence is the
  // decimal separator. Otherwise: if there's exactly one ',' and it has
  // exactly 2 digits after it, treat ',' as decimal.
  const lastDot = trimmed.lastIndexOf('.');
  const lastComma = trimmed.lastIndexOf(',');
  let normalised = trimmed;

  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot) {
      // 1.234,56 — EU
      normalised = trimmed.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 — US
      normalised = trimmed.replace(/,/g, '');
    }
  } else if (lastComma >= 0 && lastDot < 0) {
    const tail = trimmed.slice(lastComma + 1);
    if (tail.length === 2 || tail.length === 1) {
      normalised = trimmed.replace(',', '.');
    } else {
      normalised = trimmed.replace(/,/g, '');
    }
  }

  const n = Number(normalised);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Coerce common broker date formats to YYYY-MM-DD. Returns '' if it can't
 * recognise the input.
 *
 * Accepts:
 *   • 2024-08-13 / 2024/08/13 (ISO)
 *   • 13-08-2024 / 13/08/2024 (EU)
 *   • 13.08.2024
 *   • 08/13/2024 (US — flagged only when the day > 12)
 *   • 20240813
 *   • Optionally followed by a time component (ignored).
 */
export function parseDate(raw: string | undefined | null): string {
  if (!raw) return '';
  const head = String(raw).trim().split(/[\sT,]/)[0];   // drop trailing time
  if (!head) return '';

  // 20240813
  if (/^\d{8}$/.test(head)) {
    return `${head.slice(0, 4)}-${head.slice(4, 6)}-${head.slice(6, 8)}`;
  }

  // YYYY[-/.]MM[-/.]DD
  let m = head.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD[-/.]MM[-/.]YYYY  (or MM/DD/YYYY — disambiguated below)
  m = head.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) {
    const [, a, b, y] = m;
    const aN = Number(a);
    const bN = Number(b);
    // If first is > 12, it's clearly day-first.
    // Otherwise default to day-first (EU brokers dominate the import list).
    const dayFirst = aN > 12 || bN <= 12;
    const day = dayFirst ? a : b;
    const month = dayFirst ? b : a;
    return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return '';
}

/** Look up a header case-insensitively. Returns the cell or undefined. */
export function getCell(row: Record<string, string>, ...names: string[]): string | undefined {
  for (const wanted of names) {
    const w = wanted.toLowerCase();
    for (const k of Object.keys(row)) {
      if (k.toLowerCase() === w) return row[k];
    }
  }
  return undefined;
}

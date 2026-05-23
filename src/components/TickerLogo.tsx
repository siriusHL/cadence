'use client';

import { useState, useEffect } from 'react';

interface Props {
  ticker: string;
  size?: number;
  /** Optional rounded corner radius. Defaults to roughly square-rounded. */
  radius?: number;
}

/**
 * Stock logo with letter fallback.
 *
 * Source: FMP's static image-stock URL pattern. Works for most US tickers and
 * many international ones; falls back to a coloured square with the first 2
 * letters when the image 404s or fails to load.
 */
export function TickerLogo({ ticker, size = 28, radius }: Props) {
  const [errored, setErrored] = useState(false);
  // Reset error state if the ticker changes (e.g. autocomplete re-renders).
  useEffect(() => { setErrored(false); }, [ticker]);

  const r = radius ?? Math.round(size * 0.28);
  if (errored) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: r,
          background: 'oklch(0.94 0.04 175)',
          color: 'oklch(0.36 0.07 175)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 600,
          fontSize: Math.round(size * 0.4),
          flexShrink: 0,
        }}
      >
        {ticker.slice(0, 2)}
      </div>
    );
  }
  // Native img — small enough that next/image is overkill, and the URL is a
  // third-party image we wouldn't optimise anyway.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={`https://financialmodelingprep.com/image-stock/${encodeURIComponent(ticker)}.png`}
      alt=""
      width={size}
      height={size}
      onError={() => setErrored(true)}
      style={{
        width: size, height: size, borderRadius: r,
        background: '#fff',
        objectFit: 'contain',
        flexShrink: 0,
      }}
    />
  );
}

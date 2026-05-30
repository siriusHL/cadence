// Decorative market widgets for the Insights finance-portal layout.
//
// IMPORTANT: this is illustrative SAMPLE data, not a live feed — Cadence has no
// market data on this public page (the footer carries a "delayed / indicative"
// disclaimer). Sparklines are generated deterministically from a seed (no
// Math.random) so server and client render identically.

function sparkPath(seed: number, up: boolean, w: number, h: number) {
  const n = 22;
  const pts: number[] = [];
  let v = 50;
  let rnd = seed;
  const r = () => {
    rnd = (rnd * 9301 + 49297) % 233280;
    return rnd / 233280;
  };
  for (let i = 0; i < n; i++) {
    v += (r() - 0.45) * 16;
    v = Math.max(8, Math.min(92, v));
    pts.push(v);
  }
  pts[n - 1] = up ? Math.max(pts[n - 1], 70) : Math.min(pts[n - 1], 30);
  const step = w / (n - 1);
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = i * step;
    const y = h - (pts[i] / 100) * h;
    d += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
  }
  return { d, area: `${d}L${w},${h} L0,${h} Z` };
}

export function Sparkline({ seed, up, w, h }: { seed: number; up: boolean; w: number; h: number }) {
  const { d, area } = sparkPath(seed, up, w, h);
  const col = up ? 'var(--green)' : 'var(--red)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={col} opacity="0.10" />
      <path d={d} fill="none" stroke={col} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

const INDICES: [string, string, string, boolean, number][] = [
  ['S&P 500', '6,012.34', '+0.41%', true, 7],
  ['Dow Jones', '51,032.46', '+0.72%', true, 21],
  ['Nasdaq', '19,884.10', '+0.55%', true, 13],
  ['EUR/USD', '1.1659', '+0.03%', true, 4],
  ['Gold (Fut.)', '4,593.00', '+1.34%', true, 31],
  ['Bitcoin', '63,221.09', '+0.77%', true, 42],
];

export function IndexStrip() {
  return (
    <div className="ins-indexbar" aria-hidden="true">
      <div className="ins-wrap ins-index-inner">
        <div className="ins-geo">
          <svg className="pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          Markets
        </div>
        {INDICES.map(([nm, px, ch, up, seed]) => (
          <div key={nm} className="ins-idx">
            <div className="meta">
              <span className="nm">{nm}</span>
              <span className="px">{px}</span>
              <span className={`ch ${up ? 'ins-up' : 'ins-down'}`}>{ch}</span>
            </div>
            <div className="spark"><Sparkline seed={seed} up={up} w={58} h={30} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TRENDING: [string, string, string, string, boolean, number][] = [
  ['NVDA', 'NVIDIA Corp.', '211.14', '-1.45%', false, 5],
  ['AAPL', 'Apple Inc.', '243.05', '+0.64%', true, 12],
  ['MSFT', 'Microsoft', '482.55', '+1.06%', true, 18],
  ['TSLA', 'Tesla', '361.00', '+0.28%', true, 24],
  ['AMZN', 'Amazon', '247.60', '-0.42%', false, 9],
  ['ASML', 'ASML Holding', '842.00', '+1.21%', true, 33],
];

export function TrendingPanel() {
  return (
    <section className="ins-panel">
      <div className="ins-panel-head"><h2>Trending now</h2><span className="see">Indicative data</span></div>
      <div className="ins-cota">
        <SearchIcon />
        <input type="text" placeholder="Search a quote" aria-label="Search a quote" />
      </div>
      {TRENDING.map(([sym, name, px, ch, up, seed]) => (
        <div key={sym} className="ins-qrow">
          <div className="q-id"><div className="q-sym">{sym}</div><div className="q-name">{name}</div></div>
          <div className="q-spark"><Sparkline seed={seed} up={up} w={66} h={30} /></div>
          <div className="q-right"><div className="q-px">{px}</div><div className={`q-ch ${up ? 'ins-up' : 'ins-down'}`}>{ch}</div></div>
        </div>
      ))}
    </section>
  );
}

const PERFORMERS: [string, string, string, string][] = [
  ['ORCL', 'Oracle Corp.', '225.78', '+10.84%'],
  ['STLA', 'Stellantis', '21.40', '+6.12%'],
  ['UBER', 'Uber Tech.', '79.92', '+4.33%'],
  ['KO', 'Coca-Cola', '68.15', '+3.18%'],
];

export function PerformersPanel() {
  return (
    <section className="ins-panel">
      <div className="ins-panel-head"><h2>Top performers</h2><span className="see">Indicative data</span></div>
      {PERFORMERS.map(([sym, name, px, ch]) => (
        <div key={sym} className="ins-perf-row">
          <div className="pl"><span className="ps">{sym}</span><span className="pn">{name}</span></div>
          <div className="pr"><div className="pp">{px}</div><div className="pc ins-up">{ch}</div></div>
        </div>
      ))}
    </section>
  );
}

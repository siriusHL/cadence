// Abstract chart art for article thumbnails (warm-paper + emerald theme).
// Purely decorative — deliberately no numeric labels, so nothing implies a
// real return/yield for an educational article. Variant is chosen by category
// so the grid looks varied but deterministic.
type Variant = 'area' | 'donut' | 'bars';

const BY_CATEGORY: Record<string, Variant> = {
  etf: 'area',
  'market-analysis': 'area',
  'growth-investing': 'area',
  'stock-market': 'area',
  'portfolio-management': 'donut',
  'value-investing': 'donut',
  'dividend-investing': 'bars',
  'personal-finance': 'bars',
};

export function variantForCategory(slug: string | null | undefined): Variant {
  if (slug && BY_CATEGORY[slug]) return BY_CATEGORY[slug];
  // Stable fallback from the slug so unknown categories still vary.
  const variants: Variant[] = ['area', 'donut', 'bars'];
  let h = 0;
  for (let i = 0; i < (slug?.length ?? 0); i++) h = (h + slug!.charCodeAt(i)) % 3;
  return variants[h];
}

function Area() {
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="50" x2="320" y2="50" stroke="var(--line-2)" strokeWidth="1" />
      <line x1="0" y1="100" x2="320" y2="100" stroke="var(--line-2)" strokeWidth="1" />
      <line x1="0" y1="150" x2="320" y2="150" stroke="var(--line-2)" strokeWidth="1" />
      <path d="M0,150 L40,140 L80,150 L120,118 L160,124 L200,92 L240,78 L280,52 L320,42 L320,200 L0,200 Z" fill="var(--green-soft)" opacity="0.5" />
      <path d="M0,150 L40,140 L80,150 L120,118 L160,124 L200,92 L240,78 L280,52 L320,42" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="200" cy="92" r="3.5" fill="var(--card)" stroke="var(--green)" strokeWidth="2" />
      <circle cx="320" cy="42" r="4" fill="var(--green)" />
    </svg>
  );
}

function Donut() {
  return (
    <svg viewBox="0 0 320 200" aria-hidden="true">
      <g transform="rotate(-90 160 100)" fill="none" strokeWidth="22">
        <circle cx="160" cy="100" r="58" stroke="var(--green)" strokeDasharray="127.6 236.8" strokeDashoffset="0" />
        <circle cx="160" cy="100" r="58" stroke="var(--green-mid)" strokeDasharray="91.1 273.3" strokeDashoffset="-127.6" />
        <circle cx="160" cy="100" r="58" stroke="var(--green-soft)" strokeDasharray="65.6 298.8" strokeDashoffset="-218.7" />
        <circle cx="160" cy="100" r="58" stroke="oklch(0.80 0.012 90)" strokeDasharray="43.7 320.7" strokeDashoffset="-284.3" />
        <circle cx="160" cy="100" r="58" stroke="oklch(0.88 0.010 90)" strokeDasharray="36.4 328.0" strokeDashoffset="-328.0" />
      </g>
    </svg>
  );
}

function Bars() {
  const bars = [
    [22, 120, 40], [56, 96, 64], [90, 108, 52], [124, 74, 86], [158, 100, 60],
    [192, 62, 98], [226, 88, 72], [260, 48, 112], [294, 78, 82],
  ];
  const fills = ['var(--green-soft)', 'var(--green-soft)', 'var(--green)', 'var(--green)', 'var(--green-soft)', 'var(--green)', 'var(--green)', 'var(--green)', 'var(--green-mid)'];
  return (
    <svg viewBox="0 0 320 200" aria-hidden="true">
      <line x1="0" y1="160" x2="320" y2="160" stroke="var(--line-2)" strokeWidth="1" />
      {bars.map(([x, y, h], i) => (
        <rect key={i} x={x} y={y} width="20" height={h} rx="2" fill={fills[i]} />
      ))}
    </svg>
  );
}

export function ThumbArt({ slug }: { slug: string | null | undefined }) {
  const v = variantForCategory(slug);
  if (v === 'donut') return <Donut />;
  if (v === 'bars') return <Bars />;
  return <Area />;
}

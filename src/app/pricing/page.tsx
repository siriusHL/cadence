import Link from 'next/link';
import { TIERS, type Tier } from '@/lib/tiers';

interface Plan {
  key: Tier;
  name: string;
  price: string;
  blurb: string;
  bullets: string[];
  cta: { label: string; href: string };
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    key: 'free',
    name: 'Free',
    price: '€0',
    blurb: 'Track your money, see what it earned you.',
    bullets: [
      '1 portfolio, up to 10 holdings',
      'Home, Coming Up, Stocks, Your Year',
      'Daily price updates (EOD)',
    ],
    cta: { label: 'Start free', href: '/signup' },
  },
  {
    key: 'premium',
    name: 'Premium',
    price: '€4 / mo',
    blurb: 'The full dividend research toolkit.',
    bullets: [
      `3 portfolios, up to ${TIERS.premium.maxHoldings} holdings each`,
      'Calendar, 12-month forecast, DRIP simulator',
      'Performance vs benchmarks, diversification',
      '10-minute live quotes, CSV export',
    ],
    cta: { label: 'Try Premium', href: '/signup?tier=premium' },
    featured: true,
  },
  {
    key: 'elite',
    name: 'Elite',
    price: '€9 / mo',
    blurb: 'Tax, alerts, and an API for power users.',
    bullets: [
      'Unlimited portfolios + holdings',
      'Withholding report, NL Box 3, treaty deltas',
      'Price + ex-div alerts, 1-min quotes',
      'PDF export, public API access',
    ],
    cta: { label: 'Go Elite', href: '/signup?tier=elite' },
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-line">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.06em] uppercase">
          <span className="w-2 h-2 rounded-full bg-accent-soft" /> Cadence
        </Link>
        <Link href="/login" className="text-sm text-ink-soft hover:text-ink">Log in</Link>
      </header>

      <section className="flex-1 px-6 py-16 max-w-6xl mx-auto w-full">
        <h1 className="text-5xl font-semibold tracking-[-0.025em] text-center">Pricing</h1>
        <p className="mt-3 text-lg text-ink-soft text-center max-w-xl mx-auto tracking-tight">
          Start free. Upgrade when you want forecasts, tax reports, or unlimited holdings.
        </p>

        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {PLANS.map((p) => (
            <div
              key={p.key}
              className={
                'flex flex-col p-7 rounded-2xl bg-white ' +
                (p.featured
                  ? 'ring-2 ring-ink shadow-[0_8px_30px_rgba(0,0,0,0.08)]'
                  : 'border border-line shadow-[0_1px_2px_rgba(0,0,0,0.04)]')
              }
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-semibold">{p.name}</h2>
                {p.featured && (
                  <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-ink text-white">
                    Most popular
                  </span>
                )}
              </div>
              <div className="mt-3 text-4xl font-semibold tracking-[-0.025em]">{p.price}</div>
              <p className="mt-2 text-sm text-ink-soft">{p.blurb}</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-accent">✓</span>
                    <span className="text-ink">{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={p.cta.href}
                className={
                  'mt-7 h-11 inline-flex items-center justify-center rounded-full font-medium ' +
                  (p.featured
                    ? 'bg-ink text-white hover:opacity-90'
                    : 'border border-line-strong hover:bg-black/[0.03]')
                }
              >
                {p.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

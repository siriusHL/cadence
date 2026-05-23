'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Tier = 'premium' | 'elite';

interface Plan {
  key: Tier;
  name: string;
  price: string;
  badge?: string;
  bullets: string[];
}

const PLANS: Plan[] = [
  {
    key: 'premium',
    name: 'Premium',
    price: '€4 / mo',
    bullets: [
      '3 portfolios, 100 holdings each',
      'Forecast, calendar, DRIP, performance',
      '10-min live quotes · CSV export',
    ],
  },
  {
    key: 'elite',
    name: 'Elite',
    price: '€9 / mo',
    badge: 'All in',
    bullets: [
      'Unlimited holdings + portfolios',
      'Tax report, NL Box 3, alerts',
      '1-min quotes · PDF + API access',
    ],
  },
];

function UpgradeBody() {
  const params = useSearchParams();
  const from = params.get('from');
  const [busy, setBusy] = useState<Tier | null>(null);
  const [hovered, setHovered] = useState<Tier | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(tier: Tier) {
    setBusy(tier);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.error ?? 'checkout failed');
      window.location.href = j.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <>
      {from && (
        <p className="text-sm text-ink-soft mb-6">
          The <b className="text-ink">{from}</b> screen is part of a paid plan.
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {PLANS.map((p) => {
          const isHovered = hovered === p.key;
          const isBusy = busy === p.key;
          const anyBusy = busy !== null;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => checkout(p.key)}
              onMouseEnter={() => setHovered(p.key)}
              onMouseLeave={() => setHovered((h) => (h === p.key ? null : h))}
              disabled={anyBusy}
              className={[
                'group relative text-left p-6 rounded-2xl bg-white',
                'border transition-all duration-150',
                'cursor-pointer disabled:cursor-wait',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40',
                isHovered && !anyBusy
                  ? 'border-ink shadow-[0_6px_20px_rgba(0,0,0,0.10)] -translate-y-0.5'
                  : 'border-line shadow-sm',
                isBusy ? 'opacity-90' : '',
                'active:translate-y-0 active:shadow-sm',
              ].join(' ')}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                {p.badge && (
                  <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-ink text-white">
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="text-3xl font-semibold tracking-[-0.025em] mt-2">{p.price}</div>
              <ul className="mt-4 space-y-2 text-sm text-ink">
                {p.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>

              {/* Inner CTA — styled as a button but visually inert (the whole card is clickable) */}
              <div
                className={[
                  'mt-6 w-full h-11 rounded-full font-medium',
                  'flex items-center justify-center gap-2',
                  'bg-ink text-white transition-opacity',
                  isHovered && !anyBusy ? 'opacity-100' : 'opacity-90',
                ].join(' ')}
              >
                {isBusy ? (
                  <>
                    <Spinner /> Redirecting…
                  </>
                ) : (
                  <>Upgrade to {p.name}</>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-down">{error}</p>}
      <p className="mt-6 text-xs text-ink-dim text-center max-w-md">
        Secure checkout by Stripe. Cancel anytime from your billing portal.
      </p>
    </>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

export default function UpgradePage() {
  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16">
      <Link href="/app/home" className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.06em] uppercase mb-10 hover:opacity-70 transition-opacity">
        <span className="w-2 h-2 rounded-full bg-accent-soft" /> Cadence
      </Link>
      <h1 className="text-4xl font-semibold tracking-[-0.025em] mb-2">Upgrade</h1>
      <Suspense fallback={null}>
        <UpgradeBody />
      </Suspense>
    </main>
  );
}

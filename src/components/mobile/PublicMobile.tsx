// Mobile Public pages — V2b chassis with no bottom tab bar (unauthenticated).
// Mirrors templates/public-pages.jsx. Each component is a thin layout shell
// that takes a `children` slot so the page can keep its existing form
// (Login/Signup) or content. No state owned here.

import Link from 'next/link';

interface PublicShellProps {
  /** When true, omits the top wordmark bar (login/signup centre the wordmark in the hero). */
  noTopBar?: boolean;
  /** Right-side nav links shown in the top bar. */
  topRight?: React.ReactNode;
  children: React.ReactNode;
}

function Wordmark() {
  return (
    <Link
      href="/"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--text)',
        textDecoration: 'none',
      }}
    >
      <span
        style={{
          width: 7, height: 7, borderRadius: 999,
          background: 'var(--accent-soft, oklch(0.55 0.10 175))',
        }}
      />
      Cadence
    </Link>
  );
}

/**
 * Outer shell for public mobile pages. `.mob.v2b` chassis, no bottom tab bar.
 * Either renders a top bar with wordmark + nav links, or skips it for the
 * auth pages that centre the wordmark in the hero.
 */
export function PublicMobileShell({ noTopBar, topRight, children }: PublicShellProps) {
  return (
    <div className="mob v2b">
      {!noTopBar && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <Wordmark />
          {topRight}
        </div>
      )}
      <div className="scroll">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Landing — hero + 3 feature cards + footer
// ─────────────────────────────────────────────────────────────────────
export function LandingMobile() {
  const features = [
    {
      eyebrow: 'Calendar',
      title: 'See every dividend you’re owed',
      body: 'Cadence knows ex-dates, payouts, and projected schedules. Nothing arrives unannounced.',
    },
    {
      eyebrow: 'Forecast',
      title: 'Twelve months ahead',
      body: 'Project monthly income, your peak month, and what compounding gets you in 5 / 10 years.',
    },
    {
      eyebrow: 'Tax',
      title: 'Withholding by jurisdiction',
      body: 'Know what you’re losing to foreign WH, what your residence taxes, and what’s reclaimable.',
    },
  ];
  return (
    <PublicMobileShell
      topRight={
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link
            href="/pricing"
            style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
          >
            Pricing
          </Link>
          <Link
            href="/login"
            style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
          >
            Log in
          </Link>
        </div>
      }
    >
      <div style={{ padding: '60px 24px 40px', textAlign: 'center' }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            fontWeight: 500,
            marginBottom: 18,
          }}
        >
          Built for dividend investors
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 56,
            lineHeight: 0.95,
            letterSpacing: '-0.04em',
            fontWeight: 600,
          }}
        >
          See your money{' '}
          <span style={{ color: 'var(--text-dim)', fontWeight: 300 }}>working</span>.
        </h1>
        <p
          style={{
            marginTop: 24,
            fontSize: 15,
            color: 'var(--text-muted)',
            lineHeight: 1.45,
            maxWidth: 320,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Track every dividend, forecast the next twelve months, see exactly how
          close you are to living off your portfolio.
        </p>
        <div
          style={{
            marginTop: 36,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <Link
            href="/signup"
            style={{
              width: 240, height: 48,
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              borderRadius: 999,
              fontSize: 14, fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            Start free
          </Link>
          <Link
            href="/pricing"
            style={{
              width: 240, height: 48,
              background: 'transparent', color: 'var(--text)',
              border: '1px solid var(--border-strong)',
              borderRadius: 999,
              fontSize: 14, fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            See pricing
          </Link>
        </div>
        <div style={{ marginTop: 18, fontSize: 10, color: 'var(--text-dim)' }}>
          Free tier — no credit card. 10 holdings, 4 essential screens.
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ padding: '0 var(--pad) 24px' }}>
        {features.map((f, i) => (
          <div
            key={f.eyebrow}
            className="pcard cdn-anim"
            style={{ '--i': i + 1, marginTop: i === 0 ? 0 : 12, marginLeft: 0, marginRight: 0 } as React.CSSProperties}
          >
            <div
              style={{
                fontSize: 10,
                color: 'var(--accent-soft, oklch(0.55 0.10 175))',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {f.eyebrow}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                marginTop: 4,
              }}
            >
              {f.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                marginTop: 6,
                lineHeight: 1.45,
              }}
            >
              {f.body}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '16px 24px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: 'var(--text-dim)',
        }}
      >
        <span>© {new Date().getFullYear()} Cadence</span>
        <span>Not financial advice.</span>
      </div>
    </PublicMobileShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Auth pages (Login / Signup) — centered wordmark + hero + form slot
// ─────────────────────────────────────────────────────────────────────
export interface AuthMobileLayoutProps {
  title: string;
  sub: string;
  /** Existing form component, slotted below the hero. */
  form: React.ReactNode;
  /** Footer line (e.g. "No account? Sign up"). */
  footer: React.ReactNode;
}

export function AuthMobileLayout({ title, sub, form, footer }: AuthMobileLayoutProps) {
  return (
    <PublicMobileShell noTopBar>
      <div style={{ padding: '40px 24px 0', textAlign: 'center' }}>
        <Wordmark />
      </div>
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: '-0.025em',
          }}
        >
          {title}
        </h1>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{sub}</div>
      </div>
      <div style={{ padding: '0 24px' }}>{form}</div>
      <div
        style={{
          marginTop: 24,
          padding: '0 24px 40px',
          fontSize: 12,
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        {footer}
      </div>
    </PublicMobileShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Pricing — top bar + 3 plan cards
// ─────────────────────────────────────────────────────────────────────
export interface PricingPlan {
  key: string;
  name: string;
  price: string;
  blurb: string;
  bullets: string[];
  cta: string;
  ctaHref: string;
  featured?: boolean;
}

export function PricingMobile({ plans }: { plans: PricingPlan[] }) {
  return (
    <PublicMobileShell
      topRight={
        <Link
          href="/login"
          style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
        >
          Log in
        </Link>
      }
    >
      <div style={{ padding: '40px 24px 24px', textAlign: 'center' }}>
        <h1
          style={{
            margin: 0,
            fontSize: 40,
            fontWeight: 600,
            letterSpacing: '-0.03em',
          }}
        >
          Pricing
        </h1>
        <p
          style={{
            marginTop: 12,
            fontSize: 14,
            color: 'var(--text-muted)',
            lineHeight: 1.45,
          }}
        >
          Start free. Upgrade when you want forecasts, tax reports, or unlimited holdings.
        </p>
      </div>

      <div
        style={{
          padding: '0 var(--pad) 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {plans.map((p) => (
          <div
            key={p.key}
            style={{
              padding: 22,
              background: p.featured ? '#0c0d0e' : 'var(--surface)',
              color: p.featured ? '#fff' : 'var(--text)',
              border: p.featured ? 0 : '1px solid var(--border)',
              borderRadius: 18,
              position: 'relative',
            }}
          >
            {p.featured && (
              <span
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  fontSize: 9,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: '#fff',
                  color: '#1d1d1f',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Most popular
              </span>
            )}
            <div style={{ fontSize: 16, fontWeight: 600 }}>{p.name}</div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: '-0.025em',
                marginTop: 6,
              }}
            >
              {p.price}
            </div>
            <div
              style={{
                fontSize: 12,
                color: p.featured ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)',
                marginTop: 6,
              }}
            >
              {p.blurb}
            </div>
            <ul
              style={{
                margin: '18px 0 0',
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {p.bullets.map((b) => (
                <li
                  key={b}
                  style={{
                    display: 'flex',
                    gap: 8,
                    fontSize: 12,
                    lineHeight: 1.4,
                  }}
                >
                  <span
                    style={{ color: 'var(--accent-soft, oklch(0.55 0.10 175))', flexShrink: 0 }}
                  >
                    ✓
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href={p.ctaHref}
              style={{
                display: 'block',
                width: '100%',
                height: 44,
                marginTop: 20,
                background: p.featured ? '#fff' : 'var(--btn-primary-bg)',
                color: p.featured ? '#1d1d1f' : 'var(--btn-primary-text)',
                border: 0,
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center',
                lineHeight: '44px',
                textDecoration: 'none',
              }}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>
      <div style={{ height: 30 }} />
    </PublicMobileShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Upgrade — paid plan picker
// ─────────────────────────────────────────────────────────────────────
export function UpgradeMobile({
  plans,
  from,
}: {
  plans: PricingPlan[];
  from?: string;
}) {
  return (
    <PublicMobileShell
      topRight={
        <div style={{ width: 30 }} />
      }
    >
      <div style={{ padding: '32px 24px 16px', textAlign: 'center' }}>
        <h1
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: '-0.025em',
          }}
        >
          Upgrade
        </h1>
        <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
          {from ? (
            <>
              The <b style={{ color: 'var(--text)' }}>{from}</b> screen is part of a paid plan.
            </>
          ) : (
            <>Unlock the full Cadence experience.</>
          )}
        </p>
      </div>

      <div
        style={{
          padding: '0 var(--pad) 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {plans.map((p) => (
          <Link
            key={p.key}
            href={p.ctaHref}
            style={{
              display: 'block',
              width: '100%',
              padding: 20,
              textAlign: 'left',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 600 }}>{p.name}</div>
              {p.key === 'elite' && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: 999,
                    background: 'var(--text)',
                    color: 'var(--surface)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  All in
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: '-0.025em',
                marginTop: 4,
              }}
            >
              {p.price}
            </div>
            <ul
              style={{
                margin: '12px 0 0',
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              {p.bullets.slice(0, 3).map((b) => (
                <li
                  key={b}
                  style={{ fontSize: 11.5, color: 'var(--text-muted)' }}
                >
                  · {b}
                </li>
              ))}
            </ul>
            <div
              style={{
                marginTop: 16,
                height: 42,
                background: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {p.cta}
            </div>
          </Link>
        ))}
      </div>

      <div
        style={{
          padding: '0 24px 24px',
          fontSize: 10,
          color: 'var(--text-dim)',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        Secure checkout by Stripe. Cancel anytime from your billing portal.
      </div>
    </PublicMobileShell>
  );
}

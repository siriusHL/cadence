'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AddHoldingForm } from '@/components/AddHoldingForm';
import { MobileShell } from '@/components/mobile/MobileShell';

/**
 * Stand-alone "Add a holding" page. On success we land on the post-login
 * dispatch route, which routes Free users to /app/home and Premium/Elite to
 * /app/dashboard. The form itself already calls router.refresh() before our
 * onSuccess fires, so the destination page reflects the new row immediately.
 *
 * Renders two trees gated by .cdn-mobile-only / .cdn-desktop-only:
 *   - Desktop: centered card on a max-width column
 *   - Mobile: MobileShell with V2b chassis + pro-hero-mob + form in a pcard
 */
export default function AddHoldingPage() {
  const router = useRouter();
  const onSuccess = () => router.push('/app');
  const form = <AddHoldingForm onSuccess={onSuccess} />;

  return (
    <>
      <div className="cdn-mobile-only">
        <MobileShell chassis="v2b" currentTab="more" tabSet="pro">
          <div
            className="pro-hero-mob cdn-anim"
            style={{ '--i': 0 } as React.CSSProperties}
          >
            <div className="eyebrow">Portfolio</div>
            <h1>Add holding</h1>
            <div className="sub">
              Tell Cadence what you bought. Add multiple lots if you bought at different
              prices or on different days.
            </div>
          </div>
          <div className="pcard cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
            {form}
          </div>
          <div style={{ height: 80 }} />
        </MobileShell>
      </div>
      <div className="cdn-desktop-only">
        <div style={{ maxWidth: 640, margin: '32px auto' }}>
          <div style={{ marginBottom: 18 }}>
            <Link
              href="/app"
              style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}
            >
              ← Back
            </Link>
          </div>
          <div className="card" style={{ padding: '28px 30px' }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                marginBottom: 4,
              }}
            >
              Add a holding
            </div>
            <div
              style={{
                fontSize: 14,
                color: 'var(--text-muted)',
                marginBottom: 24,
              }}
            >
              Tell Cadence what you bought. Add multiple lots if you bought at different
              prices or on different days.
            </div>

            {form}
          </div>
        </div>
      </div>
    </>
  );
}

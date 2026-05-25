'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AddHoldingForm } from '@/components/AddHoldingForm';

/**
 * Stand-alone "Add a holding" page. On success we land on the post-login
 * dispatch route, which routes Free users to /app/home and Premium/Elite to
 * /app/dashboard. The form itself already calls router.refresh() before our
 * onSuccess fires, so the destination page reflects the new row immediately.
 */
export default function AddHoldingPage() {
  const router = useRouter();

  return (
    <div style={{ maxWidth: 640, margin: '32px auto' }}>
      <div style={{ marginBottom: 18 }}>
        <Link href="/app" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Back
        </Link>
      </div>
      <div className="card" style={{ padding: '28px 30px' }}>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Add a holding
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
          Tell Cadence what you bought. Add multiple lots if you bought at different prices or on different days.
        </div>

        <AddHoldingForm onSuccess={() => router.push('/app')} />
      </div>
    </div>
  );
}

import { TopProgressBar } from '@/components/TopProgressBar';

/**
 * Per-route loading state for /app/alerts. The parent /app/loading.tsx only
 * shows a thin progress bar; the alerts page does enough server-side work
 * (enrichment + tax summary + performance series + alert rules) that a blank
 * gap below the nav while waiting reads as "broken". This skeleton mirrors the
 * eventual layout — hero block + four alert-card placeholders + footer — so
 * the user sees the right shape immediately and the real content fades into
 * place once ready.
 */
export default function AlertsLoading() {
  return (
    <>
      <TopProgressBar />
      <div className="cdn-pro" aria-busy="true" aria-live="polite">
        {/* Hero skeleton */}
        <div className="pro-hero">
          <div style={{ flex: 1 }}>
            <Bar w={140} h={12} />
            <div style={{ marginTop: 10 }}>
              <Bar w={420} h={32} />
            </div>
            <div style={{ marginTop: 12 }}>
              <Bar w={560} h={14} />
            </div>
            <div style={{ marginTop: 4 }}>
              <Bar w={300} h={14} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <Bar w={160} h={12} />
            <Bar w={80} h={12} />
            <Bar w={120} h={12} />
          </div>
        </div>

        {/* Alert card skeletons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 18px',
                background: 'var(--surface)',
                borderRadius: 12,
                borderLeft: '3px solid var(--surface-2)',
                boxShadow: '0 1px 2px rgba(0,0,0,.03), 0 1px 3px rgba(0,0,0,.02)',
              }}
            >
              <div
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--surface-2)', flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Bar w={`${50 + (i % 3) * 12}%`} h={14} />
                <div style={{ marginTop: 6 }}>
                  <Bar w="90%" h={12} />
                </div>
                <div style={{ marginTop: 4 }}>
                  <Bar w={`${40 + (i % 4) * 14}%`} h={12} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Thresholds footer skeleton */}
        <div
          style={{
            marginTop: 24, padding: '14px 16px',
            background: 'var(--surface-2)', borderRadius: 10,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}
        >
          <Bar w="92%" h={11} />
          <Bar w="78%" h={11} />
        </div>
      </div>
    </>
  );
}

function Bar({ w, h }: { w: number | string; h: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 4,
        background:
          'linear-gradient(90deg, var(--surface-2) 0%, var(--surface) 50%, var(--surface-2) 100%)',
        backgroundSize: '200% 100%',
        // cdn-shimmer is defined in globals.css for route-transition skeletons.
        animation: 'cdn-shimmer 1400ms ease-in-out infinite',
      }}
    />
  );
}

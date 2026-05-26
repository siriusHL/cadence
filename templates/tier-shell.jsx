// Shared cross-tier UI:
//   - TierBar (top-left wordmark navigation between Pro/Free/Elite/Account/Public)
//   - SimpleShell (modal-y screen with back button — for Add/Edit, public auth)
//   - Helpers used by every tier's pages.

const TIERS_NAV = [
  { id: 'pro',     label: 'Pro',     href: 'Pro.html' },
  { id: 'free',    label: 'Free',    href: 'Free.html' },
  { id: 'elite',   label: 'Elite',   href: 'Elite.html' },
  { id: 'account', label: 'Account', href: 'Account.html' },
  { id: 'add',     label: 'Add / Edit', href: 'AddEdit.html' },
  { id: 'public',  label: 'Public',  href: 'Public.html' },
];

function TierBar({ active }) {
  return (
    <div style={{
      position: 'fixed', top: 14, left: 14, zIndex: 50,
      display: 'inline-flex', gap: 4,
      padding: 3,
      background: 'rgba(255,255,255,0.9)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 999,
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
    }}>
      {TIERS_NAV.map((t) => (
        <a
          key={t.id}
          href={t.href}
          style={{
            padding: '5px 12px',
            borderRadius: 999,
            fontWeight: 500,
            color: t.id === active ? '#1d1d1f' : '#86868b',
            background: t.id === active ? '#ffffff' : 'transparent',
            boxShadow: t.id === active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
            textDecoration: 'none',
          }}
        >{t.label}</a>
      ))}
    </div>
  );
}

// Simple V2 shell w/ back button (used for Add/Edit + public screens)
function SimpleShell({ density = 'regular', back = '← Back', onBack, children }) {
  if (typeof window !== 'undefined' && window.injectV2Style) window.injectV2Style();
  return (
    <div className="mob v2b" data-density={density} style={{ background: 'var(--bg)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px 6px', flexShrink: 0,
      }}>
        <div style={{
          fontSize: 12, color: 'var(--text-muted)',
          cursor: 'pointer', fontWeight: 500,
        }} onClick={onBack}>{back}</div>
        <div style={{
          fontSize: 11, fontWeight: 600,
          letterSpacing: 0.6, textTransform: 'uppercase',
        }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 3, background: 'var(--accent-soft)', marginRight: 6, verticalAlign: 'middle' }} />
          Cadence
        </div>
        <div style={{ width: 32 }} />
      </div>
      <div className="scroll" style={{ paddingTop: 8 }}>{children}</div>
    </div>
  );
}

window.TierBar = TierBar;
window.SimpleShell = SimpleShell;

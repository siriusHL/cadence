import Link from 'next/link';

interface Props {
  icon?: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function EmptyState({ icon = '✦', title, body, ctaLabel, ctaHref }: Props) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 6px 18px rgba(0,0,0,.04)',
        padding: '48px 32px',
        textAlign: 'center',
        maxWidth: 540,
        margin: '32px auto',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: 'oklch(0.94 0.04 175)',
          color: 'oklch(0.36 0.07 175)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          marginBottom: 14,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: '#6e6e73', maxWidth: 380, margin: '0 auto', lineHeight: 1.45 }}>
        {body}
      </div>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="btn"
          style={{ marginTop: 22, textDecoration: 'none' }}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

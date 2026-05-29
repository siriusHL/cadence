import { type Tier } from '@/lib/tiers';

const STYLES: Record<Tier, { label: string; bg: string; fg: string }> = {
  free:    { label: 'Free',    bg: 'var(--surface-2)',     fg: 'var(--text-muted)' },
  premium: { label: 'Premium', bg: 'oklch(0.93 0.06 195)', fg: 'oklch(0.45 0.10 200)' },
  elite:   { label: 'Elite',   bg: 'oklch(0.92 0.09 90)',  fg: 'oklch(0.45 0.12 75)' },
};

/** Pill badge for a customer's plan — muted (free), teal (premium), gold (elite). */
export function TierBadge({ tier }: { tier: Tier }) {
  const s = STYLES[tier];
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 9px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
      background: s.bg,
      color: s.fg,
    }}>
      {s.label}
    </span>
  );
}

export type StatusKind = 'open' | 'closed' | 'awaiting';

const STYLES: Record<StatusKind, { label: string; bg: string; fg: string }> = {
  open:     { label: 'Open',           bg: 'oklch(0.93 0.07 150)', fg: 'oklch(0.42 0.11 150)' },
  awaiting: { label: 'Awaiting reply', bg: 'oklch(0.94 0.08 70)',  fg: 'oklch(0.50 0.13 60)' },
  closed:   { label: 'Closed',         bg: 'oklch(0.93 0.05 25)',  fg: 'oklch(0.50 0.17 25)' },
};

/** Pill badge for a thread's status — green (open), orange (awaiting), red (closed). */
export function StatusBadge({ kind }: { kind: StatusKind }) {
  const s = STYLES[kind];
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

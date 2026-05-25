'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TickerLogo } from '@/components/TickerLogo';

function fmt(n: number, digits = 2): string {
  return n.toLocaleString('en-IE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

interface Row {
  /** Stable React key — use ticker if unique within the modal. */
  key: string;
  ticker: string;
  name: string | null;
  amount: number;
  /** Render a small "estimated" badge under the amount. */
  isEstimate: boolean;
}

export interface EventDetailModalProps {
  title: string;
  total: number;
  rows: Row[];
  onClose: () => void;
}

/**
 * Centered, scrollable, ESC- and backdrop-dismissible modal showing every
 * dividend payment for a period. Portal'd to <body> so it escapes any
 * ancestor stacking context (e.g. the `.scroll` wrapper's keyframe-transform
 * which would otherwise capture position:fixed).
 */
export function EventDetailModal({ title, total, rows, onClose }: EventDetailModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="cdn-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="cdn-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cdn-event-modal-title"
      >
        <button
          type="button"
          className="cdn-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className="cdn-modal-h">
          <span id="cdn-event-modal-title">{title}</span>
          <span className="num">€{fmt(total, 2)}</span>
        </div>
        <div className="cdn-modal-meta">
          {rows.length} payment{rows.length === 1 ? '' : 's'}
        </div>
        <div className="cdn-modal-list">
          {rows.map((r) => (
            <div key={r.key} className="cdn-modal-row">
              <div className="left">
                <TickerLogo ticker={r.ticker} size={28} />
                <div style={{ minWidth: 0 }}>
                  <div className="t">{r.ticker}</div>
                  {r.name && <div className="n">{r.name}</div>}
                </div>
              </div>
              <div className="right">
                <div className="amt">€{fmt(r.amount, 2)}</div>
                {r.isEstimate && <div className="proj">estimated</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export interface EventHoverHintProps {
  title: string;
  total: number;
  count: number;
  anchorX: number;
  anchorY: number;
  /** "top" anchors above the cursor; "right" anchors to the right of it. */
  side?: 'top' | 'right';
}

/**
 * Slim hover tooltip used to teach the click affordance. Says
 * "Click to see all →" so users learn the click pattern on first hover.
 * Pointer-events:none so it never blocks clicks on the underlying element.
 * Portal'd to <body> for the same reason as the modal.
 */
export function EventHoverHint({
  title, total, count, anchorX, anchorY, side = 'right',
}: EventHoverHintProps) {
  if (typeof document === 'undefined') return null;

  const TOOLTIP_MAX_W = 220;
  const GAP = 10;

  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1100,
    pointerEvents: 'none',
    maxWidth: TOOLTIP_MAX_W,
  };

  if (side === 'top') {
    // Hint above the anchor, horizontally centered. Flip below if there
    // isn't comfortable room above (e.g., chart near the top of viewport).
    const flipDown = anchorY - GAP < 90;
    style.left = anchorX;
    if (flipDown) {
      style.top = anchorY + GAP;
      style.transform = 'translate(-50%, 0)';
    } else {
      style.top = anchorY - GAP;
      style.transform = 'translate(-50%, -100%)';
    }
  } else {
    // Hint to the right of the anchor, vertically centered. Flip left
    // if it would overflow the viewport on the right.
    const flipLeft = anchorX + GAP + TOOLTIP_MAX_W > window.innerWidth - 16;
    style.top = anchorY;
    if (flipLeft) {
      style.left = anchorX - GAP;
      style.transform = 'translate(-100%, -50%)';
    } else {
      style.left = anchorX + GAP;
      style.transform = 'translateY(-50%)';
    }
  }

  return createPortal(
    <div className="cdn-hover-hint" style={style} role="tooltip">
      <div className="t">{title}</div>
      <div className="meta">
        €{fmt(total, 2)} · {count} payment{count === 1 ? '' : 's'}
      </div>
      <div className="cta">Click to see all →</div>
    </div>,
    document.body,
  );
}

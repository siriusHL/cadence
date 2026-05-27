'use client';

import { useState, useRef, useLayoutEffect, useCallback, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  label: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Small "i" icon that reveals a plain-language explanation on hover/focus.
 * The bubble renders through a portal so it escapes parent overflow:hidden
 * (the dashboard's .hero-stats uses overflow:hidden to mask grid-gap corners).
 */
// Conservative bubble half-width used to keep the bubble inside the viewport
// even before we've measured it. Matches the CSS max-width / 2.
const BUBBLE_HALF = 130;
const VIEWPORT_PAD = 12;

export function InfoTooltip({ label, size = 13, className, style }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; arrowOffset: number } | null>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const center = r.left + r.width / 2;
    // Clamp the bubble's center so it never spills past the viewport edges.
    const minCenter = BUBBLE_HALF + VIEWPORT_PAD;
    const maxCenter = window.innerWidth - BUBBLE_HALF - VIEWPORT_PAD;
    const clamped = Math.max(minCenter, Math.min(maxCenter, center));
    // arrowOffset = how far the icon center is from the bubble center, so we
    // can keep the little arrow pointing at the trigger even after clamping.
    setCoords({ top: r.top, left: clamped, arrowOffset: center - clamped });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  // After the bubble renders, measure it and tighten the clamp using the
  // ACTUAL width (often less than the 260px max). Also nudge the arrow back
  // toward the trigger if the measurement allowed more headroom.
  useLayoutEffect(() => {
    if (!open || !coords) return;
    const el = bubbleRef.current;
    const trigger = triggerRef.current;
    if (!el || !trigger) return;
    const r = trigger.getBoundingClientRect();
    const center = r.left + r.width / 2;
    const half = el.offsetWidth / 2;
    const minCenter = half + VIEWPORT_PAD;
    const maxCenter = window.innerWidth - half - VIEWPORT_PAD;
    const clamped = Math.max(minCenter, Math.min(maxCenter, center));
    if (clamped !== coords.left || center - clamped !== coords.arrowOffset) {
      setCoords({ top: r.top, left: clamped, arrowOffset: center - clamped });
    }
  }, [open, coords]);

  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  return (
    <span
      ref={triggerRef}
      className={`info-tip${className ? ` ${className}` : ''}`}
      tabIndex={0}
      role="button"
      aria-label={label}
      style={style}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="8" cy="4.6" r="0.9" fill="currentColor" />
        <rect x="7.25" y="6.8" width="1.5" height="5.2" rx="0.6" fill="currentColor" />
      </svg>
      {open && coords && typeof document !== 'undefined'
        ? createPortal(
            <span
              ref={bubbleRef}
              className="info-tip-bubble"
              role="tooltip"
              style={{
                top: coords.top,
                left: coords.left,
                // expose the arrow offset to CSS so the ::after pointer
                // tracks the icon, not the bubble's geometric centre.
                ['--arrow-offset' as string]: `${coords.arrowOffset}px`,
              }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

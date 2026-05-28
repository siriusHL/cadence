'use client';

import { useState, useRef, useLayoutEffect, useCallback, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  label: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** Lighten the bubble for use on dark surfaces (e.g. the year-heatmap card),
   *  where the default near-black bubble would blend into the background. */
  onDark?: boolean;
};

type Placement = 'top' | 'bottom';

interface Coords {
  /** Either the trigger's top (placement=top) or its bottom (placement=bottom).
   *  Combined with a CSS transform, this anchors the bubble flush against the
   *  trigger edge with an 8px gap. */
  anchor: number;
  left: number;
  arrowOffset: number;
  placement: Placement;
}

// Conservative bubble dimensions used to keep it inside the viewport BEFORE
// we've measured the rendered DOM. Width matches the CSS max-width / 2;
// height is a generous estimate for ~4 lines of body text.
const BUBBLE_HALF = 130;
const ESTIMATED_HEIGHT = 100;
const VIEWPORT_PAD = 12;
// Distance from trigger to bubble edge (matches the CSS transform offset).
const ANCHOR_GAP = 8;

/**
 * Small "i" icon that reveals a plain-language explanation on hover/focus.
 * The bubble renders through a portal so it escapes parent overflow:hidden
 * (the dashboard's .hero-stats uses overflow:hidden to mask grid-gap corners).
 * Placement flips top↔bottom when the preferred side would push the bubble
 * past the viewport edge.
 */
export function InfoTooltip({ label, size = 13, className, style, onDark }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  /**
   * Compute placement, anchor (top|bottom of trigger), clamped horizontal
   * center, and arrow offset. Pass a measured bubble height/half-width when
   * available; otherwise use the conservative defaults.
   */
  const computePosition = useCallback(
    (bubbleHeight: number, bubbleHalfWidth: number): Coords | null => {
      const el = triggerRef.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const minCenter = bubbleHalfWidth + VIEWPORT_PAD;
      const maxCenter = window.innerWidth - bubbleHalfWidth - VIEWPORT_PAD;
      const left = Math.max(minCenter, Math.min(maxCenter, center));
      // Prefer placing the bubble ABOVE the trigger. Flip below when there's
      // not enough room above AND there IS enough room below.
      const spaceAbove = r.top - VIEWPORT_PAD;
      const spaceBelow = window.innerHeight - r.bottom - VIEWPORT_PAD;
      const need = bubbleHeight + ANCHOR_GAP;
      const placement: Placement =
        spaceAbove < need && spaceBelow > spaceAbove ? 'bottom' : 'top';
      const anchor = placement === 'top' ? r.top : r.bottom;
      return { anchor, left, arrowOffset: center - left, placement };
    },
    [],
  );

  // First pass — runs as soon as the bubble should be visible. Uses
  // conservative dimensions so the bubble lands somewhere sensible without
  // a layout flash before the second pass measures the real size.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const next = computePosition(ESTIMATED_HEIGHT, BUBBLE_HALF);
      if (next) setCoords(next);
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, computePosition]);

  // Second pass — once the bubble is in the DOM, measure it and re-clamp
  // with the actual width/height. Skip the update if nothing changes so we
  // don't ping-pong setState.
  useLayoutEffect(() => {
    if (!open || !coords) return;
    const el = bubbleRef.current;
    if (!el) return;
    const next = computePosition(el.offsetHeight, el.offsetWidth / 2);
    if (!next) return;
    if (
      next.anchor !== coords.anchor ||
      next.left !== coords.left ||
      next.arrowOffset !== coords.arrowOffset ||
      next.placement !== coords.placement
    ) {
      setCoords(next);
    }
  }, [open, coords, computePosition]);

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
              className={`info-tip-bubble placement-${coords.placement}${onDark ? ' info-tip-bubble--on-dark' : ''}`}
              role="tooltip"
              style={{
                top: coords.anchor,
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

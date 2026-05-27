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
export function InfoTooltip({ label, size = 13, className, style }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.top, left: r.left + r.width / 2 });
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
              className="info-tip-bubble"
              role="tooltip"
              style={{ top: coords.top, left: coords.left }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

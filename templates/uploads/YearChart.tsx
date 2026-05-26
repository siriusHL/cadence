'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AddHoldingForm } from '@/components/AddHoldingForm';

interface Props {
  /** Label shown on the button. Defaults to "+ Add holding". */
  label?: string;
  /** Extra className appended to the trigger button. */
  buttonClassName?: string;
}

/**
 * "+ Add holding" button that opens a centred modal containing the same
 * form rendered at /app/add. Portal'd to <body> so it escapes any parent
 * stacking context.
 *
 * On a successful submit, the AddHoldingForm calls router.refresh() and
 * then our onSuccess closes the modal — the parent page (e.g. Holdings)
 * re-fetches its server data via the refresh so the new row appears
 * without a full page reload.
 */
export function AddHoldingTrigger({
  label = '+ Add holding',
  buttonClassName = 'btn',
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName}
        style={{ flexShrink: 0 }}
      >
        {label}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="cdn-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="presentation"
        >
          <div
            className="cdn-modal add-holding-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-holding-modal-title"
          >
            <button
              type="button"
              className="cdn-modal-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="cdn-modal-h" style={{ paddingRight: 38 }}>
              <span id="add-holding-modal-title">Add a holding</span>
            </div>
            <div className="cdn-modal-meta">
              Tell Cadence what you bought. Add multiple lots if you bought at
              different prices or on different days.
            </div>
            <div className="add-holding-modal-body">
              <AddHoldingForm onSuccess={() => setOpen(false)} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

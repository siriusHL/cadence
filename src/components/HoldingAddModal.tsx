'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AddHoldingForm } from '@/components/AddHoldingForm';

/**
 * Centred modal wrapping the same form rendered at /app/add. Pure
 * controlled component — caller owns `open` state and `onClose`. Use
 * this when the trigger button is somewhere we can't replace with the
 * built-in `<AddHoldingTrigger />` button-and-modal combo (e.g. the
 * mobile Holdings FAB which has its own styling).
 *
 * The form already calls `router.refresh()` on success so the host
 * page picks up the new row; we just close the modal afterwards.
 */
export interface HoldingAddModalProps {
  open: boolean;
  onClose: () => void;
}

export function HoldingAddModal({ open, onClose }: HoldingAddModalProps) {
  // Body scroll lock + ESC handler, mirrors HoldingEditModal pattern.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="cdn-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
          onClick={onClose}
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
          <AddHoldingForm onSuccess={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

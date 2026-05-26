'use client';

import { useState } from 'react';
import { HoldingAddModal } from '@/components/HoldingAddModal';

interface Props {
  /** Label shown on the button. Defaults to "+ Add holding". */
  label?: string;
  /** Extra className appended to the trigger button. */
  buttonClassName?: string;
}

/**
 * "+ Add holding" button that opens a centred modal containing the same
 * form rendered at /app/add. Thin wrapper around `HoldingAddModal` for
 * the common case where you want a single button-and-modal combo on a
 * page (Holdings header, dashboard empty state, etc.).
 *
 * When you need a custom trigger (e.g. the mobile Holdings FAB which
 * has its own styling and isn't a normal button), use `HoldingAddModal`
 * directly with your own `open`/`onClose` state.
 */
export function AddHoldingTrigger({
  label = '+ Add holding',
  buttonClassName = 'btn',
}: Props) {
  const [open, setOpen] = useState(false);

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
      <HoldingAddModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

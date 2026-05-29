'use client';

import { useState } from 'react';
import { MessageComposer } from './MessageComposer';

/**
 * Inbox-style compose control: a "New message" button that reveals the
 * composer inline. On send, MessageComposer navigates to the new thread, so
 * this panel's open state naturally resets.
 */
export function NewMessagePanel() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn"
          onClick={() => setOpen((o) => !o)}
          style={{ cursor: 'pointer' }}
          aria-expanded={open}
        >
          {open ? 'Cancel' : '✎ New message'}
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 12 }}>
          <MessageComposer mode="new" />
        </div>
      )}
    </div>
  );
}

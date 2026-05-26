'use client';

// In-app replacements for window.confirm / window.alert that match the
// .cdn-free design language. Exposes two hooks:
//   const confirm = useConfirm();   const ok = await confirm({ title, body });
//   const toast   = useToast();     toast('Saved.');  toast('Failed.', 'error');

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ToastVariant = 'info' | 'error';

interface ToastEntry {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface DialogCtx {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  toast: (message: string, variant?: ToastVariant) => void;
}

const Ctx = createContext<DialogCtx | null>(null);

export function useConfirm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConfirm must be used inside <DialogProvider>');
  return ctx.confirm;
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <DialogProvider>');
  return ctx.toast;
}

// ─── Provider ──────────────────────────────────────────────────────────

interface ConfirmState extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const toastId = useRef(0);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => setConfirmState({ ...opts, resolve }));
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++toastId.current;
    setToasts((cur) => [...cur, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  // Esc closes the confirm dialog as a "cancel".
  useEffect(() => {
    if (!confirmState) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { confirmState.resolve(false); setConfirmState(null); }
      if (e.key === 'Enter')  { confirmState.resolve(true);  setConfirmState(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmState]);

  return (
    <Ctx.Provider value={{ confirm, toast }}>
      {children}
      {confirmState && (
        <ConfirmDialog
          state={confirmState}
          onResolve={(ok) => { confirmState.resolve(ok); setConfirmState(null); }}
        />
      )}
      <ToastStack toasts={toasts} />
    </Ctx.Provider>
  );
}

// ─── Confirm dialog ────────────────────────────────────────────────────

function ConfirmDialog({ state, onResolve }: { state: ConfirmState; onResolve: (ok: boolean) => void }) {
  const danger = state.destructive ?? false;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cdn-confirm-title"
      onClick={(e) => { if (e.target === e.currentTarget) onResolve(false); }}
      style={{
        // Sits above any other modal (.cdn-modal-backdrop is z-index 1000) —
        // a confirm/alert is an interruption, it must never end up underneath.
        position: 'fixed', inset: 0, zIndex: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        background: 'rgba(20, 20, 22, 0.32)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'cdn-fade-in 140ms ease-out',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 400,
          background: 'var(--surface)',
          borderRadius: 16,
          padding: '22px 24px 20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.40), 0 4px 14px rgba(0,0,0,0.18)',
          animation: 'cdn-pop-in 160ms cubic-bezier(0.2, 0.8, 0.2, 1.05)',
        }}
      >
        <div
          id="cdn-confirm-title"
          style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}
        >
          {state.title}
        </div>
        {state.body && (
          <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: 'var(--text-muted)' }}>
            {state.body}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          <button type="button" className="btn ghost" onClick={() => onResolve(false)}>
            {state.cancelLabel ?? 'Cancel'}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => onResolve(true)}
            style={{
              display: 'inline-flex', alignItems: 'center',
              height: 36, padding: '0 18px',
              background: danger ? 'var(--danger)' : 'var(--btn-primary-bg)',
              color: danger ? '#fff' : 'var(--btn-primary-text)',
              borderRadius: 999,
              fontSize: 14, fontWeight: 500,
              border: 0, cursor: 'pointer',
              transition: 'opacity 150ms ease, transform 80ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {state.confirmLabel ?? (danger ? 'Delete' : 'OK')}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes cdn-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cdn-pop-in {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Toast stack ───────────────────────────────────────────────────────

function ToastStack({ toasts }: { toasts: ToastEntry[] }) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        // Above confirms — toasts are the highest-priority transient UI.
        position: 'fixed', right: 24, bottom: 24, zIndex: 1200,
        display: 'flex', flexDirection: 'column-reverse', gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            pointerEvents: 'auto',
            minWidth: 240, maxWidth: 380,
            padding: '12px 16px',
            background: 'var(--surface)',
            borderRadius: 12,
            borderLeft: `3px solid ${t.variant === 'error' ? 'var(--danger)' : 'var(--accent)'}`,
            boxShadow: 'var(--shadow-elev)',
            fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4,
            animation: 'cdn-toast-in 180ms ease-out',
          }}
        >
          {t.message}
        </div>
      ))}
      <style>{`
        @keyframes cdn-toast-in {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './DialogProvider';
import type { Screen } from '@/lib/tiers';

type Theme = 'light' | 'dark' | 'system';

interface ScreenOption { value: Screen; label: string; }

interface Props {
  initial: {
    theme: Theme;
    defaultScreen: Screen | null;
  };
  screenOptions: ScreenOption[];
}

const THEME_OPTIONS: { value: Theme; label: string; hint: string }[] = [
  { value: 'light',  label: 'Light',  hint: 'Always light' },
  { value: 'dark',   label: 'Dark',   hint: 'Always dark' },
  { value: 'system', label: 'System', hint: 'Match OS' },
];

export function SettingsForm({ initial, screenOptions }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [theme, setTheme] = useState<Theme>(initial.theme);
  const [defaultScreen, setDefaultScreen] = useState<Screen | ''>(initial.defaultScreen ?? '');

  function applyThemeNow(next: Theme) {
    // Update the cookie so the boot script picks the right theme on next load.
    document.cookie = `theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    // Apply immediately so the page updates without a reload.
    let effective: 'light' | 'dark' = 'light';
    if (next === 'dark') effective = 'dark';
    else if (next === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (effective === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }

  function pickTheme(next: Theme) {
    const previous = theme;
    setTheme(next);
    applyThemeNow(next);
    start(async () => {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ theme: next }),
      });
      if (!res.ok) {
        toast('Could not save theme.', 'error');
        setTheme(previous);
        applyThemeNow(previous);
        return;
      }
      toast('Theme updated.');
    });
  }

  function pickLanding(next: Screen | '') {
    const previous = defaultScreen;
    setDefaultScreen(next);
    start(async () => {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ default_screen: next === '' ? null : next }),
      });
      if (!res.ok) {
        toast('Could not save landing screen.', 'error');
        setDefaultScreen(previous);
        return;
      }
      toast('Landing screen updated.');
      router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="pcard">
        <div className="pcard-h">
          <div className="t">Appearance</div>
        </div>
        <div style={{ padding: 16 }}>
          <Label>Theme</Label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginTop: 8,
            }}
          >
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => pickTheme(opt.value)}
                  disabled={pending}
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    background: active ? 'var(--surface-2)' : 'var(--surface)',
                    border: `1px solid ${active ? 'var(--text)' : 'var(--border-strong)'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    color: 'var(--text)',
                    transition: 'border-color 120ms, background 120ms',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</div>
                  <div style={{ marginTop: 2, fontSize: 12, color: 'var(--text-muted)' }}>{opt.hint}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <div className="t">Default landing screen</div>
        </div>
        <div style={{ padding: 16 }}>
          <Label>After login (and when you click the Cadence logo), open…</Label>
          <select
            value={defaultScreen}
            onChange={(e) => pickLanding(e.target.value as Screen | '')}
            disabled={pending}
            style={{
              marginTop: 8,
              width: '100%',
              padding: '10px 12px',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              fontSize: 14,
              color: 'var(--text)',
            }}
          >
            <option value="">Home (default)</option>
            {screenOptions
              .filter((s) => s.value !== 'home')
              .map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
          </select>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Only screens available on your plan are listed.
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {children}
    </div>
  );
}

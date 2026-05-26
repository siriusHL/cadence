'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './DialogProvider';
import type { Screen } from '@/lib/tiers';

type Contrast = 'soft' | 'standard' | 'sharp';
type BgTone   = 'cream' | 'neutral' | 'cool';

interface ScreenOption { value: Screen; label: string; }

interface Props {
  initial: {
    contrast: Contrast;
    bgTone: BgTone;
    defaultScreen: Screen | null;
    incomeTarget: number;
  };
  screenOptions: ScreenOption[];
}

const CONTRAST_OPTIONS: { value: Contrast; label: string; hint: string }[] = [
  { value: 'soft',     label: 'Soft',     hint: 'Lighter text, gentler borders' },
  { value: 'standard', label: 'Standard', hint: 'Balanced — the default' },
  { value: 'sharp',    label: 'Sharp',    hint: 'Darker text, crisper edges' },
];

const BG_OPTIONS: { value: BgTone; label: string; hint: string; swatch: string }[] = [
  { value: 'cream',   label: 'Cream',   hint: 'Warm off-white',  swatch: '#fbfaf7' },
  { value: 'neutral', label: 'Neutral', hint: 'Pure pale gray',  swatch: '#f7f7f8' },
  { value: 'cool',    label: 'Cool',    hint: 'Slight blue tint', swatch: '#f3f5f8' },
];

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function SettingsForm({ initial, screenOptions }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [contrast, setContrast] = useState<Contrast>(initial.contrast);
  const [bgTone,   setBgTone]   = useState<BgTone>(initial.bgTone);
  const [defaultScreen, setDefaultScreen] = useState<Screen | ''>(initial.defaultScreen ?? '');
  const [incomeTarget, setIncomeTarget] = useState<string>(String(initial.incomeTarget));

  function applyContrast(next: Contrast) {
    document.cookie = `contrast=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    if (next === 'standard') document.documentElement.removeAttribute('data-contrast');
    else document.documentElement.setAttribute('data-contrast', next);
  }

  function applyBgTone(next: BgTone) {
    document.cookie = `bg_tone=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    if (next === 'cream') document.documentElement.removeAttribute('data-bg-tone');
    else document.documentElement.setAttribute('data-bg-tone', next);
  }

  function pickContrast(next: Contrast) {
    const previous = contrast;
    setContrast(next);
    applyContrast(next);
    start(async () => {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contrast: next }),
      });
      if (!res.ok) {
        toast('Could not save contrast.', 'error');
        setContrast(previous);
        applyContrast(previous);
        return;
      }
      toast('Contrast updated.');
    });
  }

  function pickBgTone(next: BgTone) {
    const previous = bgTone;
    setBgTone(next);
    applyBgTone(next);
    start(async () => {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bg_tone: next }),
      });
      if (!res.ok) {
        toast('Could not save background tone.', 'error');
        setBgTone(previous);
        applyBgTone(previous);
        return;
      }
      toast('Background tone updated.');
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

  function saveIncomeTarget() {
    const n = Number(incomeTarget);
    if (!Number.isFinite(n) || n <= 0) {
      toast('Enter a positive number.', 'error');
      return;
    }
    start(async () => {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ income_target: n }),
      });
      if (!res.ok) {
        toast('Could not save target.', 'error');
        return;
      }
      toast('Passive income target updated.');
      router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="pcard">
        <div className="pcard-h">
          <div className="t">Contrast</div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {CONTRAST_OPTIONS.map((opt) => {
              const active = contrast === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => pickContrast(opt.value)}
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
          <div className="t">Background tone</div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {BG_OPTIONS.map((opt) => {
              const active = bgTone === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => pickBgTone(opt.value)}
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: opt.swatch,
                      border: '1px solid var(--border-strong)',
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</div>
                    <div style={{ marginTop: 2, fontSize: 12, color: 'var(--text-muted)' }}>{opt.hint}</div>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <div className="t">Passive income target</div>
        </div>
        <div style={{ padding: 16 }}>
          <Label>Annual dividend income you&rsquo;re aiming for</Label>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>€</span>
            <input
              type="number"
              min={1}
              step={1000}
              value={incomeTarget}
              onChange={(e) => setIncomeTarget(e.target.value)}
              onBlur={() => {
                if (Number(incomeTarget) !== initial.incomeTarget) saveIncomeTarget();
              }}
              disabled={pending}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-strong)',
                borderRadius: 8,
                fontSize: 14,
                color: 'var(--text)',
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>/ year</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Used as the goal line on the Simulator and the &quot;Passive income progress&quot; card
            on Dashboard. Saved when you tab/click away.
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

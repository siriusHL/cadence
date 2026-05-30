'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { type AnnouncementEffect } from '@/lib/announcementThemes';

// Full-screen, non-interactive ambient particle layer for themed announcements.
// Particles are generated on the client only (after mount) so randomized
// positions never cause a hydration mismatch, and the whole layer is skipped
// for users who prefer reduced motion.

interface Spec { count: number; build: (i: number) => React.CSSProperties }

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const CONFETTI_COLORS = ['#ffd86b', '#ff6b6b', '#4dd4ac', '#5b8cff', '#fff'];

const SPECS: Partial<Record<AnnouncementEffect, Spec>> = {
  snow: {
    count: 40,
    build: () => cssVars({
      '--x': `${rand(0, 100)}%`,
      '--sz': `${rand(4, 11)}px`,
      '--dur': `${rand(6, 13)}s`,
      '--delay': `${rand(-13, 0)}s`,
      '--sway': `${rand(-40, 40)}px`,
      '--o': `${rand(0.5, 0.95)}`,
    }),
  },
  confetti: {
    count: 70,
    build: (i) => cssVars({
      '--x': `${rand(0, 100)}%`,
      '--sz': `${rand(6, 11)}px`,
      '--dur': `${rand(4, 9)}s`,
      '--delay': `${rand(-9, 0)}s`,
      '--c': CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }),
  },
  sparks: {
    count: 24,
    build: () => cssVars({
      '--x': `${rand(0, 100)}%`,
      '--sz': `${rand(3, 6)}px`,
      '--dur': `${rand(7, 13)}s`,
      '--delay': `${rand(-13, 0)}s`,
      '--sway': `${rand(-30, 30)}px`,
    }),
  },
  hearts: {
    count: 18,
    build: () => cssVars({
      '--x': `${rand(0, 100)}%`,
      '--sz': `${rand(12, 24)}px`,
      '--dur': `${rand(7, 13)}s`,
      '--delay': `${rand(-13, 0)}s`,
      '--sway': `${rand(-50, 50)}px`,
    }),
  },
  embers: {
    count: 30,
    build: () => cssVars({
      '--x': `${rand(0, 100)}%`,
      '--sz': `${rand(3, 7)}px`,
      '--dur': `${rand(8, 15)}s`,
      '--delay': `${rand(-15, 0)}s`,
      '--sway': `${rand(-40, 40)}px`,
    }),
  },
  rays: {
    count: 5,
    build: (i) => cssVars({
      '--x': `${i * 22 - 10}%`,
      '--dur': `${rand(9, 14)}s`,
      '--delay': `${-i * 2.5}s`,
    }),
  },
};

// Client-only flag (false on the server + initial hydration, true after) so the
// randomized particles never cause a hydration mismatch — without setState in
// an effect. Same useSyncExternalStore pattern tracks the reduced-motion query.
const noopSubscribe = () => () => {};

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

export function AnnouncementFX({ effect }: { effect: AnnouncementEffect }) {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const reduced = useReducedMotion();

  const spec = SPECS[effect];
  const particles = useMemo(
    () => (spec ? Array.from({ length: spec.count }, (_, i) => spec.build(i)) : []),
    [spec],
  );

  if (!isClient || reduced || !spec) return null;

  return (
    <div className={`cdn-fx ${effect}`} aria-hidden="true">
      {particles.map((style, i) => <i key={i} style={style} />)}
    </div>
  );
}

// CSS custom properties aren't in React.CSSProperties' type; cast through.
function cssVars(vars: Record<string, string>): React.CSSProperties {
  return vars as React.CSSProperties;
}

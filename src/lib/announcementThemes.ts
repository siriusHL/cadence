// Themed announcement banners. Each theme maps to a banner CSS modifier class
// (.cdn-announce--<key>), an ambient particle effect rendered over the app
// shell, and a preview gradient for the admin picker. Adding a theme here +
// its CSS is all that's needed — no migration (the column is free text).

export type AnnouncementTheme =
  | 'default' | 'christmas' | 'black_friday' | 'new_year'
  | 'valentines' | 'halloween' | 'summer';

export type AnnouncementEffect =
  | 'none' | 'snow' | 'confetti' | 'hearts' | 'embers' | 'rays' | 'sparks';

interface ThemeDef {
  label: string;
  effect: AnnouncementEffect;
  /** CSS gradient for the admin preview swatch (mirrors --ann-bg in globals.css). */
  previewBg: string;
  previewText: string;
}

export const ANNOUNCEMENT_THEMES: Record<AnnouncementTheme, ThemeDef> = {
  default: {
    label: 'Default (brand)',
    effect: 'none',
    previewBg: 'linear-gradient(90deg, oklch(0.48 0.08 175), oklch(0.55 0.12 175), oklch(0.48 0.08 175))',
    previewText: '#fff',
  },
  christmas: {
    label: 'Christmas — snow',
    effect: 'snow',
    previewBg: 'linear-gradient(90deg, #9b1c1c, #d62f2f, #9b1c1c)',
    previewText: '#fff',
  },
  black_friday: {
    label: 'Black Friday — gold shine',
    effect: 'sparks',
    previewBg: 'linear-gradient(90deg, #0a0a0a, #1d1d1f, #0a0a0a)',
    previewText: '#f5c451',
  },
  new_year: {
    label: 'New Year — confetti',
    effect: 'confetti',
    previewBg: 'linear-gradient(90deg, #0b1437, #1b2a6b, #0b1437)',
    previewText: '#ffd86b',
  },
  valentines: {
    label: "Valentine's — hearts",
    effect: 'hearts',
    previewBg: 'linear-gradient(90deg, #c2185b, #e91e63, #c2185b)',
    previewText: '#fff',
  },
  halloween: {
    label: 'Halloween — embers',
    effect: 'embers',
    previewBg: 'linear-gradient(90deg, #1a1020, #3a1d4d, #1a1020)',
    previewText: '#ff8c1a',
  },
  summer: {
    label: 'Summer sale — rays',
    effect: 'rays',
    previewBg: 'linear-gradient(90deg, #ff7043, #ffb74d, #ff7043)',
    previewText: '#fff',
  },
};

export const ANNOUNCEMENT_THEME_KEYS = Object.keys(ANNOUNCEMENT_THEMES) as AnnouncementTheme[];

export function normalizeTheme(value: string | null | undefined): AnnouncementTheme {
  return value && value in ANNOUNCEMENT_THEMES ? (value as AnnouncementTheme) : 'default';
}

/** CSS class for the banner element for a given theme. */
export function bannerClass(theme: AnnouncementTheme): string {
  return theme === 'default' ? 'cdn-announce' : `cdn-announce cdn-announce--${theme}`;
}

export function effectFor(theme: AnnouncementTheme): AnnouncementEffect {
  return ANNOUNCEMENT_THEMES[theme].effect;
}

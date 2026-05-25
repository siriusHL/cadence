-- Replace the binary light/dark theme with two light-based dials:
--   * contrast  — how strongly text and borders stand out from the page
--   * bg_tone   — page background warmth (cream / neutral / cool)
-- Both default to 'standard' / 'cream' to match the historical look.

alter table profiles drop constraint if exists profiles_theme_check;
alter table profiles drop column if exists theme;

alter table profiles
  add column if not exists contrast text not null default 'standard'
    check (contrast in ('soft', 'standard', 'sharp')),
  add column if not exists bg_tone text not null default 'cream'
    check (bg_tone in ('cream', 'neutral', 'cool'));

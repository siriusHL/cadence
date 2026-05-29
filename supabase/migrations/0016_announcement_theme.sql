-- Themed announcement banners. A free-text key (validated in the app, not the
-- DB, so new themes don't need a migration) selecting palette + animation +
-- ambient effect for the site-wide banner. 'default' = the brand sheen.

alter table site_settings
  add column if not exists announcement_theme text not null default 'default';

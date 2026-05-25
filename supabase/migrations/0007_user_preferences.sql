-- User-facing preferences that live on the profile row.
--   * theme: light | dark | system (driven by the Settings page)
--   * default_screen: which screen to land on after login / clicking the brand

alter table profiles
  add column if not exists theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),
  add column if not exists default_screen text;

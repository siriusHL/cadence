-- Notification preferences live on the profile row alongside other
-- per-user dials. Categories mirror the alert grouping in src/lib/alerts.ts;
-- the Alerts page and the badge-count endpoint filter cards by these flags
-- so toggling immediately changes what the user sees in-app.
--
-- notify_email_frequency stores intent for the eventual digest job — no
-- mailer wired up today, just persists the user's preference so the job
-- doesn't need a backfill migration when it lands.

alter table profiles
  add column if not exists notify_dividend_events    boolean not null default true,
  add column if not exists notify_concentration      boolean not null default true,
  add column if not exists notify_tax_opportunities  boolean not null default true,
  add column if not exists notify_drawdown           boolean not null default true,
  add column if not exists notify_email_frequency    text    not null default 'off'
    check (notify_email_frequency in ('off', 'daily', 'weekly'));

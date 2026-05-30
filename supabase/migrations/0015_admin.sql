-- Admin dashboard support.
--   1. subscriptions.admin_tier_override — manual tier grant layered over the
--      Stripe-managed tier. Effective tier = override ?? tier.
--   2. site_settings — single-row config (maintenance mode + banner). Public
--      read (proxy/layout need it pre-auth); writes service-role only.
--   3. admin_audit_log — append-only; RLS on, no policies => service role only.

alter table subscriptions
  add column if not exists admin_tier_override tier_t;

create table if not exists site_settings (
  id                  int primary key default 1 check (id = 1),
  maintenance_mode    boolean not null default false,
  announcement        text,
  announcement_active boolean not null default false,
  updated_at          timestamptz not null default now(),
  updated_by          text
);
insert into site_settings (id) values (1) on conflict (id) do nothing;
alter table site_settings enable row level security;
create policy site_settings_read on site_settings for select using (true);

create table if not exists admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_email  text not null,
  action       text not null,
  target_type  text,
  target_id    text,
  meta         jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists admin_audit_log_created_at_idx
  on admin_audit_log (created_at desc);
alter table admin_audit_log enable row level security;

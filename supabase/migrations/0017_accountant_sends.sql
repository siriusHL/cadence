-- Send history for the Tax page "Send to accountant" action.
--
-- One row per email handed off to Resend, so the user gets a "last sent to X
-- on <date>" confirmation and a short history. User-owned + RLS-scoped (same
-- pattern as alert_suppressions); the app inserts through the caller's own
-- session, so no service-role write is needed.

create table accountant_sends (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles on delete cascade,
  recipient     text not null,
  fiscal_year   int  not null,
  subject       text not null,
  attached_pack boolean not null default false,
  created_at    timestamptz not null default now()
);

create index on accountant_sends (user_id, created_at desc);

alter table accountant_sends enable row level security;

create policy accountant_sends_self on accountant_sends
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

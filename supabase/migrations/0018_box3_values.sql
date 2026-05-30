-- Per-year portfolio value on 1 January, for the NL Box 3 tax estimate.
--
-- NL doesn't tax the dividend itself — it taxes a notional return on wealth
-- measured at 1 January of the fiscal year. The Tax page can't derive that
-- date-specific value from today's holdings (prices move, contributions land),
-- so the user records it here, once per year. User-owned + RLS self-scoped,
-- same pattern as alert_suppressions / accountant_sends.

create table box3_values (
  user_id      uuid not null references profiles on delete cascade,
  fiscal_year  int  not null,
  value_eur    numeric not null check (value_eur >= 0),
  updated_at   timestamptz not null default now(),
  primary key (user_id, fiscal_year)
);

alter table box3_values enable row level security;

create policy box3_values_self on box3_values
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

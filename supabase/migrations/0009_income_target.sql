-- Configurable passive-income target — drives the Simulator headline,
-- the Dashboard "Passive income progress" card, and any future widget
-- that compares forward income to a goal. €30,000/yr default matches
-- the previous hardcoded baseline.

alter table profiles
  add column if not exists income_target numeric(20, 2) not null default 30000
    check (income_target > 0);

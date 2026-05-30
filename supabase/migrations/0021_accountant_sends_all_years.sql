-- "Send all years" handoff — flags a send that covered every fiscal year (the
-- combined multi-year tax pack) rather than a single year. Lets the Tax page's
-- "last sent" line read "all years" instead of one year's number. Additive and
-- back-compatible: existing rows default to false (single-year sends).

alter table accountant_sends
  add column if not exists all_years boolean not null default false;

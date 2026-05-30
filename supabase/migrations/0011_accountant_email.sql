-- 0011_accountant_email.sql
-- Adds an optional accountant email to profiles. Used by the "Send to
-- accountant" action on the Tax page to pre-fill the recipient.

alter table public.profiles
  add column if not exists accountant_email text;

-- Personal profile details for the user-facing Profile page: legal name,
-- postal address, birth date, phone, and sex. display_name stays separate —
-- it's the casual name used in greetings; first/last name is the legal name.
-- All nullable: the app never forces a user to fill these in.
-- RLS is already covered by the existing profiles_self policy (for all).

alter table profiles
  add column if not exists first_name           text,
  add column if not exists last_name            text,
  add column if not exists birth_date           date,
  add column if not exists phone                text,
  -- null means "not set".
  add column if not exists sex                  text
    check (sex in ('female', 'male')),
  add column if not exists address_line1        text,
  add column if not exists address_line2        text,
  add column if not exists address_city         text,
  add column if not exists address_postal_code  text,
  -- ISO-2 country code, stored uppercase (same convention as tax_country).
  add column if not exists address_country      text;

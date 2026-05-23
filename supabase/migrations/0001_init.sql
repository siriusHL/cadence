-- Cadence — initial schema
-- Conventions:
--   * Money: numeric(20,6) for prices/amounts, numeric(20,8) for FX rates.
--   * Tier is enforced at the DB layer via RLS so client cannot bypass.
--   * subscriptions.tier is written only by the Stripe webhook (service role).

create extension if not exists "pgcrypto";

------------------------------------------------------------------------------
-- Identity & billing
------------------------------------------------------------------------------

create table profiles (
  id              uuid primary key references auth.users on delete cascade,
  display_name    text,
  base_currency   text not null default 'EUR',
  tax_country     text,
  created_at      timestamptz not null default now()
);

create type tier_t as enum ('free', 'premium', 'elite');

create table subscriptions (
  user_id                 uuid primary key references profiles on delete cascade,
  tier                    tier_t not null default 'free',
  status                  text not null default 'active',
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  updated_at              timestamptz not null default now()
);

-- Auto-create profile + free subscription on signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id);
  insert into subscriptions (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

------------------------------------------------------------------------------
-- Portfolios, holdings, transactions
------------------------------------------------------------------------------

create table portfolios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create index on portfolios (user_id);

create table holdings (
  id            uuid primary key default gen_random_uuid(),
  portfolio_id  uuid not null references portfolios on delete cascade,
  ticker        text not null,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (portfolio_id, ticker)
);

create index on holdings (portfolio_id);
create index on holdings (ticker);

create type tx_kind as enum ('buy', 'sell', 'dividend', 'split', 'fee');

create table transactions (
  id                  uuid primary key default gen_random_uuid(),
  portfolio_id        uuid not null references portfolios on delete cascade,
  ticker              text not null,
  kind                tx_kind not null,
  occurred_on         date not null,
  quantity            numeric(20,6) not null default 0,
  price_local         numeric(20,6) not null default 0,
  fee_local           numeric(20,6) not null default 0,
  withholding_local   numeric(20,6) not null default 0,
  fx_to_base          numeric(20,8) not null default 1,
  created_at          timestamptz not null default now()
);

create index on transactions (portfolio_id, ticker);
create index on transactions (occurred_on);

------------------------------------------------------------------------------
-- Shared instrument cache (one row per ticker, shared across all users)
------------------------------------------------------------------------------

create table instruments (
  ticker        text primary key,
  name          text,
  exchange      text,
  country       text,
  sector        text,
  industry      text,
  currency      text,
  payout_freq   int,
  updated_at    timestamptz not null default now()
);

create table instrument_quotes (
  ticker      text primary key references instruments on delete cascade,
  price       numeric(20,6),
  change_pct  numeric(10,4),
  as_of       timestamptz not null default now()
);

create table instrument_dividends (
  ticker        text not null references instruments on delete cascade,
  ex_date       date not null,
  pay_date      date,
  amount_local  numeric(20,6) not null,
  primary key (ticker, ex_date)
);

create table instrument_fundamentals (
  ticker                text primary key references instruments on delete cascade,
  fwd_div_annual_local  numeric(20,6),
  fwd_yield_pct         numeric(10,4),
  payout_ratio          numeric(10,4),
  div_growth_5y         numeric(10,4),
  streak_years          int,
  debt_equity           numeric(10,4),
  beta                  numeric(10,4),
  cadence_score         int,
  updated_at            timestamptz not null default now()
);

create table fx_rates (
  base    text not null,
  quote   text not null,
  rate    numeric(20,8) not null,
  as_of   timestamptz not null default now(),
  primary key (base, quote)
);

------------------------------------------------------------------------------
-- Elite-only
------------------------------------------------------------------------------

create table alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles on delete cascade,
  ticker      text not null,
  kind        text not null check (kind in ('price_above','price_below','ex_div_in_days')),
  threshold   numeric(20,6) not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index on alerts (user_id) where active;

------------------------------------------------------------------------------
-- Tier-aware helper
------------------------------------------------------------------------------

create or replace function current_tier() returns tier_t
language sql stable as $$
  select tier from subscriptions where user_id = auth.uid()
$$;

create or replace function holdings_cap_for_current_user() returns int
language sql stable as $$
  select case current_tier()
    when 'free'    then 10
    when 'premium' then 100
    else 2147483647
  end
$$;

create or replace function portfolios_cap_for_current_user() returns int
language sql stable as $$
  select case current_tier()
    when 'free'    then 1
    when 'premium' then 3
    else 2147483647
  end
$$;

------------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------------

alter table profiles                enable row level security;
alter table subscriptions           enable row level security;
alter table portfolios              enable row level security;
alter table holdings                enable row level security;
alter table transactions            enable row level security;
alter table alerts                  enable row level security;
alter table instruments             enable row level security;
alter table instrument_quotes       enable row level security;
alter table instrument_dividends    enable row level security;
alter table instrument_fundamentals enable row level security;
alter table fx_rates                enable row level security;

-- Profiles: a user reads/updates only their own row
create policy profiles_self on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Subscriptions: read own row only; writes restricted to service role (Stripe webhook)
create policy subs_select_self on subscriptions
  for select using (user_id = auth.uid());

-- Portfolios: full CRUD on own rows; insert blocked when over tier cap
create policy portfolios_select on portfolios
  for select using (user_id = auth.uid());
create policy portfolios_insert on portfolios
  for insert with check (
    user_id = auth.uid()
    and (select count(*) from portfolios where user_id = auth.uid())
        < portfolios_cap_for_current_user()
  );
create policy portfolios_update on portfolios
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy portfolios_delete on portfolios
  for delete using (user_id = auth.uid());

-- Holdings: scoped via portfolio ownership; insert capped by tier
create policy holdings_select on holdings
  for select using (exists (
    select 1 from portfolios p where p.id = portfolio_id and p.user_id = auth.uid()
  ));
create policy holdings_insert on holdings
  for insert with check (
    exists (select 1 from portfolios p where p.id = portfolio_id and p.user_id = auth.uid())
    and (
      select count(*) from holdings h
        join portfolios p on p.id = h.portfolio_id
       where p.user_id = auth.uid()
    ) < holdings_cap_for_current_user()
  );
create policy holdings_update on holdings
  for update using (exists (
    select 1 from portfolios p where p.id = portfolio_id and p.user_id = auth.uid()
  ));
create policy holdings_delete on holdings
  for delete using (exists (
    select 1 from portfolios p where p.id = portfolio_id and p.user_id = auth.uid()
  ));

-- Transactions: same shape as holdings, no extra cap (cap is on holdings)
create policy transactions_all on transactions
  for all using (exists (
    select 1 from portfolios p where p.id = portfolio_id and p.user_id = auth.uid()
  )) with check (exists (
    select 1 from portfolios p where p.id = portfolio_id and p.user_id = auth.uid()
  ));

-- Alerts: Elite-only writes, but read by owner. Server route also gates the feature.
create policy alerts_select on alerts
  for select using (user_id = auth.uid());
create policy alerts_write on alerts
  for all using (user_id = auth.uid() and current_tier() = 'elite')
        with check (user_id = auth.uid() and current_tier() = 'elite');

-- Instrument cache: readable by any authenticated user; writes restricted to service role.
create policy instruments_read         on instruments             for select using (true);
create policy instrument_quotes_read   on instrument_quotes       for select using (true);
create policy instrument_divs_read     on instrument_dividends    for select using (true);
create policy instrument_funds_read    on instrument_fundamentals for select using (true);
create policy fx_rates_read            on fx_rates                for select using (true);

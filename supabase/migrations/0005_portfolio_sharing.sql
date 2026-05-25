-- Portfolio sharing: Elite-only feature granting read-only access to a portfolio
-- and all its child rows (holdings, transactions) to another user.
--
-- RLS design:
--   * SECURITY DEFINER helpers (user_owns_portfolio, user_has_share) read past
--     RLS on the referenced table so policies in either direction don't recurse.
--   * Owners always retain full CRUD. Share recipients only get SELECT.

create table portfolio_shares (
  id                      uuid primary key default gen_random_uuid(),
  portfolio_id            uuid not null references portfolios on delete cascade,
  shared_with_user_id     uuid not null references profiles on delete cascade,
  role                    text not null default 'viewer' check (role in ('viewer')),
  created_at              timestamptz not null default now(),
  unique (portfolio_id, shared_with_user_id)
);

create index on portfolio_shares (shared_with_user_id);
create index on portfolio_shares (portfolio_id);

alter table portfolio_shares enable row level security;

------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------

create or replace function user_owns_portfolio(uid uuid, pid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from portfolios where id = pid and user_id = uid)
$$;

create or replace function user_has_share(uid uuid, pid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from portfolio_shares
    where portfolio_id = pid and shared_with_user_id = uid
  )
$$;

create or replace function user_can_read_portfolio(uid uuid, pid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select user_owns_portfolio(uid, pid) or user_has_share(uid, pid)
$$;

------------------------------------------------------------------------------
-- portfolio_shares policies
------------------------------------------------------------------------------

-- Owner sees all shares they granted; recipient sees shares granted to them.
create policy shares_select on portfolio_shares
  for select using (
    user_owns_portfolio(auth.uid(), portfolio_id)
    or shared_with_user_id = auth.uid()
  );

-- Only the portfolio owner can grant shares, and only on Elite tier.
create policy shares_insert on portfolio_shares
  for insert with check (
    user_owns_portfolio(auth.uid(), portfolio_id)
    and current_tier() = 'elite'
  );

-- Owner can revoke any share; recipient can remove themselves.
create policy shares_delete on portfolio_shares
  for delete using (
    user_owns_portfolio(auth.uid(), portfolio_id)
    or shared_with_user_id = auth.uid()
  );

------------------------------------------------------------------------------
-- Extend read policies on portfolios / holdings / transactions
------------------------------------------------------------------------------

drop policy if exists portfolios_select on portfolios;
create policy portfolios_select on portfolios
  for select using (
    user_id = auth.uid()
    or user_has_share(auth.uid(), id)
  );

drop policy if exists holdings_select on holdings;
create policy holdings_select on holdings
  for select using (user_can_read_portfolio(auth.uid(), portfolio_id));

-- transactions previously used a single FOR ALL policy. Split it so share
-- recipients can read but never write.
drop policy if exists transactions_all on transactions;

create policy transactions_select on transactions
  for select using (user_can_read_portfolio(auth.uid(), portfolio_id));

create policy transactions_write on transactions
  for all using (user_owns_portfolio(auth.uid(), portfolio_id))
        with check (user_owns_portfolio(auth.uid(), portfolio_id));

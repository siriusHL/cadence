-- Fix: holdings_insert and portfolios_insert policies referenced their own tables
-- in WITH CHECK sub-selects, causing infinite RLS recursion on INSERT.
-- Solution: move the counts into SECURITY DEFINER helper functions that run as
-- the function owner and therefore bypass RLS while evaluating.

create or replace function user_holdings_count(uid uuid) returns int
language sql security definer set search_path = public as $$
  select count(*)::int
    from holdings h
    join portfolios p on p.id = h.portfolio_id
   where p.user_id = uid
$$;

create or replace function user_portfolios_count(uid uuid) returns int
language sql security definer set search_path = public as $$
  select count(*)::int from portfolios where user_id = uid
$$;

drop policy if exists holdings_insert on holdings;
create policy holdings_insert on holdings
  for insert with check (
    exists (select 1 from portfolios p where p.id = portfolio_id and p.user_id = auth.uid())
    and user_holdings_count(auth.uid()) < holdings_cap_for_current_user()
  );

drop policy if exists portfolios_insert on portfolios;
create policy portfolios_insert on portfolios
  for insert with check (
    user_id = auth.uid()
    and user_portfolios_count(auth.uid()) < portfolios_cap_for_current_user()
  );

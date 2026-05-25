-- Undo 0005_portfolio_sharing.sql.
-- Restores the original owner-only RLS posture on portfolios/holdings/transactions
-- and removes the portfolio_shares table + helper functions.

------------------------------------------------------------------------------
-- Restore read policies (owner-only)
------------------------------------------------------------------------------

drop policy if exists portfolios_select on portfolios;
create policy portfolios_select on portfolios
  for select using (user_id = auth.uid());

drop policy if exists holdings_select on holdings;
create policy holdings_select on holdings
  for select using (exists (
    select 1 from portfolios p where p.id = portfolio_id and p.user_id = auth.uid()
  ));

-- transactions: collapse the split (select/write) back into one FOR ALL policy.
drop policy if exists transactions_select on transactions;
drop policy if exists transactions_write  on transactions;
create policy transactions_all on transactions
  for all using (exists (
    select 1 from portfolios p where p.id = portfolio_id and p.user_id = auth.uid()
  )) with check (exists (
    select 1 from portfolios p where p.id = portfolio_id and p.user_id = auth.uid()
  ));

------------------------------------------------------------------------------
-- Drop sharing artifacts
------------------------------------------------------------------------------

drop policy if exists shares_select on portfolio_shares;
drop policy if exists shares_insert on portfolio_shares;
drop policy if exists shares_delete on portfolio_shares;

drop table if exists portfolio_shares;

drop function if exists user_can_read_portfolio(uuid, uuid);
drop function if exists user_has_share(uuid, uuid);
drop function if exists user_owns_portfolio(uuid, uuid);

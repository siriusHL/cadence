-- Staff roles. Replaces the env-allowlist approach for the support board: the
-- role now lives in the data model so RLS can enforce it (the support board's
-- whole job is cross-user reads, which env vars can't authorize at the DB layer).
--
--   'user'    — default; an ordinary customer.
--   'support' — can read every thread and reply from the support board.
--   'admin'   — reserved for a future user-management area; superset of support.
--
-- The column is writable only by the service role (like subscriptions.tier),
-- so a customer can't promote themselves.

create type user_role as enum ('user', 'support', 'admin');

alter table profiles add column role user_role not null default 'user';

-- A customer may update their own profile (display_name, etc.) under the
-- existing profiles_self policy, which would also let them set their own role.
-- A column REVOKE can't stop this (the table-wide UPDATE grant subsumes it), so
-- a trigger rejects role changes from API roles. The service-role client (and
-- direct superuser connections, where auth.role() is null) bypass it, so staff
-- are provisioned server-side only.
create or replace function public.profiles_guard_role() returns trigger
language plpgsql as $$
begin
  if new.role is distinct from old.role
     and auth.role() in ('authenticated', 'anon') then
    raise exception 'profiles.role can only be changed by the service role';
  end if;
  return new;
end $$;

create trigger profiles_guard_role_update
  before update on profiles
  for each row execute function public.profiles_guard_role();

-- SECURITY DEFINER so the lookup runs as the owner and bypasses RLS on profiles
-- — avoids the policy recursion that bit the holdings/portfolios inserts (0002).
create or replace function public.is_support(uid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from profiles where id = uid and role in ('support', 'admin')
  );
$$;

-- Support sees and manages every thread; ordinary customers keep their own-row
-- policies from 0012 (permissive policies are OR'd, so support gains the union).
create policy message_threads_support_select on message_threads
  for select using (public.is_support(auth.uid()));
create policy message_threads_support_update on message_threads
  for update using (public.is_support(auth.uid()))
          with check (public.is_support(auth.uid()));

-- Support reads every message and may post support-authored replies. This also
-- makes Realtime postgres_changes deliver every insert to a support subscriber
-- (RLS is evaluated per subscriber), so the board needs no broadcast workaround.
create policy messages_support_select on messages
  for select using (public.is_support(auth.uid()));
create policy messages_support_insert on messages
  for insert with check (sender = 'support' and public.is_support(auth.uid()));

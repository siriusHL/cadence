-- Two-way support messaging ("user mail").
--
-- Each user holds one or more conversation threads with support. Users post
-- messages (sender='user'); support replies (sender='support') are written
-- only by the service-role client through the admin reply endpoint — there is
-- no client-side RLS path for support, exactly like subscriptions are written
-- only by the Stripe webhook.
--
-- Available to every tier: no tier check in RLS or in the routes.

create type message_sender as enum ('user', 'support');
create type thread_status  as enum ('open', 'closed');

create table message_threads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles on delete cascade,
  subject         text not null,
  status          thread_status not null default 'open',
  -- Denormalised for cheap list rendering / sorting without a join to messages.
  last_message_at timestamptz not null default now(),
  last_sender     message_sender not null default 'user',
  created_at      timestamptz not null default now()
);

create index on message_threads (user_id, last_message_at desc);

create table messages (
  id                uuid primary key default gen_random_uuid(),
  thread_id         uuid not null references message_threads on delete cascade,
  sender            message_sender not null,
  body              text not null,
  -- Read receipts: a support message is unread by the user until they open the
  -- thread; a user message is unread by support until an agent marks it.
  read_by_user_at    timestamptz,
  read_by_support_at timestamptz,
  created_at        timestamptz not null default now()
);

create index on messages (thread_id, created_at);

alter table message_threads enable row level security;
alter table messages        enable row level security;

-- Threads: a user fully manages their own threads. Support-side status changes
-- go through the service role (bypasses RLS).
create policy message_threads_select on message_threads
  for select using (user_id = auth.uid());
create policy message_threads_insert on message_threads
  for insert with check (user_id = auth.uid());
create policy message_threads_update on message_threads
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Messages: read any message in a thread the user owns; insert only messages
-- the user authored (sender='user') into a thread they own. Support inserts
-- (sender='support') have no policy and are done with the service role.
create policy messages_select on messages
  for select using (exists (
    select 1 from message_threads t where t.id = thread_id and t.user_id = auth.uid()
  ));
create policy messages_insert on messages
  for insert with check (
    sender = 'user'
    and exists (
      select 1 from message_threads t where t.id = thread_id and t.user_id = auth.uid()
    )
  );
-- Update allowed so the user can stamp read_by_user_at when opening a thread.
create policy messages_update on messages
  for update using (exists (
    select 1 from message_threads t where t.id = thread_id and t.user_id = auth.uid()
  )) with check (exists (
    select 1 from message_threads t where t.id = thread_id and t.user_id = auth.uid()
  ));

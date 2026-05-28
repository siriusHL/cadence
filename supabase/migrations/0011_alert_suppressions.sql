-- Per-user dismissals, snoozes and mutes for the read-live alerts feed.
--
-- The alerts engine recomputes every card on each page load — there is no
-- persisted "alert row" to flip a flag on. Instead we persist *selectors*
-- that hide matching cards.
--
-- Selector convention (free-form text; the application is the source of truth):
--   id:<alert.id>                       — hide one specific computed card
--                                         (e.g. "id:conc:AAPL", "id:ex:MSFT:2026-06-01")
--   kind:<alert.kind>                   — mute an entire kind
--                                         (e.g. "kind:drawdown")
--   kind_ticker:<alert.kind>:<ticker>   — mute a kind only for one ticker
--                                         (e.g. "kind_ticker:concentration_position:AAPL")
--
-- expires_at: NULL = permanent (dismiss / mute); future timestamp = snoozed
-- until that moment, then the card re-appears on its own.

create table alert_suppressions (
  user_id     uuid not null references profiles on delete cascade,
  selector    text not null,
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  primary key (user_id, selector)
);

create index on alert_suppressions (user_id);

alter table alert_suppressions enable row level security;

create policy alert_suppressions_self on alert_suppressions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

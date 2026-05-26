-- Google Calendar sync — Premium/Elite feature. One connected Google account
-- per Cadence user. The refresh token is encrypted at rest with AES-256-GCM
-- using GOOGLE_TOKEN_ENC_KEY (server-only env). Even a leaked service-role
-- key cannot decrypt these without that separate secret.

create table google_calendar_connections (
  user_id              uuid primary key references profiles on delete cascade,
  google_sub           text not null,
  email                text,
  refresh_token_enc    bytea not null,
  refresh_token_iv     bytea not null,
  refresh_token_tag    bytea not null,
  calendar_id          text not null default 'primary',
  scope                text not null,
  connected_at         timestamptz not null default now(),
  last_sync_at         timestamptz,
  last_sync_status     text check (last_sync_status in ('ok', 'error')),
  last_sync_error      text,
  last_sync_count      int
);

alter table google_calendar_connections enable row level security;

-- Users can see and disconnect (delete) their own connection. Inserts and
-- updates are restricted to service role — only the OAuth callback and the
-- sync job write here, never the user directly.
create policy gcal_select_own on google_calendar_connections
  for select using (user_id = auth.uid());
create policy gcal_delete_own on google_calendar_connections
  for delete using (user_id = auth.uid());

-- Benchmark weekly close history for the Performance chart's "vs index" lines.
--
-- Kept separate from `instrument_history` so benchmarks don't pollute the
-- holdings / instrument lookup paths. Same row shape, different keying:
-- benchmark_id is an opaque slug (e.g. 'STOXX600_TR') that the app maps to
-- a display name + the upstream ticker used to fetch the data.

create table benchmark_history (
  benchmark_id text not null,
  date         date not null,
  value        numeric(20, 6) not null,
  primary key (benchmark_id, date)
);

alter table benchmark_history enable row level security;

-- Read-only for everyone — benchmarks aren't user-scoped. Writes happen
-- via the service-role admin client (same pattern as instrument_history).
create policy benchmark_history_read on benchmark_history
  for select using (true);

create index benchmark_history_id_date_idx
  on benchmark_history (benchmark_id, date desc);

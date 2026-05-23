-- Historical closing prices, cached per (ticker, date).
-- Used by the Add Holding form to auto-fill price when the user picks a past
-- trade date. Historical EOD prices never change, so this row is permanent.

create table instrument_history (
  ticker  text not null references instruments on delete cascade,
  date    date not null,
  close   numeric(20,6) not null,
  primary key (ticker, date)
);

alter table instrument_history enable row level security;

create policy instrument_history_read on instrument_history for select using (true);

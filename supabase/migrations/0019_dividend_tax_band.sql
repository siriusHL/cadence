-- Ireland income-tax band for the dividend tax estimate.
--
-- IE taxes dividends as ordinary income at the user's marginal band. The Tax
-- page previously assumed everyone is a higher-rate (40%) taxpayer, overstating
-- the bill for the large standard-rate (20%) population. This lets a user pick
-- their band so the residence-tax figure is right for them.
--
--   'standard' -> 20% income tax   |   'higher' -> 40% income tax
--   (USC/PRSI surcharge is added on top in the app, same for both bands)
--
-- Nullable: when unset the app falls back to the model default (higher rate),
-- preserving today's behaviour. Only meaningful for IE residents.

alter table profiles
  add column if not exists dividend_tax_band text
    check (dividend_tax_band in ('standard', 'higher'));

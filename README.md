# Cadence

Dividend portfolio tracker. Next.js 16 + Supabase + Stripe. Three tiers: Free, Premium, Elite.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack), Tailwind v4
- **Supabase** — Postgres + Auth + RLS as the tier-cap enforcer
- **Stripe** — subscriptions; webhook is the only writer to `subscriptions.tier`
- **Market data** — Twelve Data (quotes), Financial Modeling Prep (dividends/fundamentals), Frankfurter (FX)
- **Cache** — Postgres tables + in-process singleflight (Upstash later, when traffic demands)
- **Deploy** — Vercel (free Hobby tier)

## Project layout

```
src/
  app/
    api/
      me/route.ts                          # GET — current user + tier + usage + limits
      portfolios/route.ts                  # GET, POST
      instruments/[ticker]/quote/route.ts  # GET — cache cascade
      billing/checkout/route.ts            # POST — Stripe Checkout session
      billing/webhook/route.ts             # POST — Stripe webhook (sub.tier writer)
  lib/
    tiers.ts          # TIERS config (single source of truth) + can(), canAccessScreen()
    auth.ts           # withAuth({ minTier, feature }, handler)
    cache.ts          # singleflight + isFresh
    supabase/         # server/, browser/, admin/ clients
    marketdata/       # twelvedata, fmp, fx adapters
  proxy.ts            # Next 16 middleware — auth + screen-level tier gate
supabase/
  migrations/
    0001_init.sql     # schema + RLS (caps enforced at DB layer)
```

## Setup

1. `cp .env.example .env.local` and fill it in.
2. Create a Supabase project. Apply the migration:
   ```
   supabase link --project-ref <ref>
   supabase db push
   ```
   Or paste `supabase/migrations/0001_init.sql` into the SQL editor.
3. Create three Stripe products (Free is implicit $0). Put the price IDs in `.env.local`.
4. Add a Stripe webhook pointing at `/api/billing/webhook` with these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Sign up at [twelvedata.com](https://twelvedata.com) and [financialmodelingprep.com](https://financialmodelingprep.com) for free API keys. Frankfurter (FX) needs no key.
6. `npm run dev` → http://localhost:3000

## Tier model

`src/lib/tiers.ts` is the only place tier behavior is defined. Adding a fourth tier = one entry.

| | Free | Premium | Elite |
|---|---|---|---|
| Portfolios | 1 | 3 | unlimited |
| Holdings | 10 | 100 | unlimited |
| Quote freshness | 24 h (EOD) | 10 min | 1 min |
| Screens | 4 (Home, Next, Stocks, Year) | + 8 Pro screens | + Tax, Alerts |
| Export | — | CSV | CSV + PDF |
| API access | — | — | yes |

## Defense in depth

Tier gating enforces at four layers:

1. **Postgres RLS** — `holdings_insert` / `portfolios_insert` policies check `holdings_cap_for_current_user()`. Cannot be bypassed.
2. **API routes** — `withAuth({ minTier, feature }, handler)` returns 402 if tier insufficient.
3. **Proxy (middleware)** — `src/proxy.ts` redirects `/app/<screen>` to `/upgrade` if tier can't access.
4. **UI** — `can(tier, feature)` toggles upsell cards vs real components.

## Cost basis

Derived from `transactions` (not stored on `holdings`). Supports FIFO/avg lots, realized P/L, multi-currency at trade time (`fx_to_base` snapshot per transaction).

## Cache cascade (`/api/instruments/:ticker/quote`)

```
Postgres instrument_quotes (fresh enough for tier?)
  → yes: return
  → no: singleflight → Twelve Data → upsert via service role → return
        (if upstream fails: serve stale + warning, or 503 if no cache)
```

Shared cache means 1,000 users holding JNJ = 1 upstream call, not 1,000.

## Scheduled refresh (free tier)

Use **Supabase scheduled functions** (free, unlimited) rather than Vercel Cron (Pro tier required).
TODO: write the refresh jobs:
- `refresh-quotes` daily for distinct held tickers
- `refresh-dividends` daily for next-30-day ex-div window
- `refresh-fx` every 15 min
- `fire-alerts` hourly (Elite)
- `cadence-rescore` monthly

## Deploying

Vercel Hobby is free and Next.js-native:
1. Push this repo to GitHub.
2. Import into Vercel — autodetects Next.js.
3. Add all `.env.example` vars to Vercel project env.
4. Every push to `main` → auto build + deploy. PRs get preview URLs.

GitHub Pages is **not** suitable — no server-side runtime for API routes.

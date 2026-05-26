# Cadence — pages & styles bundle

A snapshot of every page in the Cadence app plus the stylesheets that style them.

## What's in here

```
pages/         every route's source (one .tsx per route)
  layout.tsx                    root layout — wraps EVERY page (loads fonts, viewport meta, theme boot script)
  page.tsx                      / (landing)
  login/page.tsx                /login
  signup/page.tsx               /signup
  pricing/page.tsx              /pricing
  upgrade/page.tsx              /upgrade
  app/
    layout.tsx                  nav shell wrapping every authenticated screen
    loading.tsx                 thin progress bar shown while a screen is loading
    page.tsx                    /app — redirects to the user's default landing
    home/page.tsx               /app/home               (Free)
    next/page.tsx               /app/next               (Free — "coming up")
    stocks/page.tsx             /app/stocks             (Free — your stocks)
    stocks/[ticker]/edit/page.tsx  /app/stocks/<ticker>/edit
    year/page.tsx               /app/year               (Free — year story)
    add/page.tsx                /app/add                add a holding
    dashboard/page.tsx          /app/dashboard          (Pro)
    holdings/page.tsx           /app/holdings           (Pro)
    dividends/page.tsx          /app/dividends          (Pro)
    calendar/page.tsx           /app/calendar           (Pro)
    forecast/page.tsx           /app/forecast           (Pro)
    performance/page.tsx        /app/performance        (Pro)
    diversification/page.tsx    /app/diversification    (Pro)
    simulator/page.tsx          /app/simulator          (Pro)
    tax/page.tsx                /app/tax                (Elite)
    alerts/page.tsx             /app/alerts             (Elite)
    alerts/loading.tsx          per-route skeleton for /app/alerts
    portfolios/page.tsx         /app/portfolios         (account)
    profile/page.tsx            /app/profile            (account)
    settings/page.tsx           /app/settings           (account)

components/    every component the pages render (31 files)

styles/
  globals.css                   shared styles + .cdn-free (Free-tier shell) + responsive breakpoints
  pro.css                       .cdn-pro overlay used by every paid screen
```

## How the HTML is generated

These are React Server Components (Next.js 16 App Router). Each `page.tsx`
runs on the server, fetches data from Supabase, and returns a tree that
Next serializes to HTML. The static HTML for any single page is the
output of rendering that .tsx file's default export with its data props.

`layout.tsx` files compose around the route's `page.tsx` — the root layout
wraps every page, `app/layout.tsx` adds the nav for authenticated screens.

## Styling

Two stylesheets, both imported once from `pages/layout.tsx`:

- **`globals.css`** — base reset, semantic theme variables (light theme +
  contrast/bg-tone dials), the `.cdn-free` shell (nav, hero, free-tier
  card grid), the responsive mobile hamburger nav, and global animations.

- **`pro.css`** — the `.cdn-pro` overlay applied to every paid screen.
  Pro hero, stat strips, .pcards, table styles, modal scaffolding, info
  tooltips, donut/treemap/chart helpers.

Tailwind is enabled but used sparingly — `@import "tailwindcss"` at the
top of globals.css. The bulk of styling is hand-written semantic CSS.

## Tiers

- **Free** — Home / Coming up / Your stocks / Your year
- **Premium (Pro)** — Dashboard / Holdings / Dividends / Calendar /
  Forecast / Performance / Diversification / Simulator
- **Elite** — everything above plus Tax / Alerts

Tier routing is centralized in the parent `app/layout.tsx`; pages a tier
can't access redirect to `/upgrade`.

## What's NOT in here

- API routes (`/api/*`) — server endpoints, no HTML
- Library code (`/lib/*`) — data fetching, market-data providers, tier rules
- Database migrations
- Build/config files (next.config.ts, eslint.config.mjs, etc.)

If you want any of those, ask — I can produce a second bundle.

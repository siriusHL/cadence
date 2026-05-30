-- Insights — public SEO content section (Articles & Insights).
--
-- A small CMS-backed blog that is readable by anyone (no auth, every tier) so
-- it can be crawled and indexed by search engines. Four tables:
--
--   1. insights_categories — the fixed topic taxonomy (Stock Market, ETF, ...).
--   2. insights_articles    — the articles themselves (Markdown body + SEO meta).
--   3. insights_tags        — free-form secondary keywords for cross-linking.
--   4. insights_article_tags — many-to-many join.
--
-- RLS contract: PUBLIC READ of *published* content only. Drafts/scheduled rows
-- never leave the database to an anon/authenticated client. There are no
-- insert/update/delete policies, so all writes go through the service-role
-- client (the admin CMS) — exactly like subscriptions.tier and support replies.
--
-- Legal note: every seeded article below is original prose written for Cadence.
-- No third-party text is copied. Hero images are left null here; the admin
-- attaches free-licence images (with hero_image_credit attribution) at publish.

------------------------------------------------------------------------------
-- Taxonomy
------------------------------------------------------------------------------

create table insights_categories (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  description     text not null default '',
  seo_title       text,
  seo_description text,
  sort_order      int  not null default 0,
  created_at      timestamptz not null default now()
);

------------------------------------------------------------------------------
-- Articles
------------------------------------------------------------------------------

create type insights_status as enum ('draft', 'scheduled', 'published');

create table insights_articles (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  category_id      uuid not null references insights_categories on delete restrict,
  title            text not null,
  summary          text not null,
  body_md          text not null,
  author_name      text not null default 'Cadence Editorial',
  status           insights_status not null default 'draft',
  published_at     timestamptz,
  reading_time_min int  not null default 5,
  -- Hero image: free-licence only; hero_image_credit carries the attribution.
  hero_image_url    text,
  hero_image_alt    text,
  hero_image_credit text,
  -- SEO overrides (fall back to title/summary in the page when null).
  seo_title        text,
  meta_description text,
  canonical_url    text,
  og_image_url     text,
  keywords         text[] not null default '{}',
  -- FAQ SEO: array of {"q": "...", "a": "..."} → rendered + FAQPage JSON-LD.
  faq              jsonb not null default '[]'::jsonb,
  -- Data sources to cite (legal requirement): array of {"label","url"}.
  sources          jsonb not null default '[]'::jsonb,
  tsv              tsvector,
  created_by       uuid references profiles on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Listing query: published, newest first, optionally filtered by category.
create index insights_articles_published_idx
  on insights_articles (status, published_at desc);
create index insights_articles_category_idx
  on insights_articles (category_id);

-- Full-text search over title (A) / summary + keywords (B) / body (C).
create or replace function public.insights_articles_tsv_refresh() returns trigger
language plpgsql set search_path = public as $$
begin
  new.tsv :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.summary, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(new.keywords, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.body_md, '')), 'C');
  return new;
end $$;

create trigger insights_articles_tsv_update
  before insert or update on insights_articles
  for each row execute function public.insights_articles_tsv_refresh();

create index insights_articles_tsv_idx on insights_articles using gin (tsv);

-- Keep updated_at honest on every edit (the CMS edits articles in place).
create or replace function public.insights_set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger insights_articles_set_updated_at
  before update on insights_articles
  for each row execute function public.insights_set_updated_at();

------------------------------------------------------------------------------
-- Tags (secondary keywords for cross-linking)
------------------------------------------------------------------------------

create table insights_tags (
  id   uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);

create table insights_article_tags (
  article_id uuid not null references insights_articles on delete cascade,
  tag_id     uuid not null references insights_tags on delete cascade,
  primary key (article_id, tag_id)
);

create index insights_article_tags_tag_idx on insights_article_tags (tag_id);

------------------------------------------------------------------------------
-- RLS — public read of published content; all writes are service-role only.
------------------------------------------------------------------------------

alter table insights_categories   enable row level security;
alter table insights_articles     enable row level security;
alter table insights_tags         enable row level security;
alter table insights_article_tags enable row level security;

create policy insights_categories_read on insights_categories
  for select using (true);

-- A published_at guard in addition to the status lets the CMS set a future
-- date and have the row stay hidden until then (scheduled publishing) without
-- a separate cron flip.
create policy insights_articles_read on insights_articles
  for select using (
    status = 'published' and published_at is not null and published_at <= now()
  );

create policy insights_tags_read on insights_tags
  for select using (true);

-- Only expose join rows for articles that are themselves publicly visible, so
-- draft article ids never leak through the tag join.
create policy insights_article_tags_read on insights_article_tags
  for select using (exists (
    select 1 from insights_articles a
    where a.id = article_id
      and a.status = 'published'
      and a.published_at is not null
      and a.published_at <= now()
  ));

------------------------------------------------------------------------------
-- Seed: the eight categories
------------------------------------------------------------------------------

insert into insights_categories (slug, name, description, seo_title, seo_description, sort_order) values
  ('stock-market', 'Stock Market',
   'How equity markets work, what moves share prices, and how to think about them as a long-term investor.',
   'Stock Market Basics & Insights | Cadence',
   'Plain-English explainers on how the stock market works, what drives prices, and how long-term investors approach it.', 1),
  ('portfolio-management', 'Portfolio Management',
   'Building, balancing, and maintaining an investment portfolio — diversification, rebalancing, and risk.',
   'Portfolio Management Guides | Cadence',
   'Practical guides to building and maintaining a diversified investment portfolio, from asset allocation to rebalancing.', 2),
  ('etf', 'ETF',
   'Exchange-traded funds explained: structure, costs, tracking, and how they compare to other funds.',
   'ETF Guides for Investors | Cadence',
   'Understand exchange-traded funds — how they are structured, what they cost, and how they differ from index mutual funds.', 3),
  ('dividend-investing', 'Dividend Investing',
   'Income from shares: yield, payout ratios, dividend growth, and reinvestment.',
   'Dividend Investing Explained | Cadence',
   'Learn how dividends work — yield, payout ratios, dividend growth, and reinvestment — without the jargon.', 4),
  ('value-investing', 'Value Investing',
   'Estimating what a business is worth and buying it for less — the ideas behind value investing.',
   'Value Investing Fundamentals | Cadence',
   'An introduction to value investing: intrinsic value, margin of safety, and the metrics value investors watch.', 5),
  ('growth-investing', 'Growth Investing',
   'Investing in companies expected to grow earnings faster than the market, and the trade-offs involved.',
   'Growth Investing Basics | Cadence',
   'How growth investing works, what growth investors look for, and the risks of paying up for future earnings.', 6),
  ('market-analysis', 'Market Analysis',
   'Frameworks for making sense of markets — economic indicators, valuations, and cycles.',
   'Market Analysis & Frameworks | Cadence',
   'Educational frameworks for analysing markets: economic indicators, valuation measures, and market cycles.', 7),
  ('personal-finance', 'Personal Finance',
   'The foundations beneath investing — saving, budgeting, debt, and financial goals.',
   'Personal Finance Foundations | Cadence',
   'The groundwork that makes investing possible: saving, budgeting, managing debt, and setting financial goals.', 8);

------------------------------------------------------------------------------
-- Seed: tags
------------------------------------------------------------------------------

insert into insights_tags (slug, name) values
  ('beginners', 'Beginners'),
  ('income', 'Income'),
  ('risk', 'Risk'),
  ('diversification', 'Diversification'),
  ('funds', 'Funds'),
  ('valuation', 'Valuation');

------------------------------------------------------------------------------
-- Seed: original sample articles (100% original prose)
------------------------------------------------------------------------------

insert into insights_articles
  (slug, category_id, title, summary, body_md, author_name, status, published_at,
   reading_time_min, seo_title, meta_description, keywords, faq, sources)
values
(
  'understanding-dividend-yield',
  (select id from insights_categories where slug = 'dividend-investing'),
  'Understanding Dividend Yield: What It Measures and What It Misses',
  'Dividend yield is one of the first numbers income investors look at — but on its own it can mislead. Here is what it actually measures, and the context you need around it.',
  $body$Dividend yield is often the first figure a new income investor learns, and it is easy to see why: it puts a single, comparable percentage on what a share pays you. But a number that simple hides a lot, and treating it in isolation is one of the most common beginner mistakes.

## What dividend yield actually measures

Dividend yield expresses a company's annual dividend per share as a percentage of its current share price:

> Dividend yield = annual dividend per share ÷ current share price

If a company pays 2.00 in dividends over a year and its shares trade at 50.00, the yield is 4%. The key word is *current* — because the price moves every day, the yield moves with it, even when the dividend itself has not changed.

### Why a falling price raises the yield

This is the part that surprises people. If the dividend stays the same but the share price drops, the yield goes *up*. A stock that yielded 4% at 50.00 yields 8% if the price halves to 25.00. A high yield can therefore be a sign of trouble rather than generosity: the market may be pricing in a future dividend cut. Investors call this a "yield trap."

## The context a yield number needs

A yield only becomes useful alongside a few other facts.

### The payout ratio

The payout ratio is the share of earnings paid out as dividends. A company paying out 40% of its earnings has room to keep paying — and to grow the dividend — even if profits dip. One paying out 95% has little margin for error. A high yield backed by a near-100% payout ratio is far more fragile than the same yield backed by a 50% ratio.

### Dividend growth and history

A modest yield that grows steadily year after year can deliver more income over time than a high yield that never moves — or gets cut. Looking at how long a company has maintained or raised its dividend tells you more about reliability than the headline percentage.

### Where the cash comes from

Dividends are paid from cash. A company that funds its dividend from genuine free cash flow is on firmer ground than one borrowing to maintain a payout it can no longer afford.

## How to use yield sensibly

Treat yield as the opening question, not the answer. A sensible order of inquiry:

1. What is the yield, and how does it compare to the company's own history?
2. Is the payout ratio sustainable?
3. Has the dividend been stable or growing?
4. Is the payout covered by free cash flow?

If a yield looks unusually high for its sector, assume the market knows something and find out what it is before reaching for it.

## The bottom line

Dividend yield is a useful, comparable starting point — but it describes a moment in time, not the durability of the income behind it. The investors who avoid yield traps are the ones who treat a high number as a question to investigate, not a reward to grab.$body$,
  'Cadence Editorial',
  'published',
  now() - interval '7 days',
  6,
  'Dividend Yield Explained: What It Measures & Misses | Cadence',
  'Dividend yield is a useful starting point but misleads on its own. Learn what it measures, why a falling price raises it, and the context it needs.',
  array['dividend yield', 'payout ratio', 'income investing', 'yield trap', 'dividend growth'],
  $faq$[
    {"q": "How is dividend yield calculated?", "a": "Divide the annual dividend per share by the current share price. A 2.00 annual dividend on a 50.00 share price is a 4% yield."},
    {"q": "Is a higher dividend yield always better?", "a": "No. Because yield rises when the price falls, an unusually high yield can signal that the market expects a dividend cut — a so-called yield trap."},
    {"q": "What is a sustainable payout ratio?", "a": "There is no single number, but a payout ratio well below 100% — often cited around 40-60% for many mature companies — leaves room to maintain and grow the dividend through lean years."}
  ]$faq$::jsonb,
  $sources$[
    {"label": "General financial concepts (dividend yield, payout ratio) — public domain definitions"}
  ]$sources$::jsonb
),
(
  'why-diversification-reduces-risk',
  (select id from insights_categories where slug = 'portfolio-management'),
  'Why Diversification Reduces Portfolio Risk',
  'Spreading money across many investments does not just feel safer — there is a structural reason it lowers risk without necessarily lowering expected return. Here is the intuition.',
  $body$"Don't put all your eggs in one basket" is the oldest advice in investing. It is also one of the few ideas in finance that is both genuinely powerful and easy to understand once you see the mechanism behind it.

## The two kinds of risk

The risk in any single investment splits into two parts.

### Specific risk

Specific risk is the danger tied to one company or one situation: a failed product, an accounting scandal, a factory fire, a lawsuit. It affects that holding and not the wider market.

### Market risk

Market risk is the risk shared by almost everything at once — a recession, a sharp rise in interest rates, a broad shift in sentiment. It moves most investments in the same direction at the same time.

The crucial distinction: **specific risk can be diversified away, market risk cannot.**

## Why combining holdings smooths the ride

When you hold many investments whose fortunes are not perfectly linked, their ups and downs partly cancel out. A bad quarter for one company is often offset by a good one elsewhere. The portfolio's overall path becomes smoother than any single holding's path — and importantly, this smoothing does not require you to give up expected return.

### The role of correlation

The benefit depends on *correlation* — how closely two investments move together. Combining holdings that tend to move in step (say, two banks) reduces specific risk only a little. Combining holdings that move differently (a bank and a utility, or stocks and bonds) reduces it much more. The lower the correlation, the greater the smoothing.

## How much diversification is enough

Most of the benefit arrives faster than people expect. Going from one holding to a handful dramatically cuts specific risk; going from a well-spread portfolio to an even larger one adds progressively less. Beyond a point you are left mostly with market risk — the part diversification cannot remove. That is why even a broadly diversified portfolio still falls in a general downturn.

### Diversifying across more than just stocks

Diversification works along several dimensions at once:

- **Across companies** — many holdings rather than a few.
- **Across sectors** — so one industry's slump does not sink everything.
- **Across geographies** — different economies on different cycles.
- **Across asset types** — stocks, bonds, and cash behave differently.

## What diversification is not

It is not a guarantee against loss, and it will not make you rich quickly from a single winning bet — by design, it dilutes any one position. Its job is to make your outcomes less dependent on being right about any single thing. For most long-term investors, that trade is exactly the right one.

## The bottom line

Diversification lowers the risk you are not compensated for taking — the company-specific kind — while leaving your expected return intact. It is the closest thing investing has to a free lunch, which is precisely why it is the foundation of sensible portfolio construction.$body$,
  'Cadence Editorial',
  'published',
  now() - interval '4 days',
  6,
  'Why Diversification Reduces Portfolio Risk | Cadence',
  'Diversification lowers risk without lowering expected return. Learn the difference between specific and market risk and why spreading holdings works.',
  array['diversification', 'portfolio risk', 'correlation', 'asset allocation', 'risk management'],
  $faq$[
    {"q": "Does diversification lower my returns?", "a": "Not in expectation. It removes company-specific risk you are not rewarded for taking, while leaving your expected return intact. It does cap the upside of any single winning bet."},
    {"q": "How many holdings do I need to be diversified?", "a": "Most of the specific-risk reduction comes from the first handful of well-spread holdings; the benefit of each additional holding shrinks after that. Spreading across sectors and asset types matters as much as the raw count."},
    {"q": "Can diversification protect me in a market crash?", "a": "Only partly. It removes specific risk but not market risk — the risk shared by almost everything at once — so a broadly diversified portfolio still falls in a general downturn."}
  ]$faq$::jsonb,
  $sources$[
    {"label": "General portfolio-theory concepts (specific vs. market risk, correlation) — public domain"}
  ]$sources$::jsonb
),
(
  'etfs-vs-index-funds',
  (select id from insights_categories where slug = 'etf'),
  'ETFs vs. Index Funds: A Beginner''s Comparison',
  'ETFs and index mutual funds can track the same market and charge similar fees, yet they differ in how you buy them, how they trade, and a few tax details. Here is how to tell them apart.',
  $body$Exchange-traded funds (ETFs) and index mutual funds are often mentioned in the same breath, and for good reason — both let you own a slice of a whole market in a single purchase, usually at low cost. But they are not identical, and the differences matter once you start investing regularly.

## What they have in common

Both are *pooled funds*: many investors' money is combined to buy a basket of underlying assets. When either one is an *index* fund, it simply aims to mirror a published index rather than have a manager pick holdings. That shared design is why a broad ETF and a broad index mutual fund tracking the same index will deliver almost the same return before costs.

## How they differ

### How and when you trade

This is the headline difference.

- An **ETF** trades on an exchange throughout the day, like a share. You see a live price and can buy or sell whenever the market is open.
- An **index mutual fund** is bought and sold directly with the fund provider, and orders are filled once a day at the price struck after the market closes (the net asset value).

For a long-term investor this often matters less than it sounds — but it changes how an order behaves.

### Minimums and how you invest

Mutual funds frequently let you invest a fixed amount of money (and historically often required a minimum initial investment). ETFs are bought in whole shares at the market price, though many brokers now offer fractional shares. If you want to automate "invest 200 every month," a mutual fund or a fractional-share ETF makes that cleaner.

### Costs beyond the headline fee

Both publish an expense ratio, and for broad index products these are often very low. ETFs add a second, easy-to-miss cost: the **bid-ask spread** — the small gap between the buying and selling price — plus any brokerage commission. For widely traded ETFs the spread is tiny; for thinly traded ones it is not.

### Tax treatment

In some jurisdictions the way ETFs handle their underlying trades makes them slightly more tax-efficient in a taxable account than comparable mutual funds. This is very country-specific, so it is one to check locally rather than assume.

## Which one fits you

There is no universal winner. A reasonable way to choose:

1. **Do you invest a fixed sum on a schedule?** A mutual fund (or fractional-share ETF) handles recurring amounts smoothly.
2. **Do you want intraday control or to hold many different exposures cheaply?** ETFs are flexible and broadly available.
3. **Is your account taxable?** Check the local tax treatment of each before deciding.

## The bottom line

For tracking a broad market at low cost, an ETF and an index mutual fund are far more alike than different — the choice usually comes down to how you like to buy, whether you invest fixed amounts, and your local tax rules. Pick the structure that fits your habits, and keep the fees low either way.$body$,
  'Cadence Editorial',
  'published',
  now() - interval '2 days',
  7,
  'ETFs vs. Index Funds: A Beginner''s Comparison | Cadence',
  'ETFs and index mutual funds can track the same market at similar cost. Learn how they differ in trading, minimums, fees, and tax — and which fits you.',
  array['ETF', 'index funds', 'mutual funds', 'expense ratio', 'passive investing'],
  $faq$[
    {"q": "Are ETFs cheaper than index mutual funds?", "a": "Their expense ratios are often similar for broad index products. ETFs add a bid-ask spread and possibly a commission, while mutual funds may have minimums. The cheapest option depends on the specific funds and your broker."},
    {"q": "Can I set up automatic monthly investing with an ETF?", "a": "Yes, if your broker supports fractional shares or recurring ETF purchases. Otherwise index mutual funds, which accept a fixed money amount, make recurring contributions simpler."},
    {"q": "Do ETFs and index funds give the same returns?", "a": "If they track the same index, their returns before costs are almost identical. Differences come mainly from fees, spreads, and tax treatment."}
  ]$faq$::jsonb,
  $sources$[
    {"label": "General fund-structure concepts (ETF vs. mutual fund mechanics) — public domain"}
  ]$sources$::jsonb
);

------------------------------------------------------------------------------
-- Seed: link sample articles to tags
------------------------------------------------------------------------------

insert into insights_article_tags (article_id, tag_id)
select a.id, t.id from insights_articles a, insights_tags t
where (a.slug = 'understanding-dividend-yield'   and t.slug in ('beginners', 'income'))
   or (a.slug = 'why-diversification-reduces-risk' and t.slug in ('beginners', 'risk', 'diversification'))
   or (a.slug = 'etfs-vs-index-funds'             and t.slug in ('beginners', 'funds'));

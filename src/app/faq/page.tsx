import type { Metadata } from 'next';
import Link from 'next/link';
import { TIERS } from '@/lib/tiers';

export const metadata: Metadata = {
  title: 'FAQ — Cadence',
  description:
    'Frequently asked questions about Cadence — plans, data, tax features, privacy — plus a guide to every screen in the app.',
};

// Numeric facts come from the tier SSOT so the copy can never drift from the
// limits the app actually enforces. Prices are marketing strings (see /pricing).
const FREE_HOLDINGS = TIERS.free.maxHoldings;
const PREMIUM_HOLDINGS = TIERS.premium.maxHoldings;
const PREMIUM_PORTFOLIOS = TIERS.premium.maxPortfolios;
const ELITE_ALERTS = TIERS.elite.maxAlerts;

interface QA {
  q: string;
  a: string;
}

interface QASection {
  id: string;
  title: string;
  items: QA[];
}

const SECTIONS: QASection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    items: [
      {
        q: 'What is Cadence?',
        a: "Cadence is a dividend portfolio tracker for European investors. It forecasts every payment, scores each share's dividend safety, and helps you reclaim withholding tax — your whole income stream, organised in one place.",
      },
      {
        q: 'How do I add my holdings?',
        a: 'Two ways. On any plan you can add positions manually or import a CSV from your broker. On Premium and Elite, connect a broker for a nightly read-only sync.',
      },
      {
        q: 'Does Cadence connect to my broker?',
        a: 'Yes — 50+ European brokers via read-only API: DEGIRO, Interactive Brokers, Trade Republic, Saxo, Bolero, BinckBank, ABN AMRO, ING, and more. Premium and Elite sync nightly; Free works via CSV import. We never see or store your broker password — connections use OAuth or read-only tokens.',
      },
      {
        q: 'Do I need a paid plan to try it?',
        a: `No. Free covers 1 portfolio and up to ${FREE_HOLDINGS} holdings, forever, no card required.`,
      },
    ],
  },
  {
    id: 'plans-pricing',
    title: 'Plans & pricing',
    items: [
      {
        q: "What's the difference between Free, Premium and Elite?",
        a: `Free (€0) — 1 portfolio, ${FREE_HOLDINGS} holdings, end-of-day prices. The basics: home, upcoming payments, your stocks, year overview. Premium (€4/mo) — ${PREMIUM_PORTFOLIOS} portfolios, ${PREMIUM_HOLDINGS} holdings per portfolio, 10-minute prices, plus the full research desk: dashboard, holdings drilldown, dividend calendar & forecast, DRIP simulator, performance vs benchmark, diversification, multi-currency, CSV export. Elite (€9/mo) — unlimited portfolios and holdings, 1-minute prices, plus tax reports, price & ex-dividend alerts (up to ${ELITE_ALERTS}), and PDF export.`,
      },
      {
        q: "What's the difference between Premium and Elite?",
        a: 'Premium is the analytics — the full research desk. Elite is the operations on top: automating tax reclaim, calendar sync, alerts, and accountant-ready exports. If you’ve ever spent a Sunday on a spreadsheet during tax season, Elite is for you.',
      },
      {
        q: 'How do I upgrade or downgrade?',
        a: 'Upgrade from the in-app upgrade page (secure Stripe checkout). Change or cancel anytime from the billing portal in settings.',
      },
      {
        q: 'Can I cancel anytime?',
        a: `Yes, in one click. No phone calls, no retention scripts. After cancelling you drop to Free mode — a ${FREE_HOLDINGS}-holding cap — and your history is never deleted unless you explicitly ask.`,
      },
    ],
  },
  {
    id: 'data-accuracy',
    title: 'Data & accuracy',
    items: [
      {
        q: 'Where does the market data come from, and how fresh is it?',
        a: 'Quotes refresh per plan — 24h on Free, every 10 minutes on Premium, every minute on Elite. Dividend data refreshes weekly on Free and daily on paid plans. FX rates are independent and updated continuously.',
      },
      {
        q: 'How accurate is the safety score?',
        a: 'Each share is graded across four pillars — payout ratio, free-cashflow coverage, debt-to-equity, and 10-year dividend-growth consistency — refreshed nightly from filings. Backtested across 25 years: companies graded D or F at the time of a cut were in the cut population around 78% of the time.',
      },
      {
        q: 'How are dividend forecasts calculated?',
        a: "From each company's declared dividends and historical payment cadence, projected across the next 12 months and converted to your base currency.",
      },
    ],
  },
  {
    id: 'tax',
    title: 'Tax features (Elite)',
    items: [
      {
        q: 'Can Cadence actually file my taxes?',
        a: 'Elite prepares Box 3-ready reports for the Netherlands and equivalent reports for Belgium, France and Germany. For US-source dividends it files the W-8BEN-E treaty form and recovers over-withholding from the IRS. We file where the jurisdiction permits and prepare ready-to-mail forms where it doesn’t.',
      },
      {
        q: 'Which countries are supported for tax?',
        a: 'Withholding and capital-gains modelling for the Netherlands, Germany, France, Belgium, Spain, Italy, Ireland, the United Kingdom, Portugal and Austria. Your tax residency in your profile drives the calculations.',
      },
      {
        q: 'Is this tax advice?',
        a: "No — Cadence prepares figures and forms to make filing easier. For advice on your specific situation, talk to a qualified adviser.",
      },
    ],
  },
  {
    id: 'privacy-security',
    title: 'Privacy & security',
    items: [
      {
        q: 'Where is my data stored?',
        a: 'In Frankfurt 🇪🇺 on GDPR-compliant EU infrastructure. We never sell, share, or analyse your trades for any third party. Export everything and delete your account in two clicks, anytime.',
      },
      {
        q: 'Can Cadence trade on my account?',
        a: 'No. Broker connections are strictly read-only — Cadence can see positions to track them, never place trades.',
      },
      {
        q: 'How do I delete my account and data?',
        a: 'From the account page, one click. Deletion is irreversible.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    items: [
      {
        q: 'How do I change my email or password?',
        a: 'From the account page — both require confirming your current password.',
      },
      {
        q: 'Can I track more than one portfolio?',
        a: `Yes — 1 on Free, ${PREMIUM_PORTFOLIOS} on Premium, unlimited on Elite, each with its own holdings and base currency.`,
      },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    items: [
      {
        q: 'How do I get help?',
        a: 'Open a ticket from the in-app support inbox. Elite and Premium messages are prioritised.',
      },
    ],
  },
];

interface PageGuide {
  name: string;
  blurb: string;
}

interface GuideGroup {
  id: string;
  title: string;
  note: string;
  pages: PageGuide[];
}

const GUIDE: GuideGroup[] = [
  {
    id: 'guide-free',
    title: 'Free screens',
    note: 'A clean, friendly set of screens to find your footing.',
    pages: [
      {
        name: 'Home',
        blurb:
          "Your month at a glance: this month's dividend income (received and expected), tiles for income received this year, your forward annual income and your next payment, and a strip of your top holdings with what each pays per month.",
      },
      {
        name: 'Coming up',
        blurb:
          'The next 60 days of dividends. The very next payment sits up top with a days-to-go countdown, followed by the payments after it in date order, each with its amount and ticker.',
      },
      {
        name: 'Your stocks',
        blurb:
          'Every holding as a card — ticker, company, shares, current value, yield, and what it pays monthly and annually — each with a plain-language safety badge (Very safe / Safe / OK / Watch). Totals for holdings, value and monthly income sit at the top.',
      },
      {
        name: 'Year',
        blurb:
          "Your calendar year of income as a bar chart — solid bars for what's landed, faded bars for what's still projected — with cards for your expected year-end total, your biggest-paying month, and your income per day.",
      },
      {
        name: 'Add a holding',
        blurb:
          'A simple form to add a position by ticker, quantity, price and date (with an optional fee), supporting multiple lots.',
      },
    ],
  },
  {
    id: 'guide-premium',
    title: 'Premium screens',
    note: 'The free screens are swapped for a dense research desk.',
    pages: [
      {
        name: 'Dashboard',
        blurb:
          "Your portfolio's command centre: total value, unrealised profit/loss in € and %, position count and countries; tiles for Forward Income (12M), Forward Yield, Total Return, Capital Deployed and your Cadence Safety Score; then an Income Rhythm chart, your top income and P/L contributors, the next five payments, and a progress bar toward your income target.",
      },
      {
        name: 'Holdings',
        blurb:
          'Every position in one sortable table — sector, country, currency, quantity, live price and daily change, cost basis, forward yield, yield-on-cost, annual dividend and payout frequency — with a breakdown of how often your holdings pay. Add holdings or import a CSV from here.',
      },
      {
        name: 'Dividends',
        blurb:
          'Four tabs for everything income: Upcoming (a 40-day calendar plus a payment list with ex-dates and gross/net after estimated withholding), Forecast (a 12-month projection, income by holding, cashflow by month/quarter/year, and a dividend-raise scenario), Simulator (a reinvestment/DRIP calculator showing compounding and time-to-target), and Year (a heatmap of every ex-date, shaded by amount).',
      },
      {
        name: 'Performance',
        blurb:
          'How your portfolio is actually doing: total return and days tracked; tiles for YTD and 1-year return, Sharpe ratio, max drawdown, beta and win rate; a cumulative-return chart against benchmarks like the S&P 500; a period-returns table; your top winners and losers; and a full risk-and-ratios table.',
      },
      {
        name: 'Diversification',
        blurb:
          'Where your money and income actually sit, broken down by sector, country and currency, with concentration risks flagged when a single name or area gets too large.',
      },
      {
        name: 'Stock detail',
        blurb:
          'Manage one holding end to end: see total shares and average cost, view every buy/sell lot in a table, edit or delete lots, add new ones, or remove the holding entirely.',
      },
    ],
  },
  {
    id: 'guide-elite',
    title: 'Elite screens',
    note: 'Everything in Premium, plus tax and alerts.',
    pages: [
      {
        name: 'Tax',
        blurb:
          'Your dividend year, after tax. Pick a fiscal year, then see gross dividends, foreign withholding, residence-side tax, net after everything, and what’s reclaimable. A jurisdiction table breaks withholding down country by country, a residence panel applies your country’s model (e.g. Box 3), and a reclaim section flags over-withholding with filing guidance. A capital-gains section covers realised sales and CGT, and you can export Dividends CSV, Capital Gains CSV and a Tax Pack.',
      },
      {
        name: 'Alerts',
        blurb:
          `A live watchlist that needs no setup. Cadence surfaces what needs attention — ex-dates within 7 days, dividend cuts or raises of 5%+, single positions over 10%, reclaimable foreign tax over €50, drawdowns past −10% — as colour-coded cards (up to ${ELITE_ALERTS}), with a footer explaining every trigger.`,
      },
    ],
  },
  {
    id: 'guide-account',
    title: 'Account screens (every plan)',
    note: 'Available on every plan.',
    pages: [
      {
        name: 'Profile',
        blurb:
          'Your display name, base currency and tax residence (which drives your tax maths and number formatting), plus personal and address details.',
      },
      {
        name: 'Settings',
        blurb:
          'Make Cadence yours: contrast and background tone, which screen opens by default, and your income target for the dashboard progress bar.',
      },
      {
        name: 'Account & security',
        blurb:
          'Change your email or password, or permanently delete your account and data.',
      },
      {
        name: 'Portfolios',
        blurb:
          'Create, rename, switch and delete portfolios — one on Free, more on paid plans — to separate, say, Retirement from Taxable.',
      },
      {
        name: 'Messages',
        blurb:
          'Your support inbox: start a conversation, track it through Open and Closed folders, and get replies both in-app and by email.',
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-line">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.06em] uppercase"
        >
          <span className="w-2 h-2 rounded-full bg-accent-soft" /> Cadence
        </Link>
        <nav className="flex items-center gap-6 text-sm text-ink-soft">
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>
          <Link href="/login" className="hover:text-ink">Log in</Link>
        </nav>
      </header>

      <section className="flex-1 w-full max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-5xl font-semibold tracking-[-0.025em] text-center">
          Frequently asked questions
        </h1>
        <p className="mt-3 text-lg text-ink-soft text-center max-w-xl mx-auto tracking-tight">
          Everything about plans, data, tax and privacy — plus a guide to every
          screen in the app.
        </p>

        {/* ─── Q&A ─────────────────────────────────────────── */}
        {SECTIONS.map((section) => (
          <div key={section.id} id={section.id} className="mt-14 scroll-mt-20">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-soft">
              {section.title}
            </h2>
            <div className="mt-4 divide-y divide-line border-y border-line">
              {section.items.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-[16px] font-medium text-ink list-none">
                    <span>{item.q}</span>
                    <span
                      aria-hidden
                      className="text-ink-soft transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-[1.6] text-ink-soft">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        ))}

        {/* ─── A guide to every page ───────────────────────── */}
        <div id="page-guide" className="mt-20 scroll-mt-20">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-center">
            A guide to every page
          </h2>
          <p className="mt-3 text-[15px] text-ink-soft text-center max-w-xl mx-auto">
            Cadence changes shape with your plan — Free gives you a clean set of
            screens, Premium swaps them for a research desk, and Elite adds tax
            and alerts on top. Here&rsquo;s what each page is for.
          </p>

          {GUIDE.map((group) => (
            <div key={group.id} id={group.id} className="mt-12 scroll-mt-20">
              <h3 className="text-xl font-semibold tracking-[-0.015em]">
                {group.title}
              </h3>
              <p className="mt-1 text-sm text-ink-soft">{group.note}</p>
              <dl className="mt-5 space-y-5">
                {group.pages.map((page) => (
                  <div key={page.name}>
                    <dt className="text-[15px] font-semibold text-ink">
                      {page.name}
                    </dt>
                    <dd className="mt-1 text-[15px] leading-[1.6] text-ink-soft">
                      {page.blurb}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        {/* ─── CTA ─────────────────────────────────────────── */}
        <div className="mt-20 rounded-2xl border border-line bg-white p-8 text-center">
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">
            Still have a question?
          </h2>
          <p className="mt-2 text-[15px] text-ink-soft">
            Start free in 90 seconds, or reach the team from your support inbox.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="h-11 inline-flex items-center justify-center rounded-full bg-ink px-7 font-medium text-white hover:opacity-90"
            >
              Start free
            </Link>
            <Link
              href="/pricing"
              className="h-11 inline-flex items-center justify-center rounded-full border border-line-strong px-7 font-medium hover:bg-black/[0.03]"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

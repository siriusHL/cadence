'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import './home-v2.css';
import {
  HeroDashMockCompact,
  YearCalendar,
  BentoMiniDashboard,
  BentoSafetyChips,
  BentoCurrencyFlags,
  BentoCalendarStrip,
  BentoRhythmBars,
} from '@/components/home-v2-mocks';

// ─── Reveal hook + component (scroll-triggered fade-up) ────
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      requestAnimationFrame(() => el.classList.add('revealed'));
    }
    if (!('IntersectionObserver' in window)) {
      el.classList.add('revealed');
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          obs.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -80px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

interface RevealProps {
  children: React.ReactNode;
  delay?: 0 | 1 | 2 | 3 | 4 | 5;
  as?: 'div' | 'section' | 'aside' | 'h2' | 'p';
  className?: string;
}
function Reveal({ children, delay = 0, as: Tag = 'div', className = '' }: RevealProps) {
  const ref = useReveal();
  const cls = ['reveal', delay ? `reveal-d${delay}` : '', className].filter(Boolean).join(' ');
  return (
    // @ts-expect-error generic JSX intrinsic typing
    <Tag ref={ref} className={cls}>{children}</Tag>
  );
}

// ─── Animated counter (count-up when visible) ─────────────
function Counter({
  to,
  prefix = '',
  suffix = '',
  duration = 1800,
  format = 'int',
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  format?: 'int' | 'decimal';
}) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setV(to * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!('IntersectionObserver' in window)) {
      run();
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run();
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration]);

  const display =
    format === 'decimal' ? v.toFixed(1) : Math.round(v).toLocaleString('en-US');

  return <span ref={ref} className="num">{prefix}{display}{suffix}</span>;
}

// ─── Live ticker strip ──────────────────────────────────────
function LiveTicker() {
  const items = [
    { t: '17:35', from: '🇳🇱 Royal Dutch Shell', amt: '€42.80' },
    { t: '17:34', from: '🇺🇸 Realty Income',     amt: '€18.42' },
    { t: '17:33', from: '🇩🇪 Allianz',           amt: '€634.80' },
    { t: '17:32', from: '🇬🇧 BP',                amt: '€88.50' },
    { t: '17:31', from: '🇨🇭 Nestlé',            amt: '€124.20' },
    { t: '17:30', from: '🇺🇸 Microsoft',         amt: '€34.20' },
    { t: '17:29', from: '🇪🇸 Iberdrola',         amt: '€87.92' },
    { t: '17:28', from: '🇫🇷 LVMH',              amt: '€220.50' },
    { t: '17:27', from: '🇫🇮 Sampo Oyj',         amt: '€61.40' },
    { t: '17:26', from: '🇸🇪 H&M',               amt: '€18.65' },
    { t: '17:25', from: '🇨🇦 Enbridge',          amt: '€72.15' },
    { t: '17:24', from: '🇺🇸 AbbVie',            amt: '€156.30' },
  ];
  const doubled = [...items, ...items];
  return (
    <div className="ticker-strip">
      <div className="ticker-track">
        {doubled.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-2.5 px-4">
            <span className="tk-time" style={{ fontFamily: 'var(--font-mono)' }}>{it.t}</span>
            <span className="tk-from">{it.from}</span>
            <span className="tk-amt num">{it.amt}</span>
            <span className="tk-dot" />
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Tax calculator (interactive) ──────────────────────────
function TaxCalculator() {
  const [portfolio, setPortfolio] = useState(200_000);
  const [yld, setYld] = useState(4.0);

  const gross = portfolio * (yld / 100);
  const foreign = gross * 0.35;
  const reclaimable = foreign * 0.12;
  const overTen = reclaimable * 10;

  const fmtEUR = (n: number) => '€' + Math.round(n).toLocaleString('en-US');

  return (
    <div
      className="tax-calc rounded-[18px] p-7 text-white"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <h3 className="text-[22px] font-semibold tracking-[-0.02em] mb-1">Estimate your reclaim</h3>
      <div className="text-sm text-white/70 mb-7">
        Move the sliders. See what Elite recovers for you each year — and over a decade.
      </div>

      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[13px] text-white/70 font-medium">Your portfolio size</span>
        <span className="num text-[15px] font-semibold">{fmtEUR(portfolio)}</span>
      </div>
      <input
        type="range"
        min={10000}
        max={2000000}
        step={10000}
        value={portfolio}
        onChange={(e) => setPortfolio(Number(e.target.value))}
        aria-label="Portfolio size"
      />
      <div className="flex justify-between text-[10.5px] text-white/55 font-medium num mb-6">
        <span>€10k</span><span>€500k</span><span>€1M</span><span>€2M</span>
      </div>

      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[13px] text-white/70 font-medium">Your portfolio&rsquo;s dividend yield</span>
        <span className="num text-[15px] font-semibold">{yld.toFixed(1)}%</span>
      </div>
      <input
        type="range"
        min={1}
        max={8}
        step={0.1}
        value={yld}
        onChange={(e) => setYld(Number(e.target.value))}
        aria-label="Dividend yield"
      />
      <div className="flex justify-between text-[10.5px] text-white/55 font-medium num">
        <span>1%</span><span>3%</span><span>5%</span><span>8%</span>
      </div>

      <div
        className="mt-7 rounded-[14px] p-5"
        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="text-[12px] text-white/65 uppercase tracking-[0.08em] font-semibold mb-1.5">
          Estimated annual reclaim
        </div>
        <div
          className="num font-semibold text-[44px] leading-none"
          style={{ letterSpacing: '-0.035em', color: 'oklch(0.78 0.12 175)' }}
        >
          {fmtEUR(reclaimable)}
        </div>
        <div className="text-[12px] text-white/65 mt-2">
          Recovered from over-withholding on your foreign dividends
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {[
            { l: 'Annual dividends', v: fmtEUR(gross) },
            { l: 'From abroad',     v: fmtEUR(foreign) },
            { l: 'Over 10 years',   v: fmtEUR(overTen) },
          ].map((b) => (
            <div key={b.l}>
              <div className="text-[10.5px] text-white/55 uppercase tracking-[0.06em] font-semibold mb-1">{b.l}</div>
              <div className="num text-[18px] font-semibold" style={{ letterSpacing: '-0.02em' }}>{b.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FAQ list ──────────────────────────────────────────────
const FAQS = [
  {
    q: 'Does Cadence connect to my broker?',
    a: 'Yes. We support 50+ European brokers via read-only API — DEGIRO, Interactive Brokers, Trade Republic, Saxo, Bolero, BinckBank, ABN AMRO, ING, and more. Premium and Elite sync nightly. Free works via CSV import. We never see or store your broker password — connections use OAuth or read-only API tokens.',
  },
  {
    q: 'Can Cadence actually file my taxes?',
    a: 'Elite prepares Box 3-ready reports for the Netherlands and equivalent reports for Belgium, France, and Germany. For US-source dividends, Cadence files the W-8BEN-E treaty form for you and recovers over-withholding directly from the IRS. We handle filing where the jurisdiction permits, and prepare ready-to-mail forms where it doesn’t.',
  },
  {
    q: 'How accurate is the safety score?',
    a: 'Each share is graded across four pillars — payout ratio, free-cashflow coverage, debt-to-equity, and 10-year dividend growth consistency. Inputs are refreshed nightly from filings. Backtested across 25 years of dividend cuts: companies graded D or F at the time of cut showed in the cut population around 78% of the time.',
  },
  {
    q: 'What’s the difference between Premium and Elite?',
    a: 'Premium is the analytics — the full nine-screen research desk: forecast, drilldown, calendar, DRIP simulator, sector/geo analysis, performance vs benchmark. Elite is the operations on top — automating tax reclaim, Google Calendar sync, mobile alerts, and accountant-ready exports. If you’ve ever spent a Sunday on a spreadsheet during tax season, Elite is for you.',
  },
  {
    q: 'Where is my data?',
    a: 'Hosted in Frankfurt 🇪🇺 on GDPR-compliant EU infrastructure. We never sell, share, or analyse your trades for any third party. You can export everything and delete your account in two clicks, anytime.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, from settings in one click. No phone calls, no retention scripts. Your data stays accessible in Free mode (with a 15-position cap) — your history is never deleted unless you explicitly ask.',
  },
];

// ─── The page ─────────────────────────────────────────────
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="bg-bg text-ink min-h-screen overflow-x-hidden">
      {/* ─── 1. NAV ─────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-10 py-4 backdrop-blur-xl"
        style={{ background: 'rgba(251,250,247,0.85)', borderBottom: '1px solid var(--border)' }}
      >
        <Link href="/" className="flex items-center gap-2.5 text-[13.5px] font-semibold tracking-[0.08em] uppercase">
          <span className="w-2 h-2 rounded-full bg-accent-soft" />
          Cadence
        </Link>
        <div className="hidden md:flex items-center gap-8 text-[13.5px] text-ink-soft">
          <a href="#features" className="hover-underline">Product</a>
          <a href="#income" className="hover-underline">Income</a>
          <a href="#tax" className="hover-underline">Tax</a>
          <a href="#plans" className="hover-underline">Plans</a>
          <Link href="/insights" className="hover-underline">Insights</Link>
          <a href="#faq" className="hover-underline">FAQ</a>
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="hidden sm:inline-block text-[13.5px] text-ink-soft font-medium hover-underline"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center h-9 px-4 rounded-full bg-ink text-white text-[13.5px] font-medium hover:opacity-90 transition-opacity"
          >
            Start free →
          </Link>
        </div>
      </nav>

      {/* ─── 2. LIVE TICKER ─────────────────────────────── */}
      <LiveTicker />

      {/* ─── 3. ASYMMETRIC HERO ─────────────────────────── */}
      <section className="mx-auto max-w-[1480px] px-16 pt-24 pb-20 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
        <div className="max-w-[600px]">
          <div className="hero-rise-1 text-[12px] text-ink-soft font-medium flex items-center mb-7">
            <span className="ping" />Live · 1,840 dividends paid this week
          </div>
          <h1
            className="hero-rise-2 font-bold leading-[0.94]"
            style={{ fontSize: 'clamp(56px, 8vw, 96px)', letterSpacing: '-0.055em' }}
          >
            Your dividend portfolio,<br />
            <span className="font-light text-ink-dim">finally organised.</span>
          </h1>
          <p className="hero-rise-3 mt-7 text-[19px] text-ink-soft leading-[1.45] max-w-[480px]" style={{ letterSpacing: '-0.01em' }}>
            Cadence is the dividend portfolio tracker for European investors who treat their income stream as serious work. <b className="text-ink">Forecast every payment, score every share&rsquo;s safety, reclaim every tax euro</b> — quietly, beautifully, all in one app.
          </p>
          <div className="hero-rise-4 mt-9 flex gap-3 flex-wrap">
            <Link
              href="/signup"
              className="inline-flex items-center h-12 px-7 rounded-full bg-ink text-white font-medium hover:opacity-90 active:scale-[0.97] transition"
            >
              Start free
            </Link>
            <button
              type="button"
              className="inline-flex items-center h-12 px-7 rounded-full font-medium border hover:bg-black/[0.03] active:scale-[0.97] transition"
              style={{ borderColor: 'var(--border-strong)' }}
            >
              Watch 90-second tour →
            </button>
          </div>
          <div
            className="hero-rise-5 mt-12 pt-7 grid grid-cols-3 gap-6"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {[
              { v: <Counter to={12400} suffix="+" />,           l: 'Investors' },
              { v: <><span className="num">€</span><Counter to={820} suffix="M" /></>, l: 'Tracked' },
              { v: <><Counter to={4.8} format="decimal" /> ★</>, l: '1,840 reviews' },
            ].map((s, i) => (
              <div
                key={i}
                className="px-1"
                style={{ borderLeft: i > 0 ? '1px solid var(--border)' : 'none', paddingLeft: i > 0 ? '24px' : 0 }}
              >
                <div className="num font-semibold text-[24px] leading-none" style={{ letterSpacing: '-0.025em' }}>{s.v}</div>
                <div className="text-[11.5px] text-ink-dim mt-1.5 font-medium uppercase tracking-[0.08em]">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-visual relative">
          <div
            className="mock rounded-[18px] overflow-hidden bg-white"
            style={{
              boxShadow:
                '0 1px 2px rgba(0,0,0,0.04), 0 20px 60px -20px rgba(0,0,0,0.18), 0 60px 120px -40px rgba(0,0,0,0.15)',
              border: '1px solid var(--border)',
            }}
          >
            <HeroDashMockCompact />
          </div>
        </div>
      </section>

      {/* ─── 4. MARQUEE VALUE ───────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-[1480px] px-16 py-24" >
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-14 py-12" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="text-[12px] text-ink-soft font-semibold uppercase tracking-[0.16em] mb-5">
              The Elite reclaim engine
            </div>
            <h2 className="font-semibold leading-[0.95]" style={{ fontSize: 'clamp(40px, 6vw, 72px)', letterSpacing: '-0.045em' }}>
              <span className="num" style={{ color: 'oklch(0.48 0.08 175)' }}>€340</span>{' '}
              <span className="font-light text-ink-dim">/ year, reclaimed</span><br />
              on average — per Elite member.
            </h2>
          </div>
          <div className="flex items-end">
            <p className="text-[17px] text-ink-soft leading-[1.55]">
              Every Swiss, French, or American dividend gets over-withheld at source. Cadence Elite tracks every cent and <b className="text-ink">files reclaims automatically</b>. The €19/mo plan typically pays for itself in March.
            </p>
          </div>
        </div>
      </Reveal>

      {/* ─── 5. BENTO GRID ──────────────────────────────── */}
      <section id="features" className="mx-auto max-w-[1480px] px-16 py-24">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-12 mb-14">
          <Reveal>
            <div className="text-[12px] text-ink-soft font-semibold uppercase tracking-[0.16em] mb-5">
              Why Cadence
            </div>
            <h2 className="font-semibold leading-[0.96]" style={{ fontSize: 'clamp(40px, 5.5vw, 64px)', letterSpacing: '-0.045em' }}>
              Everything an income<br /><span className="font-light text-ink-dim">investor actually needs.</span>
            </h2>
          </Reveal>
          <Reveal delay={1}>
            <p className="text-[17px] text-ink-soft leading-[1.55] pt-3">
              From beginner-friendly basics to the kind of operational tooling that quietly saves you money. Five capabilities, one beautifully made product.
            </p>
          </Reveal>
        </div>

        <div className="bento">
          <div className="bento-cell b-dashboard" style={{ ['--d' as never]: '0.05s' }}>
            <div className="b-label">01 · Dashboard</div>
            <h3 className="text-[24px] font-semibold leading-[1.1]" style={{ letterSpacing: '-0.025em' }}>
              One screen for the <span className="font-light text-ink-dim">whole picture</span>.
            </h3>
            <p className="text-[13.5px] text-ink-soft leading-[1.5] mt-2">
              Portfolio value, forward income, KPI tiles, and your next four payments — every number you need before market open.
            </p>
            <div className="mt-3 flex-1 flex items-end">
              <div
                className="w-full rounded-[10px] overflow-hidden border"
                style={{ borderColor: 'var(--border)' }}
              >
                <BentoMiniDashboard />
              </div>
            </div>
          </div>

          <div className="bento-cell b-safety" style={{ ['--d' as never]: '0.13s' }}>
            <div className="b-label">02 · Safety</div>
            <h3 className="text-[24px] font-semibold leading-[1.1]" style={{ letterSpacing: '-0.025em' }}>A → F per share.</h3>
            <p className="text-[13.5px] text-ink-soft leading-[1.5] mt-2">
              Distilled from payout ratio, cashflow, debt, and 10y growth history.
            </p>
            <div className="mt-auto pt-3"><BentoSafetyChips /></div>
          </div>

          <div className="bento-cell b-currency" style={{ ['--d' as never]: '0.21s' }}>
            <div className="b-label">03 · Currencies</div>
            <h3 className="text-[24px] font-semibold leading-[1.1]" style={{ letterSpacing: '-0.025em' }}>
              8 currencies, <span className="font-light text-ink-dim">netted to €.</span>
            </h3>
            <p className="text-[13.5px] text-ink-soft leading-[1.5] mt-2">
              ECB reference rates · gross / withheld / reclaimable split everywhere.
            </p>
            <div className="mt-auto pt-3"><BentoCurrencyFlags /></div>
          </div>

          <div className="bento-cell b-calendar" style={{ ['--d' as never]: '0.29s' }}>
            <div className="b-label">04 · Calendar</div>
            <h3 className="text-[24px] font-semibold leading-[1.1]" style={{ letterSpacing: '-0.025em' }}>
              Your year, <span className="font-light text-ink-dim">on one page.</span>
            </h3>
            <p className="text-[13.5px] text-ink-soft leading-[1.5] mt-2">
              Every ex-date and pay-date, projected 12 months out. Click any cell, see the position.
            </p>
            <div className="mt-auto pt-3"><BentoCalendarStrip /></div>
          </div>

          <div className="bento-cell b-cadence dark" style={{ ['--d' as never]: '0.37s' }}>
            <div className="b-label">05 · The Cadence metric</div>
            <h3 className="text-[24px] font-semibold leading-[1.1]" style={{ letterSpacing: '-0.025em' }}>
              Track the <span className="font-light" style={{ color: 'rgba(245,241,230,0.5)' }}>rhythm</span> of your income.
            </h3>
            <p className="text-[13.5px] leading-[1.5] mt-2" style={{ color: 'rgba(245,241,230,0.65)' }}>
              Not just totals — flow. How evenly your income lands across the year. Lumpy month? Diversify. Empty August? Add a monthly payer.
            </p>
            <div className="mt-auto pt-3"><BentoRhythmBars /></div>
          </div>
        </div>
      </section>

      {/* ─── 6. INCOME ENGINE (DARK) ────────────────────── */}
      <section id="income" className="bg-ink text-[#f5f1e6] py-28">
        <div className="mx-auto max-w-[1480px] px-16 grid lg:grid-cols-[1fr_1.3fr] gap-20 items-center">
          <Reveal>
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] mb-5" style={{ color: 'oklch(0.68 0.12 175)' }}>
              The income engine
            </div>
            <h2 className="font-semibold leading-[0.96]" style={{ fontSize: 'clamp(40px, 5.5vw, 64px)', letterSpacing: '-0.045em' }}>
              347,800 dividends<br />
              <span className="font-light" style={{ color: 'rgba(245,241,230,0.55)' }}>already recorded.</span>
            </h2>
            <p className="mt-7 text-[17px] leading-[1.55]" style={{ color: 'rgba(245,241,230,0.75)' }}>
              Cadence already tracks <b style={{ color: '#f5f1e6' }}>€18.4M</b> in dividend payments this year alone. Your portfolio joins a system that&rsquo;s already proven across <b style={{ color: '#f5f1e6' }}>32 countries</b> and <b style={{ color: '#f5f1e6' }}>8 currencies</b>.
            </p>
            <button
              type="button"
              className="mt-8 inline-flex items-center h-12 px-7 rounded-full font-medium hover:opacity-90 active:scale-[0.97] transition"
              style={{ background: 'oklch(0.68 0.12 175)', color: '#1d1d1f' }}
            >
              See the engine →
            </button>
          </Reveal>
          <Reveal delay={1}>
            <div
              className="rounded-[18px] p-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,241,230,0.08)' }}
            >
              <YearCalendar dark />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── 7. TAX ENGINE (GRADIENT) ───────────────────── */}
      <section id="tax" className="tax-bleed py-28">
        <div className="mx-auto max-w-[1480px] px-16 grid lg:grid-cols-[1fr_1.1fr] gap-20 items-center">
          <Reveal>
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] mb-5" style={{ color: 'oklch(0.78 0.12 175)' }}>
              Tax &amp; treaty · Elite
            </div>
            <h2 className="font-semibold leading-[0.96]" style={{ fontSize: 'clamp(40px, 5.5vw, 64px)', letterSpacing: '-0.045em' }}>
              Reclaim what&rsquo;s <span className="font-light" style={{ color: 'rgba(245,241,230,0.5)' }}>yours.</span>
            </h2>
            <p className="mt-7 text-[17px] leading-[1.55]" style={{ color: 'rgba(245,241,230,0.78)' }}>
              Every cross-border dividend gets over-withheld at source. Elite tracks every cent, prepares your reclaim forms, and <b style={{ color: '#f5f1e6' }}>files them automatically</b> where supported.
            </p>
            <ul className="mt-7 flex flex-col gap-3 text-[14.5px]" style={{ color: 'rgba(245,241,230,0.85)' }}>
              {[
                'Treaty rates per country, per share',
                'Box 3 (NL) + equivalents BE, FR, DE',
                'W-8BEN-E for US · 1-click filing',
                'Accountant-ready exports (CSV/PDF/XLSX)',
              ].map((item) => (
                <li key={item} className="flex gap-3 items-start">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background: 'oklch(0.68 0.12 175)', color: '#1d1d1f' }}
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div
              className="mt-7 p-4 rounded-[12px] text-[14px] leading-[1.5]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(245,241,230,0.9)',
              }}
            >
              The average Elite member recovers <b style={{ color: '#f5f1e6' }}>€340/year</b> they didn&rsquo;t know they were owed — almost twice the annual subscription.
            </div>
          </Reveal>
          <Reveal delay={1}>
            <TaxCalculator />
          </Reveal>
        </div>
      </section>

      {/* ─── 8. PLANS GRID ──────────────────────────────── */}
      <section id="plans" className="mx-auto max-w-[1480px] px-16 py-28">
        <div className="text-center max-w-[680px] mx-auto mb-14">
          <Reveal>
            <div className="text-[12px] text-ink-soft font-semibold uppercase tracking-[0.16em] mb-5">
              Three plans
            </div>
          </Reveal>
          <Reveal delay={1}>
            <h2 className="font-semibold leading-[0.96]" style={{ fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '-0.045em' }}>
              Pick the one that <span className="font-light text-ink-dim">matches your seriousness</span>.
            </h2>
          </Reveal>
          <Reveal delay={2}>
            <p className="mt-6 text-[16px] text-ink-soft">No asterisks, no &ldquo;ask for a demo&rdquo;. Cancel anytime. 14-day trial on paid plans.</p>
          </Reveal>
        </div>

        <div className="grid lg:grid-cols-3 gap-3.5 items-start">
          {/* Free */}
          <Reveal>
            <div className="plan-col">
              <div className="flex items-center justify-between">
                <div className="text-[20px] font-semibold">Free</div>
                <span
                  className="text-[10.5px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                >
                  Forever
                </span>
              </div>
              <div style={{ borderBottom: '1px solid var(--border)' }} />
              <div className="num font-semibold leading-none" style={{ fontSize: 56, letterSpacing: '-0.05em' }}>
                €0<span className="text-ink-dim text-[16px] font-normal ml-1.5">/ forever</span>
              </div>
              <div className="text-[12px] text-ink-dim">No card needed</div>
              <div className="text-[14px] text-ink-soft mt-1">For new dividend investors finding their footing.</div>
              <ul className="flex flex-col gap-2.5 mt-3 text-[14px]">
                {['Up to 15 positions','Your money home screen','Coming up · next payments','Your year · monthly story','Manual CSV imports'].map((f) => (
                  <li key={f} className="flex gap-2.5 items-start">
                    <span className="ck">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
                {['No safety scoring','No forecast','No tax automation'].map((f) => (
                  <li key={f} className="flex gap-2.5 items-start text-ink-dim">
                    <span className="ck">—</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center w-full h-11 rounded-full font-medium border hover:bg-black/[0.03] active:scale-[0.97] transition"
                  style={{ borderColor: 'var(--border-strong)' }}
                >
                  Start free
                </Link>
              </div>
            </div>
          </Reveal>

          {/* Premium (featured) */}
          <Reveal delay={1}>
            <div className="plan-col featured">
              <div className="flex items-center justify-between">
                <div className="text-[20px] font-semibold">Premium</div>
                <span
                  className="text-[10.5px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(245,241,230,0.1)', color: 'rgba(245,241,230,0.9)' }}
                >
                  Most popular
                </span>
              </div>
              <div style={{ borderBottom: '1px solid rgba(245,241,230,0.1)' }} />
              <div className="num font-semibold leading-none" style={{ fontSize: 56, letterSpacing: '-0.05em' }}>
                €9<span className="text-[16px] font-normal ml-1.5" style={{ color: 'rgba(245,241,230,0.55)' }}>/ month</span>
              </div>
              <div className="text-[12px]" style={{ color: 'rgba(245,241,230,0.55)' }}>or €84/yr — save €24</div>
              <div className="text-[14px] mt-1" style={{ color: 'rgba(245,241,230,0.85)' }}>
                The full nine-screen research desk for serious income investors.
              </div>
              <ul className="flex flex-col gap-2.5 mt-3 text-[14px]" style={{ color: 'rgba(245,241,230,0.95)' }}>
                {[
                  <><b>Unlimited positions</b>, 8 currencies</>,
                  'Full pro dashboard + 9 screens',
                  <><b>Safety scoring A → F</b></>,
                  <><b>12-month income forecast</b></>,
                  'DRIP simulator + FIRE projection',
                  'Auto-sync 50+ EU brokers',
                  'Performance vs benchmark',
                  'Sector & geo diversification',
                ].map((f, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <span className="ck">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-3">
                <Link
                  href="/signup?plan=premium"
                  className="inline-flex items-center justify-center w-full h-11 rounded-full bg-white text-ink font-medium hover:opacity-90 active:scale-[0.97] transition"
                >
                  Try Premium · 14d free
                </Link>
              </div>
            </div>
          </Reveal>

          {/* Elite */}
          <Reveal delay={2}>
            <div className="plan-col">
              <div className="flex items-center justify-between">
                <div className="text-[20px] font-semibold" style={{ color: 'oklch(0.48 0.08 175)' }}>Elite</div>
                <span
                  className="text-[10.5px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
                  style={{ background: 'oklch(0.94 0.04 175)', color: 'oklch(0.48 0.08 175)' }}
                >
                  Operations
                </span>
              </div>
              <div style={{ borderBottom: '1px solid var(--border)' }} />
              <div className="num font-semibold leading-none" style={{ fontSize: 56, letterSpacing: '-0.05em' }}>
                €19<span className="text-ink-dim text-[16px] font-normal ml-1.5">/ month</span>
              </div>
              <div className="text-[12px] text-ink-dim">or €180/yr — save €48</div>
              <div className="text-[14px] text-ink-soft mt-1">
                All of Premium, plus the things that quietly cost you money or your weekend.
              </div>
              <ul className="flex flex-col gap-2.5 mt-3 text-[14px]">
                <li className="flex gap-2.5 items-start">
                  <span className="ck">✓</span>
                  <span><b>Everything in Premium</b></span>
                </li>
                {[
                  <><b>Tax &amp; treaty automation</b></>,
                  <><b>1-click withholding reclaim</b></>,
                  <><b>Google Calendar sync</b></>,
                  <><b>Mobile alerts on payday</b></>,
                  <><b>CSV / PDF / XLSX exports</b></>,
                  <>Priority email · &lt;4h response</>,
                ].map((f, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <span className="ck star">★</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-3">
                <Link
                  href="/signup?plan=elite"
                  className="inline-flex items-center justify-center w-full h-11 rounded-full text-white font-medium hover:opacity-90 active:scale-[0.97] transition"
                  style={{ background: 'oklch(0.48 0.08 175)' }}
                >
                  Try Elite · 14d free
                </Link>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="text-center mt-10 text-[13px] text-ink-dim">
          All plans · cancel anytime · GDPR-compliant · hosted in Frankfurt 🇪🇺
        </div>
      </section>

      {/* ─── 9. QUOTE ───────────────────────────────────── */}
      <section className="py-24 px-6" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <Reveal className="max-w-[920px] mx-auto text-center">
          <blockquote>
            <div className="q-mark mb-2">&ldquo;</div>
            <div
              className="font-medium leading-[1.15]"
              style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.035em' }}
            >
              Used a spreadsheet for nine years. Migrated to Cadence in twenty minutes.{' '}
              <span className="font-light text-ink-dim">
                It immediately told me Switzerland owed me €420.
              </span>
            </div>
            <div className="flex items-center gap-3 mt-10 justify-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, oklch(0.55 0.10 175), oklch(0.42 0.07 195))' }}
              >
                L
              </div>
              <div className="text-[14px]">
                <b>Lukas K.</b> <span className="text-ink-dim">· Engineer · Zürich · Elite member</span>
              </div>
            </div>
          </blockquote>
        </Reveal>
      </section>

      {/* ─── 10. FAQ ─────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-[920px] px-6 py-24">
        <div className="text-center mb-14">
          <Reveal>
            <span className="text-[12px] text-ink-soft font-semibold uppercase tracking-[0.16em] block mb-5">
              Things you might be wondering
            </span>
          </Reveal>
          <Reveal delay={1}>
            <h2 className="font-semibold leading-[0.96]" style={{ fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '-0.045em' }}>
              Questions, <span className="font-light text-ink-dim">briefly answered.</span>
            </h2>
          </Reveal>
        </div>

        <div>
          {FAQS.map((f, i) => (
            <button
              key={i}
              type="button"
              className={`faq-item w-full text-left ${openFaq === i ? 'open' : ''}`}
              aria-expanded={openFaq === i}
              onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
            >
              <div className="q">
                <span>{f.q}</span>
                <span className="icon">+</span>
              </div>
              <div className="a">{f.a}</div>
            </button>
          ))}
        </div>
      </section>

      {/* ─── 11. FINAL CTA ──────────────────────────────── */}
      <section className="px-10 pb-16">
        <div
          className="mx-auto rounded-[28px] p-16 text-center"
          style={{
            maxWidth: 1400,
            background: '#1d1d1f',
            color: '#f5f1e6',
          }}
        >
          <Reveal>
            <h2 className="font-semibold leading-[0.95]" style={{ fontSize: 'clamp(40px, 7vw, 88px)', letterSpacing: '-0.05em' }}>
              Start watching your<br />
              dividends, <span className="font-light" style={{ color: 'rgba(245,241,230,0.5)' }}>properly.</span>
            </h2>
          </Reveal>
          <Reveal delay={1}>
            <p className="mt-7 text-[17px]" style={{ color: 'rgba(245,241,230,0.7)' }}>
              90 seconds to connect a broker. No card for Free. Cancel anytime.
            </p>
          </Reveal>
          <Reveal delay={2}>
            <div className="mt-9 flex gap-3 justify-center flex-wrap">
              <Link
                href="/signup"
                className="inline-flex items-center h-12 px-7 rounded-full bg-white text-ink font-medium hover:opacity-90 active:scale-[0.97] transition"
              >
                Start free
              </Link>
              <button
                type="button"
                className="inline-flex items-center h-12 px-7 rounded-full font-medium border active:scale-[0.97] transition hover:bg-white/5"
                style={{ borderColor: 'rgba(245,241,230,0.3)', color: '#f5f1e6' }}
              >
                Talk to us →
              </button>
            </div>
          </Reveal>
          <Reveal delay={3}>
            <div className="mt-7 text-[12px]" style={{ color: 'rgba(245,241,230,0.5)' }}>
              Made in Amsterdam · Frankfurt · Lisbon · 🇪🇺 GDPR since day one
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────── */}
      <footer className="px-10 pb-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="mx-auto max-w-[1400px] grid lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-10 py-8">
          <div>
            <div className="flex items-center gap-2.5 text-[13.5px] font-semibold tracking-[0.08em] uppercase mb-4">
              <span className="w-2 h-2 rounded-full bg-accent-soft" />
              Cadence
            </div>
            <div className="text-[13px] text-ink-soft leading-[1.55] max-w-[280px]">
              The portfolio tracker for European dividend investors. Not investment advice. © 2026 Cadence Financial Tools B.V.
            </div>
          </div>
          {[
            { h: 'Product',   links: ['Features', 'Pricing', 'Roadmap', 'Changelog'] },
            { h: 'Company',   links: ['About', 'Press', 'Careers', 'Contact'] },
            { h: 'Resources', links: ['Insights', 'Help center', 'Tax guides', 'Glossary'] },
            { h: 'Legal',     links: ['Privacy', 'Terms', 'DPA · GDPR', 'Security'] },
          ].map((col) => (
            <div key={col.h}>
              <h6 className="text-[12px] font-semibold uppercase tracking-[0.1em] mb-4">{col.h}</h6>
              <ul className="flex flex-col gap-2.5 text-[13px] text-ink-soft">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href={l === 'Insights' ? '/insights' : '#'} className="hover-underline">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          className="mx-auto max-w-[1400px] flex justify-between items-center pt-6 text-[12px] text-ink-dim"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <span>© 2026 Cadence Financial Tools B.V. · Amsterdam</span>
          <div className="flex gap-5">
            <a href="#" className="hover-underline">Twitter / X</a>
            <a href="#" className="hover-underline">LinkedIn</a>
            <a href="#" className="hover-underline">r/cadence</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

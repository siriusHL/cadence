import Link from 'next/link';
import { LandingMobile } from '@/components/mobile/PublicMobile';

export default function LandingPage() {
  return (
    <>
      <div className="cdn-mobile-only">
        <LandingMobile />
      </div>
      <main className="cdn-desktop-only min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-8 py-5 border-b border-line">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.06em] uppercase">
            <span className="w-2 h-2 rounded-full bg-accent-soft" />
            Cadence
          </Link>
          <nav className="flex items-center gap-7 text-sm text-ink-soft">
            <Link href="/pricing" className="hover:text-ink">Pricing</Link>
            <Link href="/login" className="hover:text-ink">Log in</Link>
            <Link
              href="/signup"
              className="px-4 h-9 inline-flex items-center rounded-full bg-ink text-white text-sm font-medium hover:opacity-90"
            >
              Get started
            </Link>
          </nav>
        </header>

        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
          <div className="text-xs text-ink-soft font-medium mb-5 tracking-wide">
            Built for dividend investors
          </div>
          <h1 className="text-[88px] leading-none font-semibold tracking-[-0.04em] max-w-4xl">
            See your money <span className="text-ink-dim font-light">working</span>.
          </h1>
          <p className="mt-8 text-xl text-ink-soft max-w-2xl leading-snug tracking-tight">
            Cadence tracks every dividend you receive, forecasts the next twelve months,
            and shows you exactly how close you are to living off your portfolio.
          </p>
          <div className="mt-12 flex gap-3">
            <Link
              href="/signup"
              className="h-11 px-7 inline-flex items-center rounded-full bg-ink text-white font-medium hover:opacity-90"
            >
              Start free
            </Link>
            <Link
              href="/pricing"
              className="h-11 px-7 inline-flex items-center rounded-full border border-line-strong font-medium hover:bg-black/[0.03]"
            >
              See pricing
            </Link>
          </div>
          <div className="mt-6 text-xs text-ink-dim">
            Free tier — no credit card. 10 holdings, 4 essential screens.
          </div>
        </section>

        <footer className="border-t border-line px-8 py-6 text-xs text-ink-dim flex justify-between">
          <span>© {new Date().getFullYear()} Cadence</span>
          <span>Not financial advice.</span>
        </footer>
      </main>
    </>
  );
}

import Link from 'next/link';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getHoldingsView, type HoldingView } from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { EmptyState } from '@/components/EmptyState';
import { TickerLogo } from '@/components/TickerLogo';
import { StockCardMenu } from '@/components/StockCardMenu';
import { type Tier } from '@/lib/tiers';

function safetyForYield(yieldPct: number | null): { label: string; cls: string } {
  if (yieldPct == null) return { label: 'New', cls: '' };
  if (yieldPct < 3) return { label: 'Very safe', cls: 'safe' };
  if (yieldPct < 5) return { label: 'Safe', cls: 'safe' };
  if (yieldPct < 7) return { label: 'OK', cls: '' };
  return { label: 'Watch', cls: '' };
}

function symbolFor(ccy: string | null | undefined): string {
  switch (ccy) {
    case 'EUR': return '€';
    case 'USD': return '$';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'CHF': return 'CHF ';
    case 'CAD': return 'C$';
    default: return '';
  }
}

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function StockCard({ h }: { h: HoldingView }) {
  const annualLocal = (h.fwdDivAnnualLocal ?? 0) * h.quantity;
  const monthlyLocal = annualLocal / 12;
  const valueLocal = (h.price ?? 0) * h.quantity;
  const safety = safetyForYield(h.fwdYieldPct);
  const sym = symbolFor(h.currency);

  return (
    <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <TickerLogo ticker={h.ticker} size={40} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{h.ticker}</div>
            <div style={{
              fontSize: 12, color: '#86868b', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {h.name ?? h.ticker}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {safety.label !== 'New' && (
            <span className={'pill ' + safety.cls}>
              <span className="dot" style={{ background: 'currentColor' }} />
              {safety.label}
            </span>
          )}
          <StockCardMenu ticker={h.ticker} name={h.name} />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: '#86868b', marginBottom: 2 }}>Pays you</div>
        <div className="num" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {sym}{fmt(monthlyLocal)}
          <span style={{ fontSize: 13, color: '#86868b', fontWeight: 400 }}> / month</span>
        </div>
        <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 4 }}>
          {sym}{fmt(annualLocal)} <span style={{ color: '#86868b' }}>per year</span>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
        paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.05)',
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#86868b' }}>Shares</div>
          <div className="num" style={{ fontSize: 14, fontWeight: 500 }}>
            {fmt(h.quantity, h.quantity % 1 === 0 ? 0 : 2)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#86868b' }}>Value</div>
          <div className="num" style={{ fontSize: 14, fontWeight: 500 }}>
            {h.price != null ? `${sym}${fmt(valueLocal)}` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#86868b' }}>Yield</div>
          <div className="num" style={{ fontSize: 14, fontWeight: 500 }}>
            {h.fwdYieldPct != null ? `${h.fwdYieldPct.toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function StocksScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sub } = await supabase
    .from('subscriptions').select('tier').eq('user_id', user!.id).single();
  const tier = (sub?.tier ?? 'free') as Tier;
  const portfolio = await getActivePortfolio(supabase, user!.id);

  if (!portfolio) {
    return (
      <EmptyState
        title="Add your first holding"
        body="Track your dividend stocks here. Cadence will show what each one pays you, when, and how it adds up."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  // First pass: read holdings without market data (cheap query).
  const initial = (await getHoldingsView(supabase, portfolio.id)).filter((h) => h.quantity > 0);

  if (initial.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No active holdings yet"
        body="Add a buy transaction to start tracking a stock. As soon as it pays its first dividend, you'll see it land here."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  // Self-healing: refresh any ticker missing profile/dividend/price (or older
  // than the TTL). Then re-read the view so the page reflects the new data.
  await enrichInstruments(initial.map((h) => h.ticker));
  const holdings = (await getHoldingsView(supabase, portfolio.id)).filter((h) => h.quantity > 0);

  // Cross-position totals (in instrument-local currency for v0; FX-convert in P1).
  const totalMonthly = holdings.reduce(
    (s, h) => s + ((h.fwdDivAnnualLocal ?? 0) * h.quantity) / 12,
    0,
  );
  const totalValue = holdings.reduce(
    (s, h) => s + (h.price ?? 0) * h.quantity,
    0,
  );

  return (
    <>
      <div style={{
        paddingTop: 36, paddingBottom: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24,
      }}>
        <div>
          <div className="sect-h">
            Your <span className="light">{holdings.length} dividend stock{holdings.length === 1 ? '' : 's'}</span>
          </div>
          <div className="sect-sub">
            Worth about <b style={{ color: '#1d1d1f', fontWeight: 500 }}>€{fmt(totalValue)}</b>,
            paying you <b style={{ color: '#1d1d1f', fontWeight: 500 }}>€{fmt(totalMonthly)} every month</b>.
          </div>
        </div>
        <Link
          href="/app/add"
          className="btn"
          style={{ textDecoration: 'none', flexShrink: 0 }}
        >
          + Add holding
        </Link>
      </div>

      <div className="grid-4">
        {holdings.map((h) => <StockCard key={h.ticker} h={h} />)}
      </div>

      {tier === 'free' && (
        <div style={{ marginTop: 22 }}>
          <div className="upsell">
            <div className="icon">✦</div>
            <div className="body">
              <div className="h">Unlock deeper research</div>
              <div className="p">Premium shows safety scores, dividend history, payout ratios, and analyst views for every stock you own — and any you&apos;re considering.</div>
            </div>
            <Link href="/upgrade" className="cta" style={{ textDecoration: 'none' }}>Try Premium</Link>
          </div>
        </div>
      )}
    </>
  );
}

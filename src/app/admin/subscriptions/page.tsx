import { getOverviewStats } from '@/lib/adminData';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { type Tier } from '@/lib/tiers';

export const dynamic = 'force-dynamic';

// Illustrative pricing — the real amounts live in Stripe. Used only for the
// rough MRR/ARR estimate shown here.
const MONTHLY_PRICE: Record<Tier, number> = { free: 0, premium: 9, elite: 19 };

const eur = (v: number) => v.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' });
const n = (v: number) => v.toLocaleString('en-IE');

export default async function AdminSubscriptionsPage() {
  const [stats, { data: subs }] = await Promise.all([
    getOverviewStats(),
    supabaseAdmin().from('subscriptions').select('status, cancel_at_period_end, current_period_end'),
  ]);

  const rows = (subs ?? []) as { status: string | null; cancel_at_period_end: boolean | null }[];
  const cancelling = rows.filter((r) => r.cancel_at_period_end).length;

  const mrr = stats.tierCounts.premium * MONTHLY_PRICE.premium + stats.tierCounts.elite * MONTHLY_PRICE.elite;

  const byStatus = new Map<string, number>();
  for (const r of rows) byStatus.set(r.status ?? 'unknown', (byStatus.get(r.status ?? 'unknown') ?? 0) + 1);

  const kpis = [
    { label: 'Est. MRR', value: eur(mrr) },
    { label: 'Est. ARR', value: eur(mrr * 12) },
    { label: 'Paying users', value: n(stats.paying) },
    { label: 'Cancelling', value: n(cancelling) },
  ];

  const tierOrder: Tier[] = ['premium', 'elite', 'free'];

  return (
    <>
      <h1 className="adm-h1">Subscriptions</h1>
      <p className="adm-sub">Revenue snapshot · prices illustrative (source of truth is Stripe)</p>

      <div className="adm-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="adm-kpi">
            <div className="label">{k.label}</div>
            <div className="value">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="adm-card">
        <h2>By tier</h2>
        <table className="adm-table">
          <thead><tr><th>Tier</th><th>Users</th><th>Price / mo</th><th>Est. revenue / mo</th></tr></thead>
          <tbody>
            {tierOrder.map((t) => {
              const count = stats.tierCounts[t];
              return (
                <tr key={t}>
                  <td><span className={`adm-pill ${t}`}>{t}</span></td>
                  <td>{n(count)}</td>
                  <td>{eur(MONTHLY_PRICE[t])}</td>
                  <td>{eur(count * MONTHLY_PRICE[t])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="adm-card">
        <h2>By status</h2>
        <table className="adm-table">
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>
            {[...byStatus.entries()].sort((a, b) => b[1] - a[1]).map(([status, count]) => (
              <tr key={status}><td>{status}</td><td>{n(count)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

import Link from 'next/link';
import { getOverviewStats } from '@/lib/adminData';
import { type Tier } from '@/lib/tiers';

export const dynamic = 'force-dynamic';

const n = (v: number) => v.toLocaleString('en-IE');
const TIER_ORDER: Tier[] = ['free', 'premium', 'elite'];

export default async function AdminOverviewPage() {
  const s = await getOverviewStats();

  const kpis = [
    { label: 'Total users', value: s.totalUsers, delta: `+${n(s.signups7d)} in 7d` },
    { label: 'Paying users', value: s.paying, delta: `${n(s.tierCounts.premium)} premium · ${n(s.tierCounts.elite)} elite` },
    { label: 'New (30d)', value: s.signups30d },
    { label: 'Portfolios', value: s.totalPortfolios },
    { label: 'Holdings', value: s.totalHoldings },
    { label: 'Manual overrides', value: s.overrides },
  ];

  return (
    <>
      <h1 className="adm-h1">Overview</h1>
      <p className="adm-sub">Platform health at a glance.</p>

      <div className="adm-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="adm-kpi">
            <div className="label">{k.label}</div>
            <div className="value">{n(k.value)}</div>
            {k.delta && <div className="delta">{k.delta}</div>}
          </div>
        ))}
      </div>

      <div className="adm-card">
        <h2>Tier distribution</h2>
        <table className="adm-table">
          <thead>
            <tr><th>Tier</th><th>Users</th><th>% of total</th></tr>
          </thead>
          <tbody>
            {TIER_ORDER.map((t) => {
              const count = s.tierCounts[t];
              const pct = s.totalUsers ? ((count / s.totalUsers) * 100).toFixed(1) : '0.0';
              return (
                <tr key={t}>
                  <td><span className={`adm-pill ${t}`}>{t}</span></td>
                  <td>{n(count)}</td>
                  <td>{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="adm-row">
        <Link href="/admin/users" className="adm-btn ghost">Manage users</Link>
        <Link href="/admin/settings" className="adm-btn ghost">Site settings</Link>
        <Link href="/admin/instruments" className="adm-btn ghost">Instrument cache</Link>
      </div>
    </>
  );
}

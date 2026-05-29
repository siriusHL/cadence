import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getUserDetail } from '@/lib/adminData';
import { TierOverrideForm } from '@/components/admin/TierOverrideForm';

export const dynamic = 'force-dynamic';

const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getUserDetail(id);
  if (!u) notFound();

  const rows: [string, React.ReactNode][] = [
    ['User ID', <span className="mono" key="id">{u.id}</span>],
    ['Display name', u.displayName ?? '—'],
    ['Base currency', u.baseCurrency ?? '—'],
    ['Joined', fmtDateTime(u.createdAt)],
    ['Last sign-in', fmtDateTime(u.lastSignInAt)],
    ['Subscription status', u.status ?? '—'],
    ['Stripe customer', <span className="mono" key="sc">{u.stripeCustomerId ?? '—'}</span>],
    ['Stripe subscription', <span className="mono" key="ss">{u.stripeSubscriptionId ?? '—'}</span>],
    ['Current period end', fmtDateTime(u.currentPeriodEnd)],
    ['Cancels at period end', u.cancelAtPeriodEnd ? 'Yes' : 'No'],
  ];

  return (
    <>
      <p className="adm-sub"><Link href="/admin/users" className="adm-muted">← All users</Link></p>
      <h1 className="adm-h1">
        {u.email || '—'}{' '}
        <span className={`adm-pill ${u.tier}`}>{u.tier}</span>
        {u.override && <span className="adm-pill override">override active</span>}
      </h1>
      <p className="adm-sub">&nbsp;</p>

      <div className="adm-card">
        <h2>Plan</h2>
        <TierOverrideForm userId={u.id} baseTier={u.baseTier} override={u.override} />
      </div>

      <div className="adm-card">
        <h2>Account</h2>
        <table className="adm-table">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}><th style={{ width: 200 }}>{k}</th><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="adm-card">
        <h2>Portfolios ({u.portfolios}) · {u.holdings} holdings</h2>
        {u.portfolioList.length === 0 ? (
          <div className="adm-empty">No portfolios.</div>
        ) : (
          <table className="adm-table">
            <thead><tr><th>Name</th><th>Holdings</th><th>ID</th></tr></thead>
            <tbody>
              {u.portfolioList.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.holdings}</td>
                  <td><span className="mono">{p.id}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

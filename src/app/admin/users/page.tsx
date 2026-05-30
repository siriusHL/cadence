import Link from 'next/link';
import { listUsers } from '@/lib/adminData';

export const dynamic = 'force-dynamic';

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IE', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default async function AdminUsersPage(
  { searchParams }: { searchParams: Promise<{ q?: string; page?: string }> },
) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const page = Math.max(1, Number(sp.page ?? '1') || 1);
  const perPage = 25;

  const { users, total } = await listUsers({ page, perPage, search: q });
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (p > 1) params.set('page', String(p));
    const s = params.toString();
    return s ? `/admin/users?${s}` : '/admin/users';
  };

  return (
    <>
      <h1 className="adm-h1">Users</h1>
      <p className="adm-sub">{total.toLocaleString('en-IE')} total · page {page} of {lastPage}</p>

      <form action="/admin/users" method="get" className="adm-toolbar">
        <input type="search" name="q" defaultValue={q ?? ''} placeholder="Search by email…" />
        <button type="submit" className="adm-btn ghost">Search</button>
        {q && <Link href="/admin/users" className="adm-muted">Clear</Link>}
      </form>

      <div className="adm-card">
        {users.length === 0 ? (
          <div className="adm-empty">No users found.</div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Email</th><th>Tier</th><th>Status</th>
                <th>Portfolios</th><th>Holdings</th><th>Joined</th><th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><Link href={`/admin/users/${u.id}`}>{u.email || '—'}</Link></td>
                  <td>
                    <span className={`adm-pill ${u.tier}`}>{u.tier}</span>
                    {u.override && <span className="adm-pill override">override</span>}
                  </td>
                  <td>{u.status ?? '—'}</td>
                  <td>{u.portfolios}</td>
                  <td>{u.holdings}</td>
                  <td>{fmtDate(u.createdAt)}</td>
                  <td>{fmtDate(u.lastSignInAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="adm-row">
        {page > 1 ? <Link href={qs(page - 1)} className="adm-btn ghost">← Prev</Link>
          : <span className="adm-btn ghost" aria-disabled style={{ opacity: 0.5 }}>← Prev</span>}
        {page < lastPage ? <Link href={qs(page + 1)} className="adm-btn ghost">Next →</Link>
          : <span className="adm-btn ghost" aria-disabled style={{ opacity: 0.5 }}>Next →</span>}
      </div>
    </>
  );
}

import Link from 'next/link';
import { listAuditLog } from '@/lib/adminData';

export const dynamic = 'force-dynamic';

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' });

export default async function AdminAuditPage(
  { searchParams }: { searchParams: Promise<{ page?: string }> },
) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? '1') || 1);
  const perPage = 50;

  const { entries, total } = await listAuditLog({ page, perPage });
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const href = (p: number) => (p > 1 ? `/admin/audit?page=${p}` : '/admin/audit');

  return (
    <>
      <h1 className="adm-h1">Audit log</h1>
      <p className="adm-sub">{total.toLocaleString('en-IE')} entries · page {page} of {lastPage}</p>

      <div className="adm-card">
        {entries.length === 0 ? (
          <div className="adm-empty">No audit entries yet.</div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Detail</th></tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(e.createdAt)}</td>
                  <td>{e.actorEmail}</td>
                  <td><span className="adm-pill">{e.action}</span></td>
                  <td>
                    {e.targetType
                      ? <span className="mono">{e.targetType}:{e.targetId ?? '—'}</span>
                      : '—'}
                  </td>
                  <td>
                    <span className="mono" style={{
                      display: 'inline-block', maxWidth: 280, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom',
                    }}>
                      {e.meta ? JSON.stringify(e.meta) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="adm-row">
        {page > 1 ? <Link href={href(page - 1)} className="adm-btn ghost">← Prev</Link>
          : <span className="adm-btn ghost" aria-disabled style={{ opacity: 0.5 }}>← Prev</span>}
        {page < lastPage ? <Link href={href(page + 1)} className="adm-btn ghost">Next →</Link>
          : <span className="adm-btn ghost" aria-disabled style={{ opacity: 0.5 }}>Next →</span>}
      </div>
    </>
  );
}

import Link from 'next/link';
import { listArticlesForAdmin } from '@/lib/insights-admin';
import { InsightsModerationActions } from '@/components/admin/InsightsModerationActions';
import type { InsightsStatus } from '@/lib/insights';

export const dynamic = 'force-dynamic';

const STATUS_STYLE: Record<InsightsStatus, React.CSSProperties> = {
  draft: { background: 'var(--surface-hover)', color: 'var(--text-muted)' },
  scheduled: { background: 'oklch(0.92 0.07 80)', color: 'oklch(0.42 0.09 80)' },
  published: { background: 'var(--accent)', color: '#fff' },
};

function fmtDate(s: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-IE', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function AdminInsightsPage() {
  const articles = await listArticlesForAdmin();
  const draftCount = articles.filter((a) => a.status !== 'published').length;
  const publishedCount = articles.filter((a) => a.status === 'published').length;

  const kpis = [
    { label: 'Awaiting review', value: draftCount },
    { label: 'Published', value: publishedCount },
    { label: 'Total', value: articles.length },
  ];

  return (
    <>
      <h1 className="adm-h1">Insights</h1>
      <p className="adm-sub">
        Review drafts and control what is publicly visible. Publishing is the validation gate —
        an article never appears on the public site until you publish it here.
      </p>

      <div className="adm-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="adm-kpi">
            <div className="label">{k.label}</div>
            <div className="value">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="adm-card">
        <h2>Articles</h2>
        {articles.length === 0 ? (
          <p className="adm-empty">No articles yet.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/admin/insights/${a.id}`}>{a.title}</Link></td>
                  <td>{a.category_name ?? '—'}</td>
                  <td><span className="adm-pill" style={STATUS_STYLE[a.status]}>{a.status}</span></td>
                  <td>{fmtDate(a.updated_at)}</td>
                  <td><InsightsModerationActions id={a.id} status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

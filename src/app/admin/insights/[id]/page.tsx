import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticleForAdminById } from '@/lib/insights-admin';
import { parseMarkdown } from '@/lib/markdown';
import { Markdown } from '@/components/insights/Markdown';
import { InsightsModerationActions } from '@/components/admin/InsightsModerationActions';
import type { InsightsStatus } from '@/lib/insights';

export const dynamic = 'force-dynamic';

const STATUS_STYLE: Record<InsightsStatus, React.CSSProperties> = {
  draft: { background: 'var(--surface-hover)', color: 'var(--text-muted)' },
  scheduled: { background: 'oklch(0.92 0.07 80)', color: 'oklch(0.42 0.09 80)' },
  published: { background: 'var(--accent)', color: '#fff' },
};

export default async function AdminInsightsPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticleForAdminById(id);
  if (!article) notFound();

  const blocks = parseMarkdown(article.body_md);

  return (
    <>
      <p className="adm-sub"><Link href="/admin/insights">← All articles</Link></p>

      <div className="adm-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span className="adm-pill" style={STATUS_STYLE[article.status]}>{article.status}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            {article.status === 'published' && (
              <Link href={`/insights/${article.slug}`} className="adm-muted" target="_blank" rel="noopener">
                View public page ↗
              </Link>
            )}
            <InsightsModerationActions id={article.id} status={article.status} />
          </span>
        </div>

        <p className="adm-muted" style={{ marginTop: 12 }}>
          Reviewing the draft below before publishing — this is the content the public will see.
          Confirm it is original, sources are cited, and any hero image is free-licence with attribution.
        </p>
      </div>

      {/* Render exactly as the public article body renders. */}
      <div className="adm-card">
        <article style={{ maxWidth: 760 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            {article.title}
          </h1>
          <p style={{ marginTop: 10, fontSize: 16, color: 'var(--text-muted)' }}>{article.summary}</p>
          <p className="adm-muted" style={{ marginTop: 8 }}>
            {article.author_name} · {article.category_name ?? 'Uncategorised'} · {article.reading_time_min} min read
          </p>
          {article.hero_image_credit && (
            <p className="adm-muted" style={{ marginTop: 4 }}>Image: {article.hero_image_credit}</p>
          )}
          <div style={{ marginTop: 16 }}>
            <Markdown blocks={blocks} />
          </div>

          {article.sources.length > 0 && (
            <section style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Sources</h2>
              <ul style={{ marginTop: 8, fontSize: 14, color: 'var(--text-muted)' }}>
                {article.sources.map((s, i) => <li key={i}>{s.label}</li>)}
              </ul>
            </section>
          )}

          {article.faq.length > 0 && (
            <section style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>FAQ</h2>
              <div style={{ marginTop: 12 }}>
                {article.faq.map((f, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600 }}>{f.q}</h3>
                    <p style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>{f.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </>
  );
}

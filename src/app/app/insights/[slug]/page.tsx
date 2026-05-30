import type { Metadata } from 'next';
import { InsightsSlugView } from '@/components/insights/views';
import '../../../insights/insights.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Insights',
  robots: { index: false, follow: false },
};

export default async function AppInsightsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="ins-vars">
      <InsightsSlugView basePath="/app/insights" slug={slug} />
    </div>
  );
}

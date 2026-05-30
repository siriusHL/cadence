import type { Metadata } from 'next';
import { InsightsHubView } from '@/components/insights/views';
import '../../insights/insights.css';

// In-app Insights — same content as the public hub, but rendered inside the
// app shell so the app's top nav/menu stays put. Not indexed (the public
// /insights is canonical); the app area is robots-disallowed anyway.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Insights',
  robots: { index: false, follow: false },
};

export default async function AppInsightsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <div className="ins-vars">
      <InsightsHubView basePath="/app/insights" query={(q ?? '').trim()} />
    </div>
  );
}

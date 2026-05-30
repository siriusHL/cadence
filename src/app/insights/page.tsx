import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site';
import { InsightsHubView } from '@/components/insights/views';

export const dynamic = 'force-dynamic';

const TITLE = 'News & Insights';
const DESCRIPTION =
  'Clear guides to the stock market, portfolios, ETFs, dividends, and personal finance — original, educational, and jargon-free.';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: '/insights' },
    robots: q ? { index: false, follow: true } : undefined,
    openGraph: { title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION, url: '/insights', type: 'website' },
  };
}

export default async function InsightsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <InsightsHubView basePath="/insights" query={(q ?? '').trim()} />;
}

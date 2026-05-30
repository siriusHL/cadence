import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site';
import { InsightsSlugView, resolveSlug } from '@/components/insights/views';

// Rendered on demand (not ISR-cached) so an unknown slug returns a real 404 and
// new/edited articles go live without a rebuild.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = await resolveSlug(slug);

  if (r.kind === 'category') {
    const c = r.category;
    const title = c.seo_title ?? `${c.name} | ${SITE_NAME}`;
    const description = c.seo_description ?? c.description;
    return {
      title: c.name,
      description,
      alternates: { canonical: `/insights/${c.slug}` },
      openGraph: { title, description, url: `/insights/${c.slug}`, type: 'website' },
    };
  }

  if (r.kind === 'article') {
    const a = r.article;
    const title = a.seo_title ?? a.title;
    const description = a.meta_description ?? a.summary;
    return {
      title: a.title,
      description,
      keywords: a.keywords,
      authors: [{ name: a.author_name }],
      alternates: { canonical: a.canonical_url ?? `/insights/${a.slug}` },
      openGraph: {
        title,
        description,
        url: `/insights/${a.slug}`,
        type: 'article',
        publishedTime: a.published_at,
        modifiedTime: a.updated_at,
        authors: [a.author_name],
        section: a.category?.name,
        images: a.og_image_url ?? a.hero_image_url ?? undefined,
      },
      twitter: { card: 'summary_large_image', title, description },
    };
  }

  return { title: 'Not found' };
}

export default async function InsightsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <InsightsSlugView basePath="/insights" slug={slug} />;
}

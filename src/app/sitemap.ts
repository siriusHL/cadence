import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { getCategories, listArticles } from '@/lib/insights';

// Public, indexable surface only — the authenticated /app, /admin, /login,
// /upgrade etc. are intentionally excluded. Rendered dynamically so newly
// published articles appear immediately (crawlers hit this rarely, and the
// queries are tiny) rather than being frozen at build time.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/insights`, changeFrequency: 'daily', priority: 0.9 },
  ];

  const [categories, articles] = await Promise.all([
    getCategories().catch(() => []),
    listArticles({ limit: 1000 }).catch(() => []),
  ]);

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/insights/${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE_URL}/insights/${a.slug}`,
    lastModified: a.published_at ? new Date(a.published_at) : undefined,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticEntries, ...categoryEntries, ...articleEntries];
}

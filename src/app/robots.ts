import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Crawl the public marketing + Insights surface; keep the authenticated app,
// admin, and auth flows out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app', '/admin', '/login', '/signup', '/upgrade', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

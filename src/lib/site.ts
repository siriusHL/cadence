// Canonical, absolute base URL of the deployed site. Used for metadataBase,
// canonical links, the sitemap, robots, and Open Graph URLs. Falls back to
// localhost for dev/CI — set NEXT_PUBLIC_SITE_URL in production.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

export const SITE_NAME = 'Cadence';

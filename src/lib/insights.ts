// Read-only data access for the public Insights section.
//
// Public content only: every query runs through the anon key, so RLS
// (insights_articles_read) restricts results to published, past-dated rows.
// No cookies are read, so callers (pages, sitemap) stay statically cacheable.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type InsightsStatus = 'draft' | 'scheduled' | 'published';

export interface InsightsCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
}

export interface InsightsTag {
  slug: string;
  name: string;
}

export interface InsightsFaqItem {
  q: string;
  a: string;
}

export interface InsightsSource {
  label: string;
  url?: string;
}

export interface ArticleCategoryRef {
  slug: string;
  name: string;
}

export interface ArticleListItem {
  slug: string;
  title: string;
  summary: string;
  published_at: string;
  reading_time_min: number;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  author_name: string;
  category: ArticleCategoryRef | null;
}

export interface Article extends ArticleListItem {
  body_md: string;
  hero_image_credit: string | null;
  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  keywords: string[];
  faq: InsightsFaqItem[];
  sources: InsightsSource[];
  updated_at: string;
  tags: InsightsTag[];
}

const LIST_COLUMNS =
  'slug, title, summary, published_at, reading_time_min, hero_image_url, hero_image_alt, author_name, category:insights_categories(slug, name)';

const ARTICLE_COLUMNS =
  `${LIST_COLUMNS}, body_md, hero_image_credit, seo_title, meta_description, canonical_url, og_image_url, keywords, faq, sources, updated_at, tags:insights_tags(slug, name)`;

function client(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// PostgREST returns embedded one-to-one relations as an array in the type but a
// single object at runtime; normalise to a single ref.
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

export async function getCategories(): Promise<InsightsCategory[]> {
  const { data, error } = await client()
    .from('insights_categories')
    .select('id, slug, name, description, seo_title, seo_description, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<InsightsCategory | null> {
  const { data, error } = await client()
    .from('insights_categories')
    .select('id, slug, name, description, seo_title, seo_description, sort_order')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface ListArticlesOptions {
  categorySlug?: string;
  limit?: number;
  offset?: number;
}

export async function listArticles(
  opts: ListArticlesOptions = {},
): Promise<ArticleListItem[]> {
  const c = client();
  let categoryId: string | undefined;
  if (opts.categorySlug) {
    // Resolve slug → id and filter the scalar FK: filtering on an embedded
    // relation's column does not narrow parent rows in PostgREST without an
    // inner-join hint, so this is the robust form. The slug is uniquely indexed.
    const { data: cat, error: catErr } = await c
      .from('insights_categories')
      .select('id')
      .eq('slug', opts.categorySlug)
      .maybeSingle();
    if (catErr) throw catErr;
    if (!cat) return [];
    categoryId = cat.id;
  }
  let q = c
    .from('insights_articles')
    .select(LIST_COLUMNS)
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (categoryId) q = q.eq('category_id', categoryId);
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  q = q.range(offset, offset + limit - 1);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, category: one((r as { category: unknown }).category) }) as ArticleListItem);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await client()
    .from('insights_articles')
    .select(ARTICLE_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    ...(row as object),
    category: one(row.category as ArticleCategoryRef | ArticleCategoryRef[] | null),
    tags: (row.tags as InsightsTag[] | null) ?? [],
    keywords: (row.keywords as string[] | null) ?? [],
    faq: (row.faq as InsightsFaqItem[] | null) ?? [],
    sources: (row.sources as InsightsSource[] | null) ?? [],
  } as Article;
}

// Same-category articles, excluding the current one — for "Related reading".
export async function getRelatedArticles(
  categorySlug: string | null | undefined,
  excludeSlug: string,
  limit = 3,
): Promise<ArticleListItem[]> {
  if (!categorySlug) return [];
  const items = await listArticles({ categorySlug, limit: limit + 1 });
  return items.filter((a) => a.slug !== excludeSlug).slice(0, limit);
}

// Full-text search across title/summary/keywords/body (insights_articles.tsv),
// optionally scoped to a category.
export async function searchArticles(
  query: string,
  opts: { categorySlug?: string; limit?: number } = {},
): Promise<ArticleListItem[]> {
  const term = query.trim();
  if (!term) return [];
  const c = client();
  let categoryId: string | undefined;
  if (opts.categorySlug) {
    const { data: cat, error: catErr } = await c
      .from('insights_categories')
      .select('id')
      .eq('slug', opts.categorySlug)
      .maybeSingle();
    if (catErr) throw catErr;
    if (!cat) return [];
    categoryId = cat.id;
  }
  let q = c
    .from('insights_articles')
    .select(LIST_COLUMNS)
    .eq('status', 'published')
    .textSearch('tsv', term, { type: 'websearch', config: 'english' })
    .order('published_at', { ascending: false })
    .limit(opts.limit ?? 50);
  if (categoryId) q = q.eq('category_id', categoryId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, category: one((r as { category: unknown }).category) }) as ArticleListItem);
}

export interface InsightsStats {
  published: number;
  topics: number;
  avgReadMin: number;
  newThisWeek: number;
}

// Headline counts for the Insights masthead. Small result set (published
// articles), so averaging client-side is cheap.
export async function getInsightsStats(): Promise<InsightsStats> {
  const c = client();
  const [arts, cats] = await Promise.all([
    c.from('insights_articles').select('published_at, reading_time_min').eq('status', 'published'),
    c.from('insights_categories').select('*', { count: 'exact', head: true }),
  ]);
  if (arts.error) throw arts.error;
  if (cats.error) throw cats.error;
  const rows = (arts.data ?? []) as { published_at: string | null; reading_time_min: number }[];
  const published = rows.length;
  const avgReadMin = published
    ? Math.round(rows.reduce((s, r) => s + (r.reading_time_min || 0), 0) / published)
    : 0;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = rows.filter(
    (r) => r.published_at && new Date(r.published_at).getTime() >= cutoff,
  ).length;
  return { published, topics: cats.count ?? 0, avgReadMin, newThisWeek };
}

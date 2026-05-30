// Admin-side reads for Insights moderation. Uses the service-role client so it
// can see every article regardless of status (drafts/scheduled are invisible
// to the public anon client by RLS). Server-only — never import from a client
// component (it would pull the service-role key into the bundle).
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { InsightsFaqItem, InsightsSource, InsightsStatus } from '@/lib/insights';

function oneName(rel: unknown): string | null {
  if (Array.isArray(rel)) return (rel[0] as { name?: string } | undefined)?.name ?? null;
  return (rel as { name?: string } | null)?.name ?? null;
}

export interface AdminArticleRow {
  id: string;
  slug: string;
  title: string;
  status: InsightsStatus;
  category_name: string | null;
  published_at: string | null;
  updated_at: string;
  reading_time_min: number;
}

export async function listArticlesForAdmin(): Promise<AdminArticleRow[]> {
  const { data, error } = await supabaseAdmin()
    .from('insights_articles')
    .select('id, slug, title, status, published_at, updated_at, reading_time_min, category:insights_categories(name)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      status: row.status as InsightsStatus,
      category_name: oneName(row.category),
      published_at: (row.published_at as string | null) ?? null,
      updated_at: row.updated_at as string,
      reading_time_min: row.reading_time_min as number,
    };
  });
}

export interface AdminArticleDetail {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body_md: string;
  status: InsightsStatus;
  author_name: string;
  category_name: string | null;
  published_at: string | null;
  updated_at: string;
  reading_time_min: number;
  hero_image_url: string | null;
  hero_image_credit: string | null;
  keywords: string[];
  faq: InsightsFaqItem[];
  sources: InsightsSource[];
}

export async function getArticleForAdminById(id: string): Promise<AdminArticleDetail | null> {
  const { data, error } = await supabaseAdmin()
    .from('insights_articles')
    .select(
      'id, slug, title, summary, body_md, status, author_name, published_at, updated_at, reading_time_min, hero_image_url, hero_image_credit, keywords, faq, sources, category:insights_categories(name)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    summary: row.summary as string,
    body_md: row.body_md as string,
    status: row.status as InsightsStatus,
    author_name: row.author_name as string,
    category_name: oneName(row.category),
    published_at: (row.published_at as string | null) ?? null,
    updated_at: row.updated_at as string,
    reading_time_min: row.reading_time_min as number,
    hero_image_url: (row.hero_image_url as string | null) ?? null,
    hero_image_credit: (row.hero_image_credit as string | null) ?? null,
    keywords: (row.keywords as string[] | null) ?? [],
    faq: (row.faq as InsightsFaqItem[] | null) ?? [],
    sources: (row.sources as InsightsSource[] | null) ?? [],
  };
}

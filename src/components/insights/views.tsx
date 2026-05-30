import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import {
  getArticleBySlug,
  getCategoryBySlug,
  getRelatedArticles,
  listArticles,
  searchArticles,
  type Article,
  type ArticleListItem,
  type InsightsCategory,
} from '@/lib/insights';
import { parseMarkdown, tocFromBlocks } from '@/lib/markdown';
import { Markdown } from './Markdown';
import { Toc } from './Toc';
import { Breadcrumb } from './Breadcrumb';
import { ShareLinks } from './ShareLinks';
import { ThumbArt } from './ThumbArt';
import { TrendingPanel, PerformersPanel } from './market';
import { JsonLd } from './JsonLd';

// Rendered at two base paths: /insights (public finance-portal chrome) and
// /app/insights (same content inside the app shell). Navigation uses
// `basePath`; canonical / JSON-LD / share always use the public /insights path.

const TITLE = 'News & Insights';
const DESCRIPTION =
  'Clear guides to the stock market, portfolios, ETFs, dividends, and personal finance — original, educational, and jargon-free.';

const homeHrefFor = (basePath: string) => (basePath === '/insights' ? '/' : '/app');

function fmtDate(s: string | null): string {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ThumbOrArt({ article }: { article: ArticleListItem }) {
  if (article.hero_image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={article.hero_image_url} alt={article.hero_image_alt ?? ''} loading="lazy" />;
  }
  return <ThumbArt slug={article.category?.slug} />;
}

function ArticleRow({ article, basePath }: { article: ArticleListItem; basePath: string }) {
  return (
    <div className="ins-art-row">
      <Link className="thumb" href={`${basePath}/${article.slug}`}>
        <ThumbOrArt article={article} />
      </Link>
      <div>
        <h3><Link href={`${basePath}/${article.slug}`}>{article.title}</Link></h3>
        <p className="dek">{article.summary}</p>
        <div className="ins-hl-meta">
          <span className="src">{article.category?.name ?? 'Cadence Insights'}</span>
          <span className="sep" />
          <span>{fmtDate(article.published_at)}</span>
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="ins-col-side">
      <TrendingPanel />
      <PerformersPanel />
    </aside>
  );
}

// ─── Hub ────────────────────────────────────────────────────────────────────
export async function InsightsHubView({ basePath, query }: { basePath: string; query: string }) {
  const articles = query ? await searchArticles(query, { limit: 24 }) : await listArticles({ limit: 24 });

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: TITLE, item: `${SITE_URL}/insights` },
    ],
  };
  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: `${SITE_URL}/insights`,
  };

  if (query) {
    return (
      <>
        <JsonLd data={breadcrumb} />
        <div className="ins-wrap ins-page">
          <div className="ins-col-main">
            <div className="ins-sec-head">
              <h2>{articles.length} result{articles.length === 1 ? '' : 's'} for “{query}”</h2>
              <span className="rule" />
            </div>
            {articles.length === 0 ? (
              <div className="ins-empty">
                No articles match “{query}”. <Link href={basePath}>Clear search</Link>.
              </div>
            ) : (
              articles.map((a) => <ArticleRow key={a.slug} article={a} basePath={basePath} />)
            )}
          </div>
          <Sidebar />
        </div>
      </>
    );
  }

  const [hero, ...rest] = articles;
  const headlines = rest.slice(0, 4);
  const more = rest;

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={collection} />
      <div className="ins-wrap ins-page">
        <div className="ins-col-main">
          {hero ? (
            <section className="ins-lead">
              <article className="ins-hero">
                <Link className="ins-hero-img" href={`${basePath}/${hero.slug}`}>
                  <ThumbOrArt article={hero} />
                </Link>
                <h1><Link href={`${basePath}/${hero.slug}`}>{hero.title}</Link></h1>
                <p className="dek">{hero.summary}</p>
                <div className="ins-byline">
                  <span className="src">{hero.author_name}</span>
                  {hero.category && <><span className="sep" /><span>{hero.category.name}</span></>}
                  <span className="sep" />
                  <span>{fmtDate(hero.published_at)}</span>
                  <span className="sep" />
                  <span>{hero.reading_time_min} min read</span>
                </div>
              </article>

              <div className="ins-hl">
                {headlines.map((a) => (
                  <div key={a.slug} className="ins-hl-item">
                    <h3><Link href={`${basePath}/${a.slug}`}>{a.title}</Link></h3>
                    <div className="ins-hl-meta">
                      <span className="src">{a.category?.name ?? 'Cadence Insights'}</span>
                      <span className="sep" />
                      <span>{fmtDate(a.published_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="ins-empty">No articles published yet — check back soon.</div>
          )}

          {more.length > 0 && (
            <section className="ins-more">
              <div className="ins-sec-head"><h2>More articles</h2><span className="rule" /></div>
              {more.map((a) => <ArticleRow key={a.slug} article={a} basePath={basePath} />)}
            </section>
          )}
        </div>

        <Sidebar />
      </div>
    </>
  );
}

// ─── Slug resolver → category or article ─────────────────────────────────────
type Resolved =
  | { kind: 'category'; category: InsightsCategory }
  | { kind: 'article'; article: Article }
  | { kind: 'none' };

export const resolveSlug = cache(async (slug: string): Promise<Resolved> => {
  const category = await getCategoryBySlug(slug);
  if (category) return { kind: 'category', category };
  const article = await getArticleBySlug(slug);
  if (article) return { kind: 'article', article };
  return { kind: 'none' };
});

export async function InsightsSlugView({ basePath, slug }: { basePath: string; slug: string }) {
  const r = await resolveSlug(slug);
  if (r.kind === 'category') return <CategoryView category={r.category} basePath={basePath} />;
  if (r.kind === 'article') return <ArticleView article={r.article} basePath={basePath} />;
  notFound();
}

async function CategoryView({ category, basePath }: { category: InsightsCategory; basePath: string }) {
  const articles = await listArticles({ categorySlug: category.slug, limit: 48 });
  const home = homeHrefFor(basePath);
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Insights', item: `${SITE_URL}/insights` },
      { '@type': 'ListItem', position: 3, name: category.name, item: `${SITE_URL}/insights/${category.slug}` },
    ],
  };

  return (
    <div className="ins-wrap ins-page">
      <JsonLd data={breadcrumb} />
      <div className="ins-col-main">
        <div style={{ paddingTop: 20 }}>
          <Breadcrumb items={[{ label: 'Home', href: home }, { label: 'Insights', href: basePath }, { label: category.name }]} />
        </div>
        <div className="ins-sec-head" style={{ marginTop: 16 }}>
          <h1>{category.name}</h1>
          <span className="rule" />
        </div>
        <p className="dek" style={{ fontSize: 14, color: 'var(--ink-2)', margin: '-8px 0 8px' }}>{category.description}</p>
        {articles.length === 0 ? (
          <div className="ins-empty">
            No articles in this category yet — <Link href={basePath}>browse all articles</Link>.
          </div>
        ) : (
          articles.map((a) => <ArticleRow key={a.slug} article={a} basePath={basePath} />)
        )}
      </div>
      <Sidebar />
    </div>
  );
}

async function ArticleView({ article, basePath }: { article: Article; basePath: string }) {
  const blocks = parseMarkdown(article.body_md);
  const toc = tocFromBlocks(blocks);
  const home = homeHrefFor(basePath);
  const publicUrl = `${SITE_URL}/insights/${article.slug}`;
  const date = article.published_at ? format(new Date(article.published_at), 'MMMM d, yyyy') : '';
  const related = await getRelatedArticles(article.category?.slug ?? null, article.slug, 3);

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.meta_description ?? article.summary,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { '@type': 'Organization', name: article.author_name },
    publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.png` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': publicUrl },
    ...(article.hero_image_url ? { image: [article.hero_image_url] } : {}),
    ...(article.category ? { articleSection: article.category.name } : {}),
    ...(article.keywords.length ? { keywords: article.keywords.join(', ') } : {}),
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Insights', item: `${SITE_URL}/insights` },
      ...(article.category
        ? [{ '@type': 'ListItem', position: 3, name: article.category.name, item: `${SITE_URL}/insights/${article.category.slug}` }]
        : []),
      { '@type': 'ListItem', position: article.category ? 4 : 3, name: article.title, item: publicUrl },
    ],
  };
  const faqLd =
    article.faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: article.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }
      : null;

  return (
    <article className="mx-auto max-w-[820px] px-6 py-10 md:px-8">
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      {faqLd && <JsonLd data={faqLd} />}

      <Breadcrumb
        items={[
          { label: 'Home', href: home },
          { label: 'Insights', href: basePath },
          ...(article.category ? [{ label: article.category.name, href: `${basePath}/${article.category.slug}` }] : []),
          { label: article.title },
        ]}
      />

      <header className="mt-6">
        {article.category && (
          <Link href={`${basePath}/${article.category.slug}`} className="text-[12px] font-semibold uppercase tracking-[0.08em] text-accent hover:underline underline-offset-2">
            {article.category.name}
          </Link>
        )}
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] md:text-[40px]">{article.title}</h1>
        <p className="mt-4 text-[18px] leading-[1.55] text-ink-soft">{article.summary}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-ink-dim">
          <span>{article.author_name}</span>
          <span aria-hidden>·</span>
          {date && <time dateTime={article.published_at}>{date}</time>}
          {date && <span aria-hidden>·</span>}
          <span>{article.reading_time_min} min read</span>
        </div>
      </header>

      <div
        className="mt-8 aspect-[2/1] w-full overflow-hidden rounded-2xl"
        style={article.hero_image_url ? undefined : { background: 'linear-gradient(135deg, oklch(0.74 0.09 175), oklch(0.55 0.08 210))' }}
      >
        {article.hero_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.hero_image_url} alt={article.hero_image_alt ?? ''} className="h-full w-full object-cover" />
        )}
      </div>
      {article.hero_image_credit && <div className="mt-2 text-[11px] text-ink-dim">{article.hero_image_credit}</div>}

      <div className="mt-10">
        <Markdown blocks={blocks} />

        {article.sources.length > 0 && (
          <section className="mt-12 border-t border-line pt-6">
            <h2 className="text-[15px] font-semibold text-ink">Sources</h2>
            <ul className="mt-3 space-y-1.5 text-[14px] text-ink-soft">
              {article.sources.map((s, i) => (
                <li key={i}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="nofollow noopener noreferrer" className="text-accent underline underline-offset-2">{s.label}</a>
                  ) : (
                    s.label
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {article.faq.length > 0 && (
          <section className="mt-12 border-t border-line pt-6">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Frequently asked questions</h2>
            <div className="mt-5 space-y-5">
              {article.faq.map((f, i) => (
                <div key={i}>
                  <h3 className="text-[16px] font-semibold text-ink">{f.q}</h3>
                  <p className="mt-1.5 text-[15px] leading-[1.6] text-ink-soft">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8">
          <Toc items={toc} />
        </div>

        <div className="mt-8 border-t border-line pt-6">
          <ShareLinks url={publicUrl} title={article.title} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="ins-more mt-16">
          <div className="ins-sec-head"><h2>Related reading</h2><span className="rule" /></div>
          {related.map((a) => <ArticleRow key={a.slug} article={a} basePath={basePath} />)}
        </section>
      )}
    </article>
  );
}

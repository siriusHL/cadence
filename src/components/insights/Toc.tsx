import type { TocItem } from '@/lib/markdown';

// Auto table of contents from the article's h2/h3 headings. Plain anchor links
// to the in-page heading ids (no client JS).
export function Toc({ items }: { items: TocItem[] }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="Table of contents" className="rounded-xl border border-line bg-surface-2/40 p-5">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-dim">On this page</div>
      <ul className="space-y-2 text-[13.5px]">
        {items.map((it) => (
          <li key={it.id} className={it.depth === 3 ? 'pl-3' : ''}>
            <a href={`#${it.id}`} className="text-ink-soft hover:text-ink hover:underline underline-offset-2">
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

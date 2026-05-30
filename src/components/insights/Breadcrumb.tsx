import Link from 'next/link';

export interface Crumb {
  label: string;
  href?: string;
}

// Visible breadcrumb trail. The matching BreadcrumbList JSON-LD is emitted
// separately by the page (it needs absolute URLs).
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-ink-dim">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {c.href ? (
              <Link href={c.href} className="hover:text-ink hover:underline underline-offset-2">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-soft">{c.label}</span>
            )}
            {i < items.length - 1 && <span className="text-ink-dim/60">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

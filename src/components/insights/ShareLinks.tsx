// Social share as plain anchors (no client JS): X/Twitter, LinkedIn, email.
// The page passes an absolute URL so the share targets resolve correctly.
export function ShareLinks({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: 'Share on X', short: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { label: 'Share on LinkedIn', short: 'in', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: 'Share by email', short: '@', href: `mailto:?subject=${t}&body=${u}` },
  ];
  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-ink-dim">Share</span>
      {links.map((l) => (
        <a
          key={l.short}
          href={l.href}
          aria-label={l.label}
          title={l.label}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-[12px] font-semibold text-ink-soft transition-colors hover:bg-black/[0.03] hover:text-ink"
        >
          {l.short}
        </a>
      ))}
    </div>
  );
}

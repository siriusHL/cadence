import { Fragment, type ReactNode } from 'react';
import { type Block } from '@/lib/markdown';

// Renders the supported inline subset: **bold**, `code`, and [text](url).
// Internal links (starting with /) render as plain anchors; external links get
// rel="nofollow noopener" + target=_blank.
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${k++}`;
    if (m[1] !== undefined) {
      const href = m[2];
      const internal = href.startsWith('/') || href.startsWith('#');
      nodes.push(
        <a
          key={key}
          href={href}
          className="text-accent underline underline-offset-2 hover:opacity-80"
          {...(internal ? {} : { target: '_blank', rel: 'nofollow noopener noreferrer' })}
        >
          {m[1]}
        </a>,
      );
    } else if (m[3] !== undefined) {
      nodes.push(<strong key={key} className="font-semibold text-ink">{m[3]}</strong>);
    } else if (m[4] !== undefined) {
      nodes.push(
        <code key={key} className="rounded bg-black/[0.05] px-1.5 py-0.5 text-[0.875em]" style={{ fontFamily: 'var(--font-jetbrains, monospace)' }}>
          {m[4]}
        </code>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderBlock(block: Block, i: number): ReactNode {
  const key = `b${i}`;
  switch (block.type) {
    case 'heading': {
      const Tag = block.depth === 2 ? 'h2' : 'h3';
      const cls =
        block.depth === 2
          ? 'scroll-mt-24 mt-12 mb-4 text-[26px] font-semibold tracking-[-0.02em] text-ink'
          : 'scroll-mt-24 mt-8 mb-3 text-[20px] font-semibold tracking-[-0.015em] text-ink';
      return (
        <Tag key={key} id={block.id} className={cls}>
          {renderInline(block.text, key)}
        </Tag>
      );
    }
    case 'paragraph':
      return (
        <p key={key} className="my-4 text-[17px] leading-[1.7] text-ink-soft">
          {renderInline(block.text, key)}
        </p>
      );
    case 'blockquote':
      return (
        <blockquote key={key} className="my-6 border-l-2 border-line-strong pl-5 text-[17px] italic leading-[1.6] text-ink-soft">
          {renderInline(block.text, key)}
        </blockquote>
      );
    case 'ul':
      return (
        <ul key={key} className="my-4 list-disc space-y-2 pl-6 text-[17px] leading-[1.6] text-ink-soft">
          {block.items.map((it, j) => (
            <li key={`${key}-${j}`}>{renderInline(it, `${key}-${j}`)}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol key={key} className="my-4 list-decimal space-y-2 pl-6 text-[17px] leading-[1.6] text-ink-soft">
          {block.items.map((it, j) => (
            <li key={`${key}-${j}`}>{renderInline(it, `${key}-${j}`)}</li>
          ))}
        </ol>
      );
  }
}

// Accepts pre-parsed blocks so the page can derive the TOC from the same parse
// (heading ids stay in sync) without parsing the body twice.
export function Markdown({ blocks }: { blocks: Block[] }) {
  return <Fragment>{blocks.map(renderBlock)}</Fragment>;
}

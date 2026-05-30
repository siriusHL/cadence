// Minimal, dependency-free Markdown parser for the Insights article body.
//
// Content is authored in-house and human-reviewed before publishing, so the
// supported vocabulary is intentionally small and fixed: h2/h3 headings,
// paragraphs, blockquotes, ordered/unordered lists, and inline bold / inline
// code / links. Parsing on the server (RSC) keeps client JS at zero, which
// matters for the Core Web Vitals the SEO brief calls for.
//
// One parse produces both the block list (rendered by <Markdown/>) and the
// table of contents, so heading ids in the TOC always match the rendered ids.

export type Block =
  | { type: 'heading'; depth: 2 | 3; id: string; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] };

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

// GitHub-style slug: lower-case, drop punctuation, spaces → hyphens.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Strip the inline markers we support, for plain-text contexts (TOC labels,
// meta descriptions). Leaves link text, drops the URL.
export function stripInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

const HEADING = /^(#{2,3})\s+(.*)$/;
const UL_ITEM = /^[-*]\s+(.*)$/;
const OL_ITEM = /^\d+\.\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;

export function parseMarkdown(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  const seen = new Map<string, number>();
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'paragraph', text: para.join(' ').trim() });
      para = [];
    }
  };

  const headingId = (text: string): string => {
    const base = slugify(stripInline(text)) || 'section';
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      flushPara();
      continue;
    }

    const h = HEADING.exec(trimmed);
    if (h) {
      flushPara();
      const text = h[2].trim();
      blocks.push({ type: 'heading', depth: h[1].length as 2 | 3, id: headingId(text), text });
      continue;
    }

    if (UL_ITEM.test(trimmed)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && UL_ITEM.test(lines[i].trim())) {
        items.push(UL_ITEM.exec(lines[i].trim())![1]);
        i++;
      }
      i--;
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (OL_ITEM.test(trimmed)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && OL_ITEM.test(lines[i].trim())) {
        items.push(OL_ITEM.exec(lines[i].trim())![1]);
        i++;
      }
      i--;
      blocks.push({ type: 'ol', items });
      continue;
    }

    if (QUOTE.test(trimmed)) {
      flushPara();
      const parts: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i].trim())) {
        parts.push(QUOTE.exec(lines[i].trim())![1]);
        i++;
      }
      i--;
      blocks.push({ type: 'blockquote', text: parts.join(' ').trim() });
      continue;
    }

    para.push(trimmed);
  }
  flushPara();
  return blocks;
}

export function tocFromBlocks(blocks: Block[]): TocItem[] {
  return blocks
    .filter((b): b is Extract<Block, { type: 'heading' }> => b.type === 'heading')
    .map((b) => ({ id: b.id, text: stripInline(b.text), depth: b.depth }));
}

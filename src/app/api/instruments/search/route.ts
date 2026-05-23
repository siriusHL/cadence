import { withAuth, json } from '@/lib/auth';
import { searchSymbols } from '@/lib/marketdata/search';

export const GET = withAuth({}, async ({ req }) => {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 1) return json({ data: [] });

  try {
    const hits = await searchSymbols(q, 8);
    return json({ data: hits }, 200, {
      // Short edge cache; the in-process memo handles burst de-dup.
      'cache-control': 'private, max-age=60',
    });
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
});

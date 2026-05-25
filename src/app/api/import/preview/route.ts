import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { parseCsv, type BrokerId } from '@/lib/import';

const Body = z.object({
  csv: z.string().min(1).max(2_000_000),       // ~2 MB raw text cap
  broker: z.enum(['degiro', 'ibkr', 'trade-republic']).optional(),
});

export const POST = withAuth({ feature: 'csvImport' }, async ({ req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body' }, 400);

  try {
    const result = parseCsv(parsed.data.csv, parsed.data.broker as BrokerId | undefined);
    return json({ data: result });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'parse_failed' }, 422);
  }
});

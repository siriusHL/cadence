import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { parseCsv, parseCsvGeneric, readCsv, type BrokerId, type GenericMapping } from '@/lib/import';

const BrokerEnum = z.enum([
  'degiro', 'ibkr', 'trade-republic',
  'trading-212', 'scalable', 'etoro', 'xtb', 'saxo',
  'other',
]);

const KindMappingSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('fixed'),  value: z.enum(['buy', 'sell', 'dividend']) }),
  z.object({ type: z.literal('column'), header: z.string().min(1) }),
]);

const GenericMappingSchema = z.object({
  date:     z.string().min(1),
  ticker:   z.string().optional(),
  isin:     z.string().optional(),
  kind:     KindMappingSchema,
  quantity: z.string().min(1),
  price:    z.string().min(1),
  currency: z.string().optional(),
  fee:      z.string().optional(),
});

const Body = z.object({
  csv: z.string().min(1).max(2_000_000),       // ~2 MB raw text cap
  broker: BrokerEnum.optional(),
  mapping: GenericMappingSchema.optional(),    // required when broker === 'other'
  /** When set, only return the header list (used for the generic-mapping UI). */
  headersOnly: z.boolean().optional(),
});

export const POST = withAuth({ feature: 'csvImport' }, async ({ req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body' }, 400);

  try {
    if (parsed.data.headersOnly) {
      const { headers } = readCsv(parsed.data.csv);
      return json({ data: { headers } });
    }
    if (parsed.data.broker === 'other') {
      if (!parsed.data.mapping) return json({ error: 'mapping_required' }, 400);
      const result = parseCsvGeneric(parsed.data.csv, parsed.data.mapping as GenericMapping);
      return json({ data: result });
    }
    const result = parseCsv(parsed.data.csv, parsed.data.broker as BrokerId | undefined);
    return json({ data: result });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'parse_failed' }, 422);
  }
});

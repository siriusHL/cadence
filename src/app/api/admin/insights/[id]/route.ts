import { z } from 'zod';
import { json } from '@/lib/auth';
import { withAdmin, logAdminAction } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Moderation: an admin reviews a draft and changes its publication status.
// Publishing is the human-validation gate — nothing is publicly visible until
// an admin flips it to 'published' here (RLS only exposes published rows).
const Body = z.object({
  status: z.enum(['draft', 'scheduled', 'published']),
});

export const PATCH = withAdmin<{ id: string }>(async ({ email, params, req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body', detail: parsed.error.format() }, 400);
  const { status } = parsed.data;

  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from('insights_articles')
    .select('id, status, published_at, slug')
    .eq('id', params.id)
    .maybeSingle();
  if (!existing) return json({ error: 'not_found' }, 404);

  const patch: Record<string, unknown> = { status };
  // First publish stamps published_at; later toggles keep the original date so
  // unpublish → re-publish doesn't reset the article's age.
  if (status === 'published' && !existing.published_at) {
    patch.published_at = new Date().toISOString();
  }

  const { error } = await admin.from('insights_articles').update(patch).eq('id', params.id);
  if (error) return json({ error: error.message }, 500);

  await logAdminAction(email, status === 'published' ? 'publish_article' : 'unpublish_article', {
    targetType: 'insights_article',
    targetId: params.id,
    meta: { from: existing.status, to: status, slug: existing.slug },
  });

  return json({ ok: true, status });
});

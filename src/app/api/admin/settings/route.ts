import { z } from 'zod';
import { json } from '@/lib/auth';
import { withAdmin, logAdminAction } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ANNOUNCEMENT_THEME_KEYS } from '@/lib/announcementThemes';

const Body = z.object({
  maintenance_mode: z.boolean().optional(),
  announcement: z.string().max(500).nullable().optional(),
  announcement_active: z.boolean().optional(),
  announcement_theme: z.enum(ANNOUNCEMENT_THEME_KEYS as [string, ...string[]]).optional(),
});

// Update the single site_settings row (maintenance mode + announcement banner).
export const PATCH = withAdmin(async ({ email, req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body', detail: parsed.error.format() }, 400);
  const body = parsed.data;

  const patch = { ...body, updated_at: new Date().toISOString(), updated_by: email };

  const { data, error } = await supabaseAdmin()
    .from('site_settings')
    .update(patch)
    .eq('id', 1)
    .select('maintenance_mode, announcement, announcement_active, updated_at')
    .single();
  if (error) return json({ error: error.message }, 500);

  await logAdminAction(email, 'update_site_settings', {
    targetType: 'site_settings', targetId: '1', meta: body,
  });

  return json({ ok: true, settings: data });
});

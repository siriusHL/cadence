import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

// Selectors must match the shapes the alerts engine generates. We validate
// the prefix server-side so callers can't smuggle arbitrary text into the
// table (it's filtered by RLS already, but a typo'd selector would silently
// hide nothing forever).
const SELECTOR_PREFIX_RE = /^(id|kind|kind_ticker):/;

const PostBody = z.object({
  selector:   z.string().min(3).max(200).regex(SELECTOR_PREFIX_RE, 'invalid_selector'),
  /** Snooze window in days. Omit / null = permanent dismiss/mute. */
  snoozeDays: z.number().int().positive().max(365).optional(),
});

/**
 * POST /api/alerts/suppressions
 * Upsert a suppression for the current user. Body:
 *   { selector: "id:conc:AAPL" }                    — permanent dismiss
 *   { selector: "id:conc:AAPL", snoozeDays: 7 }     — snooze 7 days
 *   { selector: "kind:drawdown" }                   — mute the whole kind
 *   { selector: "kind_ticker:concentration_position:AAPL" } — mute kind+ticker
 *
 * Re-posting with a different snoozeDays replaces the existing window.
 */
export const POST = withAuth({}, async ({ userId, req }) => {
  const parsed = PostBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const { selector, snoozeDays } = parsed.data;
  const expiresAt = snoozeDays
    ? new Date(Date.now() + snoozeDays * 86_400_000).toISOString()
    : null;

  const supabase = await getSupabaseServer();
  const res = await supabase
    .from('alert_suppressions')
    .upsert(
      { user_id: userId, selector, expires_at: expiresAt },
      { onConflict: 'user_id,selector' },
    );
  if (res.error) return json({ error: res.error.message }, 500);

  revalidatePath('/app/alerts');
  return json({ selector, expires_at: expiresAt }, 201);
});

const DeleteBody = z.object({
  selector: z.string().min(3).max(200).regex(SELECTOR_PREFIX_RE, 'invalid_selector'),
});

/**
 * DELETE /api/alerts/suppressions
 * Removes a single suppression. Body: { selector: "id:conc:AAPL" }
 * No-op if it doesn't exist.
 */
export const DELETE = withAuth({}, async ({ userId, req }) => {
  const parsed = DeleteBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const supabase = await getSupabaseServer();
  const res = await supabase
    .from('alert_suppressions')
    .delete()
    .eq('user_id', userId)
    .eq('selector', parsed.data.selector);
  if (res.error) return json({ error: res.error.message }, 500);

  revalidatePath('/app/alerts');
  return json({ selector: parsed.data.selector });
});

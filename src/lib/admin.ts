import { type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { json } from '@/lib/auth';

export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  );
}
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && adminEmails().has(email.toLowerCase());
}

export interface AdminCtx<P = Record<string, string>> {
  userId: string; email: string; params: P; req: NextRequest;
}
type Handler<P> = (ctx: AdminCtx<P>) => Promise<Response> | Response;
interface RouteContext<P> { params: Promise<P>; }

// 401 if unauthenticated, 403 if not an allowlisted admin, else run handler.
export function withAdmin<P = Record<string, string>>(handler: Handler<P>) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<Response> => {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthenticated' }, 401);
    if (!isAdminEmail(user.email)) return json({ error: 'forbidden' }, 403);
    const params = await ctx.params;
    return handler({ userId: user.id, email: user.email!, params, req });
  };
}

// Best-effort append-only audit; never throws into the calling action.
export async function logAdminAction(
  actorEmail: string,
  action: string,
  opts: { targetType?: string; targetId?: string; meta?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    await supabaseAdmin().from('admin_audit_log').insert({
      actor_email: actorEmail, action,
      target_type: opts.targetType ?? null,
      target_id: opts.targetId ?? null,
      meta: opts.meta ?? null,
    });
  } catch (err) { console.error('admin audit log write failed', { action, err }); }
}

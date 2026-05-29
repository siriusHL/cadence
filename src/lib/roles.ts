import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getSupabaseServer } from '@/lib/supabase/server';
import { json } from '@/lib/auth';

// Staff access is a role on the user's profile (see migration 0014):
//   'support' handles customer messages; 'admin' is its superset.
// The role column is service-role-write-only, so a customer can't self-promote.

export type Role = 'user' | 'support' | 'admin';

const SUPPORT_ROLES: ReadonlySet<Role> = new Set<Role>(['support', 'admin']);

export async function getUserRole(): Promise<{ user: User | null; role: Role }> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, role: 'user' };

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  return { user, role: (data?.role ?? 'user') as Role };
}

export function isSupportRole(role: Role): boolean {
  return SUPPORT_ROLES.has(role);
}

/** For server pages/layouts: redirect non-support away, return the staff user. */
export async function requireSupportPage(): Promise<User> {
  const { user, role } = await getUserRole();
  if (!user) redirect('/login');
  if (!isSupportRole(role)) redirect('/app');
  return user;
}

/** For API routes: return the staff user, or a Response to short-circuit with. */
export async function requireSupportApi(): Promise<{ user: User } | { error: Response }> {
  const { user, role } = await getUserRole();
  if (!user) return { error: json({ error: 'unauthenticated' }, 401) };
  if (!isSupportRole(role)) return { error: json({ error: 'forbidden' }, 403) };
  return { user };
}

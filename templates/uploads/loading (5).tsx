import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { canAccessScreen, type Tier, type Screen } from '@/lib/tiers';

export const dynamic = 'force-dynamic';

export default async function AppRoot() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase.from('profiles').select('default_screen').eq('id', user.id).maybeSingle(),
    supabase.from('subscriptions').select('tier').eq('user_id', user.id).maybeSingle(),
  ]);

  const tier = (sub?.tier ?? 'free') as Tier;
  const pref = (profile?.default_screen ?? null) as Screen | null;

  // Honor the user's preference only if their current tier still grants access
  // to that screen (e.g. they were Premium when they picked it, now they're Free).
  if (pref && canAccessScreen(tier, pref)) redirect(`/app/${pref}`);

  // No usable preference — send to the natural landing for the tier. Free users
  // see the beginner Home; Premium/Elite go to the pro Dashboard since the four
  // free-tier screens (home/next/stocks/year) are hidden from their nav.
  redirect(tier === 'free' ? '/app/home' : '/app/dashboard');
}

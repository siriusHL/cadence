import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { canAccessScreen, type Tier, type Screen } from '@/lib/tiers';
import { isSupportRole, type Role } from '@/lib/roles';
import { reconcileSubscriptionFromStripe } from '@/lib/billing/reconcile';

export const dynamic = 'force-dynamic';

export default async function AppRoot(
  { searchParams }: { searchParams: Promise<{ billing?: string }> },
) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Returning from Stripe-hosted billing (checkout/portal): pull the live
  // subscription and sync the tier before we read it below, so a plan change is
  // reflected immediately without waiting on the webhook. Never blocks the page.
  const { billing } = await searchParams;
  if (billing) {
    try {
      await reconcileSubscriptionFromStripe(user.id);
    } catch (err) {
      console.error('billing reconcile failed', err);
    }
  }

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase.from('profiles').select('default_screen, role').eq('id', user.id).maybeSingle(),
    supabase.from('subscriptions').select('tier').eq('user_id', user.id).maybeSingle(),
  ]);

  // Support/admin staff land on the support board, not the customer dashboard.
  if (isSupportRole((profile?.role ?? 'user') as Role)) redirect('/support/messages');

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
